#!/usr/bin/env node

/**
 * Quick test utility to generate PDFs with different settings to find optimal layout
 */

import { generateLabResultsPdf } from './src/plugins/lab-pdf';
import path from 'path';

async function testDifferentSettings() {
    const inputFile = './data/Weirich_Gerry_09.03.1961_(2)/Labor/labor_cd8987aec2f3e4b43788.html';
    const outputDir = './data/Weirich_Gerry_09.03.1961_(2)/Labor/';
    
    const testConfigs = [
        { name: 'auto-fit', format: 'A3', orientation: 'landscape' }, // Uses auto-calculated scale
        { name: 'tight-fit', format: 'A3', orientation: 'landscape', scale: 0.6 },
        { name: 'minimal-margins', format: 'A3', orientation: 'landscape', scale: 0.7, margins: { top: '5mm', right: '3mm', bottom: '5mm', left: '3mm' } },
        { name: 'ultra-wide', format: 'A3', orientation: 'landscape', scale: 0.5 },
    ];
    
    console.log('Testing different PDF settings...\n');
    
    for (const config of testConfigs) {
        const { name, ...options } = config;
        const outputFile = path.join(outputDir, `test_${name}.pdf`);
        
        console.log(`Generating ${name}: ${JSON.stringify(options)}`);
        try {
            await generateLabResultsPdf(inputFile, outputFile, options as any);
            console.log(`✅ Success: ${outputFile}`);
        } catch (error) {
            console.log(`❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    console.log('\nDone! Check the generated PDFs to see which layout works best.');
    console.log('Then use those settings in your regular PDF generation.');
}

testDifferentSettings().catch(console.error);