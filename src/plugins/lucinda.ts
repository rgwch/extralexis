import path from "path"
import fs from "fs/promises"
import { existsSync } from 'fs';

/**
 * Lucina is a document management system for Elexis.
 * Documents are stored in a directory structure, typically under a main "documents" directory.
 * Each patient has a subdirectory named after their ID, and documents are stored within these subdirectories.
 * This function copies all documents from the patient's Lucinda directory into either "Eingehende_Dokumente" or "Ausgehende_Dokumente" 
 * subdirectories in the output directory. It tries to determine whether a document is incoming or outgoing based on its filename prefix.
 * @param dir the lucinda directory for the patient, relative to the main documents directory
 * @param outputDir 
 * @returns 
 */
export async function extractLucinda(dir: string, outputDir: string) {
    const inputDir = path.join(process.env.documents.trim(), dir.substring(0, 1).trim().toLowerCase(), dir.trim()).trim()
    if (!inputDir || !existsSync(inputDir)) {
        console.warn("Lucinda documents directory not found or not specified in .env");
        return;
    }
    const incoming = path.join(outputDir, "Eingehende_Dokumente")
    const outgoing = path.join(outputDir, "Ausgehende_Dokumente")
    try {
        const files = await fs.readdir(inputDir);
        if (files.length === 0) {
            console.log(`No Lucinda documents found for patient ${dir}`);
            return;
        }
        await fs.mkdir(incoming, { recursive: true });
        await fs.mkdir(outgoing, { recursive: true });
        // console.log(`Found ${files.length} Lucinda documents for ${dir}`);
        for (const file of files) {
            try {
                console.log(`Copying Lucinda document: ${file}`);
                let dest=file.startsWith("A_") ? outgoing : incoming;
                const srcPath = path.join(inputDir, file);
                const destPath = path.join(dest, file);
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
