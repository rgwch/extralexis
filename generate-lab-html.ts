#!/usr/bin/env node

/**
 * Standalone utility to generate HTML tables from lab results JSON files
 * Usage: npx ts-node generate-lab-html.ts <json-file-path> [output-html-path]
 * or: npx ts-node generate-lab-html.ts --dir <directory-path>
 */

import { generateLabResultsHTML, generateLabResultsHTMLFromOutput } from './src/plugins/lab-html';
import path from 'path';
import fs from 'fs';

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Usage:
  Generate HTML from single JSON file:
    npx ts-node generate-lab-html.ts <json-file-path> [output-html-path]
    
  Generate HTML for all JSON files in a directory:
    npx ts-node generate-lab-html.ts --dir <directory-path>
    
  Examples:
    npx ts-node generate-lab-html.ts ./data/patient/Labor/labor_123.json
    npx ts-node generate-lab-html.ts ./data/patient/Labor/labor_123.json ./output.html
    npx ts-node generate-lab-html.ts --dir ./data/patient/
        `);
        process.exit(1);
    }

    try {
        if (args[0] === '--dir') {
            // Process entire directory
            if (args.length < 2) {
                console.error('Error: Please provide a directory path');
                process.exit(1);
            }
            
            const dirPath = args[1];
            if (!fs.existsSync(dirPath)) {
                console.error(`Error: Directory not found: ${dirPath}`);
                process.exit(1);
            }
            
            console.log(`Processing directory: ${dirPath}`);
            await generateLabResultsHTMLFromOutput(dirPath);
            console.log('All HTML files generated successfully!');
            
        } else {
            // Process single file
            const jsonFilePath = args[0];
            let htmlFilePath = args[1];
            
            if (!fs.existsSync(jsonFilePath)) {
                console.error(`Error: JSON file not found: ${jsonFilePath}`);
                process.exit(1);
            }
            
            if (!htmlFilePath) {
                // Generate output filename based on input
                const dir = path.dirname(jsonFilePath);
                const basename = path.basename(jsonFilePath, '.json');
                htmlFilePath = path.join(dir, `${basename}.html`);
            }
            
            console.log(`Converting: ${jsonFilePath} -> ${htmlFilePath}`);
            await generateLabResultsHTML(jsonFilePath, htmlFilePath);
            console.log('HTML file generated successfully!');
        }
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();