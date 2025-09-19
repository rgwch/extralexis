import { db } from '../index';
import path from "path"
import fs from "fs/promises"
import { existsSync } from 'fs';
import { elexisDateToDateString, normalize } from '../util';

export async function extractLucinda(dir: string, outputDir: string) {
    const output = path.join(outputDir, "Dokumente")
    await fs.mkdir(output, { recursive: true });
    const inputDir = path.join(process.env.documents, dir.substring(0, 1).toLowerCase(), dir)
    if (!inputDir || !existsSync(inputDir)) {
        console.warn("Lucinda documents directory not found or not specified in .env");
        return;
    }
    const files = await fs.readdir(inputDir);
    console.log(`Found ${files.length} Lucinda documents for ${dir}`);
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
}
