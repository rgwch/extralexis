#!/usr/bin/env node

/**
 * Standalone utility to generate PDF files from lab results
 * Usage: npx ts-node generate-lab-pdf.ts <input-file> [output-pdf-path] [options]
 */

import { generateLabResultsPdf, generateLabPdfFromJson, batchGenerateLabPdfs, PdfOptions } from './src/plugins/lab-pdf';
import path from 'path';
import fs from 'fs';

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Usage:
  Generate PDF from HTML file:
    npx ts-node generate-lab-pdf.ts <html-file-path> [output-pdf-path] [--format A3|A4] [--orientation landscape|portrait]
    
  Generate PDF from JSON file (creates HTML first):
    npx ts-node generate-lab-pdf.ts <json-file-path> [output-pdf-path] [--format A3|A4] [--orientation landscape|portrait]
    
  Batch convert all files in a directory:
    npx ts-node generate-lab-pdf.ts --dir <directory-path> [--format A3|A4] [--orientation landscape|portrait]
    
  Options:
    --format A3|A4        Page format (default: A3 for better table display)
    --orientation landscape|portrait  Page orientation (default: landscape)
    --scale 0.1-2.0       Scale factor (default: 0.8)
    
  Examples:
    npx ts-node generate-lab-pdf.ts ./labor_123.html
    npx ts-node generate-lab-pdf.ts ./labor_123.json ./output.pdf --format A4
    npx ts-node generate-lab-pdf.ts --dir ./data/patient/ --format A3 --orientation landscape
        `);
        process.exit(1);
    }

    try {
        // Parse arguments
        const options: PdfOptions = {
            format: 'A3',
            orientation: 'landscape',
            scale: 0.8
        };
        
        let inputPath = '';
        let outputPath = '';
        let isDirectory = false;
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (arg === '--dir') {
                isDirectory = true;
                inputPath = args[++i];
            } else if (arg === '--format') {
                options.format = args[++i] as 'A3' | 'A4';
            } else if (arg === '--orientation') {
                options.orientation = args[++i] as 'landscape' | 'portrait';
            } else if (arg === '--scale') {
                options.scale = parseFloat(args[++i]);
            } else if (!inputPath) {
                inputPath = arg;
            } else if (!outputPath) {
                outputPath = arg;
            }
        }
        
        if (!inputPath) {
            console.error('Error: Please provide an input file or directory path');
            process.exit(1);
        }
        
        if (!fs.existsSync(inputPath)) {
            console.error(`Error: File or directory not found: ${inputPath}`);
            process.exit(1);
        }

        if (isDirectory) {
            // Process entire directory
            console.log(`Processing directory: ${inputPath}`);
            console.log(`Options: ${JSON.stringify(options, null, 2)}`);
            await batchGenerateLabPdfs(inputPath, options);
            console.log('All PDF files generated successfully!');
            
        } else {
            // Process single file
            if (!outputPath) {
                // Generate output filename based on input
                const ext = path.extname(inputPath);
                const basename = path.basename(inputPath, ext);
                const dir = path.dirname(inputPath);
                outputPath = path.join(dir, `${basename}.pdf`);
            }
            
            console.log(`Converting: ${inputPath} -> ${outputPath}`);
            console.log(`Options: ${JSON.stringify(options, null, 2)}`);
            
            if (inputPath.endsWith('.json')) {
                await generateLabPdfFromJson(inputPath, outputPath, options);
            } else if (inputPath.endsWith('.html')) {
                await generateLabResultsPdf(inputPath, outputPath, options);
            } else {
                console.error('Error: Input file must be .json or .html');
                process.exit(1);
            }
            
            console.log('PDF file generated successfully!');
        }
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();