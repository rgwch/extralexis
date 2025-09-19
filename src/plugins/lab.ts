import { db } from '../index';
import path from "path"
import fs from "fs/promises"
import { existsSync } from 'fs';
import { elexisDateToDateString, normalize } from '../util';

export async function extractLabresults(patId: string, outputDir: string) {
    const output = path.join(outputDir, "Labor")
    try {
        const results = await db("laborwerte").join("laboritems", "laboritems.id", "=", "laborwerte.itemid").where({ patientid: patId }).
            whereNot("laborwerte.deleted", "1").orderBy("laborwerte.datum", "asc").select();
        if (results.length === 0) {
            console.log(`No lab results found for patient ${patId}`);
            return;
        }
        await fs.mkdir(output, { recursive: true });

        const total = []
        for (const result of results) {
            const r = normalize(result)
            total.push({ "Datum": elexisDateToDateString(r.datum), "Item": r.titel, "Wert": r.resultat, "Einheit": r.einheit, "Referenzbereich": r.refmann, "Kommentar": r.kommentar })
        }
        const fileName = `labor_${patId}.json`;
        const filePath = path.join(output, fileName);
        await fs.writeFile(filePath, JSON.stringify(total, null, 2));
    } catch (error) {
        console.error(`Error extracting lab results for patient ${patId}:`, error);
    }
}