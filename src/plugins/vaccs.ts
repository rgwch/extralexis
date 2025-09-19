import fs from 'fs/promises';
import path from 'path';
import { db } from '../index';
import { elexisDateToDateString, normalize } from '../util';

export async function extractVaccinations(patId: string, outputDir: string) {
    const vaccs = await db("at_medevit_elexis_impfplan").where({ patient_id: patId }).whereNot("deleted", "1").select();
    if (vaccs.length === 0) {
        console.log(`No vaccinations found for patient ${patId}`);
        return;
    }
    const output = path.join(outputDir, "Impfungen");
    await fs.mkdir(output, { recursive: true });

    const total = []
    for (const v of vaccs) {
        const r = normalize(v)
        total.push({ "Datum": elexisDateToDateString(r.dateofadministration), "Impfung": r.vaccagainst, "Charge": r.lotnr, "Impfstoff": r.businessname, "ATCCode": r.atccode })
    }

    // Write JSON file
    const fileName = `impfungen_${patId}.json`;
    const filePath = path.join(output, fileName);
    await fs.writeFile(filePath, JSON.stringify(total, null, 2));

    // Write CSV file
    const csvFileName = `impfungen_${patId}.csv`;
    const csvFilePath = path.join(output, csvFileName);

    // Create CSV header
    const csvHeader = 'Datum,Impfung,Charge,Impfstoff,ATCCode\n';

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
            escapeCSVField(row.Impfung),
            escapeCSVField(row.Charge),
            escapeCSVField(row.Impfstoff),
            escapeCSVField(row.ATCCode)
        ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    await fs.writeFile(csvFilePath, csvContent);
}