import fs from 'fs/promises';
import path from 'path';
import { db } from '../index';
import { elexisDateToDateString, normalize } from '../util';
import { existsSync } from 'fs';

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
            if (!basename.match(/^[0-9][0-9]\.[0-9][0-9]\.[0-9]{2,4}.+/)) {
                const date = doc.datum ?? doc.creationdate
                filename = elexisDateToDateString(date) + '_' + basename
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