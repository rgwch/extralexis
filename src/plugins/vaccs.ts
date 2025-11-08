import fs from 'fs/promises';
import path from 'path';
import { db } from '../index';
import { elexisDateToDateString, normalize, htmlSkeleton, displayDateToDate } from '../util';
import { htmlToPdf } from '../pdf';

/**
 * Vaccinations are stored in the "at_medevit_elexis_impfplan" table. 
 * This function extracts all vaccinations for a patient and saves them in both JSON and CSV formats.
 * @param patId 
 * @param outputDir 
 * @returns 
 */
export async function extractVaccinations(patId: string, outputDir: string) {
    const vaccs = await db("at_medevit_elexis_impfplan").where({ patient_id: patId }).whereNot("deleted", "1").select();
    if (vaccs.length === 0) {
        console.log(`No vaccinations found for patient ${patId}`);
        return;
    }
    const output = path.join(outputDir, "Impfungen");
    await fs.mkdir(output, { recursive: true });

    const totalRaw = []
    for (const v of vaccs) {
        const r = normalize(v)
        totalRaw.push({ "Datum": elexisDateToDateString(r.dateofadministration), "Impfung": r.vaccagainst, "Charge": r.lotnr, "Impfstoff": r.businessname, "ATCCode": r.atccode })
    }

    // order totatRaw by date descending
    const total = totalRaw.sort((a, b) => {
        const dateA = displayDateToDate(a.Datum);
        const dateB = displayDateToDate(b.Datum);
        return dateB.getTime() - dateA.getTime();
    });

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
    let html = "<table><tr><th>Datum</th><th>Impfung</th><th>Charge</th><th>Impfstoff</th><th>ATCCode</th></tr>";
    for (const row of total) {
        html += `<tr><td>${row.Datum}</td><td>${row.Impfung}</td><td>${row.Charge}</td><td>${row.Impfstoff}</td><td>${row.ATCCode}</td></tr>`;
    }
    html += "</table>";
    const htmlFile = path.join(output, "Impfungen.html")
    await fs.writeFile(htmlFile, htmlSkeleton("Impfungen",html));
    await htmlToPdf(htmlFile, path.join(outputDir, "Impfungen.pdf"));
    console.log(`Extracted ${vaccs.length} vaccinations for patient ${patId}`);
}