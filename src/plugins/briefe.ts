import fs from 'fs/promises';
import path from 'path';
import { db } from '../index';
import { elexisDateToDateString, elexisDateToISODate, normalize } from '../util';
import { existsSync } from 'fs';

/**
 * In early versions of elexis, all documents were stored in the "briefe" and the "heap" table.
 * (more specific: Metadata in "briefe", content in "heap").
 * In later versions, only outgoing letters are stored in "briefe", while incoming letters and other documents
 * are handled by a document manager, such as omnivore or lucinda. Most recent versions like elexis ungrad handle 
 * all documents consistently and don't use "briefe" anymore.
 * 
 * This function extracts all documents stored in "briefe"/"heap" and saves them to the output directory.
 * @param patId 
 * @param outputDir 
 */
export async function extractBriefe(patId: string, outputDir: string) {
    const output = path.join(outputDir, "Briefe");
    try {
        const documents = await db("briefe").where({ patientid: patId }).whereNot("deleted", "1").select();
        if (documents.length === 0) {
            console.log(`No letters found for patient ${patId}`);
            return;
        }
        await fs.mkdir(output, { recursive: true });
        for (const rdoc of documents) {
            const doc = normalize(rdoc)
            let ext = ""
            if (doc.mimetype) {
                if (doc.mimetype === "application/vnd.oasis.opendocument.text" || doc.mimetype.endsWith("odt")) {
                    ext = "odt"
                } else if (doc.mimetype === "application/pdf" || doc.mimetype.endsWith("pdf")) {
                    ext = "pdf"
                } else {
                    ext = doc.mimetype.split(/[\/\.]/).pop() || "bin"
                }
            }
            const dest = await db("kontakt").select("Bezeichnung1", "Bezeichnung2").where({ id: doc.destid }).first();
            let basename = doc.betreff
            if (dest) {
                basename += ` (an ${dest.bezeichnung1 || ''} ${dest.bezeichnung2 || ''})`
            }
            basename = basename.trim().replace(/[\/\\?%*:|"<>]/g, '_');
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
            const contents = await db("heap").select("inhalt").where({ id: doc.id }).first();
            await fs.writeFile(defpath + '.' + ext, contents.inhalt);
        }
    } catch (error) {
        console.error(`Error extracting letters for patient ${patId}:`, error);
    }
}