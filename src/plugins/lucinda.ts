import { db } from '../index';
import path from "path"
import fs from "fs/promises"
import { existsSync } from 'fs';
import { elexisDateToDateString, normalize } from '../util';

/**
 * Lucina is a document management system for Elexis.
 * Documents are stored in a directory structure, typically under a main "documents" directory.
 * Each patient has a subdirectory named after their ID, and documents are stored within these subdirectories.
 * This function copies all documents from the patient's Lucinda directory to the output directory.
 * @param dir 
 * @param outputDir 
 * @returns 
 */
export async function extractLucinda(dir: string, outputDir: string) {
    const inputDir = path.join(process.env.documents, dir.substring(0, 1).toLowerCase(), dir)
    if (!inputDir || !existsSync(inputDir)) {
        console.warn("Lucinda documents directory not found or not specified in .env");
        return;
    }
    const output = path.join(outputDir, "Dokumente")
    try {
        const files = await fs.readdir(inputDir);
        if (files.length === 0) {
            console.log(`No Lucinda documents found for patient ${dir}`);
            return;
        }
        await fs.mkdir(output, { recursive: true });
        // console.log(`Found ${files.length} Lucinda documents for ${dir}`);
        for (const file of files) {
            try {
                console.log(`Copying Lucinda document: ${file}`);
                const srcPath = path.join(inputDir, file);
                const destPath = path.join(output, file);
                if (existsSync(destPath)) {
                    console.warn(`File already exists, skipping: ${destPath}`);
                    continue;
                }
                fs.copyFile(srcPath, destPath);
            } catch (err) {
                console.error(`Error copying Lucinda document ${file}:`, err);
            }
        }
    } catch (err) {
        console.error(`Error processing Lucinda documents for ${dir}:`, err);
    }
}
