import { generateLabResultsHTML } from './src/htmlGenerator';
import path from 'path';

async function main() {
    const jsonFilePath = '/home/gerry/git/extralexis/data/Weirich_Gerry_09.03.1961_(2)/Labor/labor_cd8987aec2f3e4b43788.json';
    const outputPath = '/home/gerry/git/extralexis/data/Weirich_Gerry_09.03.1961_(2)/Labor/labor_results.html';

    try {
        await generateLabResultsHTML(jsonFilePath, outputPath);
        console.log('HTML file generated successfully!');
        console.log(`Output file: ${outputPath}`);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();