import { db } from '../index';
import path from "path"
import fs from "fs/promises"
import { existsSync } from 'fs';
import { elexisDateToDateString, normalize } from '../util';

/**
 * Lab results are stored in the "laborwerte" table, linked to "laboritems" for metadata.
 * This function extracts all lab results for a patient and saves them in both JSON and CSV formats.
 * @param patId 
 * @param outputDir 
 * @returns 
 */
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

        // Write JSON file
        const fileName = `labor_${patId}.json`;
        const filePath = path.join(output, fileName);
        await fs.writeFile(filePath, JSON.stringify(total, null, 2));

        // Write CSV file
        const csvFileName = `labor_${patId}.csv`;
        const csvFilePath = path.join(output, csvFileName);

        // Create CSV header
        const csvHeader = 'Datum,Item,Wert,Einheit,Referenzbereich,Kommentar\n';

        // Create CSV rows
        const csvRows = total.map(row => {
            // Escape commas and quotes in CSV fields
            const escapeCSVField = (field: string) => {
                if (!field) return '';
                if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            };

            return [
                escapeCSVField(row.Datum),
                escapeCSVField(row.Item),
                escapeCSVField(row.Wert),
                escapeCSVField(row.Einheit),
                escapeCSVField(row.Referenzbereich),
                escapeCSVField(row.Kommentar)
            ].join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;
        await fs.writeFile(csvFilePath, csvContent);
    } catch (error) {
        console.error(`Error extracting lab results for patient ${patId}:`, error);
    }
}