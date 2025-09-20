import { db } from '../index';
import path from "path"
import fs from "fs/promises"
import { existsSync } from 'fs';
import { elexisDateToDateString, elexisDateToISODate, normalize } from '../util';

/**
 * Omnivore is a document management system for Elexis.
 * Documents are stored in the "ch_elexis_omnivore_data" table, with metadata such as title, date, and mimetype.
 * This function extracts all documents for a patient and saves them to the output directory.
 * @param patId 
 * @param outputDir 
 * @returns 
 */
export async function extractOmnivore(patId: string, outputDir: string) {
    const output = path.join(outputDir, "Dokumente")
    try {
        const documents = await db("ch_elexis_omnivore_data").where({ patid: patId }).whereNot("deleted", "1").select();
        if (documents.length === 0) {
            console.log(`No documents found for patient ${patId}`);
            return;
        }
        await fs.mkdir(output, { recursive: true });
        for (const rdoc of documents) {
            const doc = normalize(rdoc)
            console.log(doc.mimetype)
            let ext = ""
            if (doc.mimetype === "application/vnd.oasis.opendocument.text" || doc.mimetype.endsWith("odt")) {
                ext = "odt"
            } else if (doc.mimetype === "application/pdf" || doc.mimetype.endsWith("pdf")) {
                ext = "pdf"
            } else {
                ext = doc.mimetype.split(/[\/\.]/).pop() || "bin"
            }
            const basename = `${doc.title || 'unnamed_document'}`.trim().replace(/[\/\\?%*:|"<>]/g, '_');
            let filename = basename
            if (!basename.match(/^[0-9]{2,4}\-[0-9][0-9]\-[0-9]{2,4}.+/)) {
                const date = doc.datum ?? doc.creationdate
                filename = elexisDateToISODate(date) + '_' + basename
            }
            if (filename.endsWith(ext)) {
                filename = filename.substring(0, filename.length - ext.length - 1)
            }
            const filepath = path.join(output, filename);
            let i = 2
            let defpath = filepath
            while (existsSync(defpath + '.' + ext)) {
                defpath = filepath + `(${i++})`;
            }
            await fs.writeFile(defpath + '.' + ext, doc.doc);
        }
    } catch (error) {
        console.error(`Error extracting documents for patient ${patId}:`, error);
    }
}