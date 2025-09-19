import "dotenv/config"
import knex from 'knex';
import { getPatients, extractData, extractDataByPatNumber, getTotalPatientCount } from './patient';
import { Command } from 'commander';

const program = new Command();
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


program
    .option('-p, --patid <patnr>', 'Process only this patient number')
    .option('-n, --number <number>', 'Number of patients to process', '10')
    .option('-s, --skip <skip>', 'Number of patients to skip', '0')
    .option('-a, --all', 'Process all patients')
    .option('-c, --check', 'Only check database connection')
    .action(async (options) => {
        if (options.patid) {
            extractDataByPatNumber(options.patid).then(async () => {
                await db.destroy();
            });
        } else if (options.all) {
            const count = await getTotalPatientCount();
            const patients = await getPatients(0, count);
            for (const pat of patients) {
                await extractData(pat.id);
            }
            await db.destroy();
        } else if (options.check) {
            try {
                await db.raw('SELECT 1');
                console.log('Database connection successful');
            } catch (error) {
                console.error('Database connection failed:', error);
            } finally {
                await db.destroy();
            }
        } else {
            const number = parseInt(options.number || '10', 10);
            const skip = parseInt(options.skip || '0', 10);
            const patients = await getPatients(skip, number);
            for (const pat of patients) {
                await extractData(pat.id);
            }
            await db.destroy();
        }
    });
program.parse(process.argv);


/*
if (process.argv.length == 3) {
    const patid = process.argv[2];
    extractDataByPatNumber(patid).then(async () => {
        await db.destroy();
    });

} else {
    getPatients().then(async pats => {
        console.log("Got patients:", pats.length);
        for (const pat of pats) {
            await extractData(pat.id);
        }
        await db.destroy();
    })
}
*/