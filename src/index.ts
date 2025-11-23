import "dotenv/config"
import knex from 'knex';
import { getPatients, extractData, extractDataByPatNumber, getTotalPatientCount, extractDataByPatData } from './patient';
import { Command } from 'commander';
import { spawn, ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
const CONVERTER = "elexis_converter_5.0.2.jar";
if (!process.env.converter) {
    process.env.converter = "http://localhost:8080";
}

// Load configuration file if it exists
function loadConfigFile() {
    const configPath = path.join(process.cwd(), 'extralexis.cfg');
    console.log(`Looking for configuration file at: ${configPath}`);
    if (fs.existsSync(configPath)) {
        console.log(`Loading configuration from: ${configPath}`);
        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const lines = configContent.split('\n');

            for (const line of lines) {
                const trimmedLine = line.trim();
                // Skip empty lines and comments (lines starting with #)
                if (!trimmedLine || trimmedLine.startsWith('#')) {
                    continue;
                }

                const equalIndex = trimmedLine.indexOf('=');
                if (equalIndex > 0) {
                    const name = trimmedLine.substring(0, equalIndex).trim();
                    const value = trimmedLine.substring(equalIndex + 1).trim();

                    // Remove quotes if present
                    const cleanValue = value.replace(/^["']|["']$/g, '');

                    process.env[name] = cleanValue;
                    console.log(`Set ${name}=${cleanValue}`);
                }
            }
        } catch (error) {
            console.error(`Error reading configuration file ${configPath}:`, error);
        }
    } else {
        console.log('No configuration file found.');
    }
}

// Load configuration before initializing database
loadConfigFile();

/**
 * Check if Java version 17 or higher is available
 */
function checkJavaVersion(): Promise<boolean> {
    return new Promise((resolve) => {
        exec('java -version', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Java is not installed or not in PATH');
                resolve(false);
                return;
            }

            // Java version output goes to stderr
            const versionOutput = stderr || stdout;
            const versionMatch = versionOutput.match(/version "(\d+)/);

            if (!versionMatch) {
                console.error('❌ Could not determine Java version');
                resolve(false);
                return;
            }

            const majorVersion = parseInt(versionMatch[1]);
            if (majorVersion >= 17) {
                console.log(`✅ Java ${majorVersion} detected (required: 17+)`);
                resolve(true);
            } else {
                console.error(`❌ Java ${majorVersion} detected, but version 17 or higher is required`);
                resolve(false);
            }
        });
    });
}

/**
 * Check if the converter JAR file exists
 */
function checkConverterJar(): boolean {
    const jarPath = path.join(process.cwd(), CONVERTER);
    if (fs.existsSync(jarPath)) {
        console.log(`✅ Converter JAR found: ${jarPath}`);
        return true;
    } else {
        console.error(`❌ Converter JAR not found: ${jarPath}`);
        console.error('Please ensure the elexis_converter JAR file is in the current directory.');
        return false;
    }
}

/**
 * Perform all prerequisite checks
 */
async function checkPrerequisites(): Promise<boolean> {
    console.log('🔍 Checking prerequisites...');

    const javaOk = await checkJavaVersion();
    const jarOk = checkConverterJar();

    if (javaOk && jarOk) {
        console.log('✅ All prerequisites met');
        return true;
    } else {
        console.error('❌ Prerequisites not met. Please fix the issues above and try again.');
        return false;
    }
}

const program = new Command();
/**
 * Database connection. Only mysql/mariadb is supported for now.
 */
export const db = knex({
    client: 'mysql2',
    connection: {
        host: process.env.server,
        port: Number(process.env.port),
        user: process.env.user,
        password: process.env.password,
        database: process.env.database,
    },
});

let converterProcess: ChildProcess | null = null;

/**
 * Start the Java converter service
 */
async function startConverterService(): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log('Starting Java converter service...');

        // Look for the JAR file in the current directory
        const jarPath = path.join(process.cwd(), CONVERTER);

        converterProcess = spawn('java', ['-jar', jarPath], {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });

        converterProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            if (process.env.DEBUG) {
                console.log(`[Converter] ${output.trim()}`);
            }

            // Check if the service has started successfully
            if (output.includes('Started') || output.includes('Server started') || output.includes('listening')) {
                console.log('Converter service started successfully');
                resolve();
            }
        });

        converterProcess.stderr?.on('data', (data) => {
            console.error(`[Converter Error] ${data.toString().trim()}`);
        });

        converterProcess.on('error', (error) => {
            console.error('Failed to start converter service:', error);
            reject(error);
        });

        converterProcess.on('exit', (code, signal) => {
            if (code !== null && code !== 0) {
                console.error(`Converter service exited with code ${code}`);
            }
            converterProcess = null;
        });

        // Fallback timeout in case we don't get a clear "started" message

        setTimeout(() => {
            if (converterProcess && !converterProcess.killed) {
                console.log('Converter service startup timeout reached, proceeding...');
                resolve();
            }
        }, 10000);

    });
}

/**
 * Stop the Java converter service
 */
async function stopConverterService(): Promise<void> {
    if (converterProcess && !converterProcess.killed) {
        console.log('Stopping Java converter service...');

        return new Promise((resolve) => {
            converterProcess!.on('exit', () => {
                console.log('Converter service stopped');
                resolve();
            });

            // Try graceful shutdown first
            converterProcess!.kill('SIGTERM');

            // Force kill after 3 seconds if still running
            setTimeout(() => {
                if (converterProcess && !converterProcess.killed) {
                    console.log('Force killing converter service...');
                    converterProcess.kill('SIGKILL');
                    resolve();
                }
            }, 3000);
        });
    }
}

/**
 * Cleanup function to ensure proper shutdown
 */
async function cleanup(): Promise<void> {
    console.log('Cleaning up...');
    await stopConverterService();
    await db.destroy();
}

// Handle process termination signals
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await cleanup();
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await cleanup();
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await cleanup();
    process.exit(1);
});

program
    .option('-p, --patid <patnr>', 'Process only this patient number')
    .option('-n, --number <number>', 'Number of patients to process', '10')
    .option('-s, --skip <skip>', 'Number of patients to skip', '0')
    .option('-a, --all', 'Process all patients')
    .option('-c, --check', 'Only check database connection')
    .option('-d, --data <data>', 'Extract data for patient by data string (name, firstname, birthdate)')
    .option('--no-converter', 'Skip starting the converter service (use existing one)')
    .action(async (options) => {
        try {
            // Check prerequisites first
            const prerequisitesOk = await checkPrerequisites();
            if (!prerequisitesOk) {
                process.exit(1);
            }

            // Start converter service unless explicitly disabled
            if (!options.noConverter) {
                await startConverterService();
                // Give the service a moment to fully initialize
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            if (options.patid) {
                await extractDataByPatNumber(options.patid);
            } else if (options.all) {
                const count = await getTotalPatientCount();
                const patients = await getPatients(0, count);
                for (const pat of patients) {
                    await extractData(pat.id);
                }
            } else if (options.check) {
                try {
                    await db.raw('SELECT 1');
                    console.log('Database connection successful');
                } catch (error) {
                    console.error('Database connection failed:', error);
                }

                try {
                    const response = await fetch(`${process.env.converter}/extinfo/debug`, {
                        method: 'GET',
                    });
                    if (response.ok) {
                        console.log('Converter service connection successful');
                    } else {
                        console.error('Converter service connection failed:', response.statusText);
                    }
                } catch (error) {
                    console.error('Converter service connection failed:', error);
                }
            } else if (options.data) {
                await extractDataByPatData(options.data);
            } else {
                const number = parseInt(options.number || '10', 10);
                const skip = parseInt(options.skip || '0', 10);
                const patients = await getPatients(skip, number);
                for (const pat of patients) {
                    await extractData(pat.id);
                }
            }
        } catch (error) {
            console.error('Error during execution:', error);
        } finally {
            await cleanup();
        }
    });

program.parse(process.argv);

