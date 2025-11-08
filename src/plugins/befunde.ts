import fs from 'fs/promises';
import path from 'path';
import { db } from '../index';
import { elexisDateToDateString, normalize, hashmapToJson } from '../util';
import { htmlToPdf } from '../pdf'
/**
 * Extracts all findings (Befunde) for a patient from the "elexisbefunde" table 
 * and saves them in both JSON and CSV formats 
 * @param patId 
 * @param outputDir 
 * @returns 
 */
export async function extractFindings(patId: string, patLabel: string, outputDir: string) {
    const setup = await db("elexisbefunde").where({ id: "__SETUP__" }).select();
    const raw = setup[0].befunde || setup[0].Befunde;
    const setupb64 = Buffer.isBuffer(raw) ? raw.toString('base64') : raw;
    const setupjson = await hashmapToJson(setupb64);
    if (!setupjson || !setupjson.names) {
        console.log("No valid setup found for findings extraction");
        return;
    }
    const names = setupjson.names.split(";;");

    const findings = await db("elexisbefunde").where({ patientid: patId }).whereNot("deleted", "1").select();
    if (findings.length === 0) {
        console.log(`No findings found for patient ${patId}`);
        return;
    }
    const output = path.join(outputDir, "Befunde");
    await fs.mkdir(output, { recursive: true });

    const total = []
    for (const f of findings) {
        const r = normalize(f)
        const base64String = Buffer.isBuffer(r.befunde) ? r.befunde.toString('base64') : r.befunde;
        try {
            const json = await hashmapToJson(base64String);
            if (json) {
                const element = (setupjson[r.name] || setupjson[r.name + "_FIELDS"])?.split(",");
                if (!element) continue;
                const line = { "Datum": elexisDateToDateString(r.datum), "Bezeichnung": r.name };
                for (let i = 0; i < element.length; i++) {
                    const item = element[i].split(":/:")[0]
                    line[item] = json[item]
                }
                total.push(line);
            }
        } catch (err) {
            console.error(`Error processing finding ${r.name} for patient ${patId}:`, err);
        }

    }

    // Write JSON file
    const fileName = `befunde.json`;
    const filePath = path.join(output, fileName);
    await fs.writeFile(filePath, JSON.stringify(total, null, 2));

    // Write CSV files - one for each Bezeichnung
    const groupedByBezeichnung = new Map<string, any[]>();

    // Group records by Bezeichnung
    for (const record of total) {
        const bezeichnung = record.Bezeichnung;
        if (!groupedByBezeichnung.has(bezeichnung)) {
            groupedByBezeichnung.set(bezeichnung, []);
        }
        groupedByBezeichnung.get(bezeichnung)!.push(record);
    }

    // Create CSV file for each Bezeichnung
    for (const [bezeichnung, records] of groupedByBezeichnung) {
        // Sort records by date (convert DD.MM.YYYY to comparable format)
        records.sort((a, b) => {
            const parseDate = (dateStr: string) => {
                const [day, month, year] = dateStr.split('.');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            };
            return parseDate(a.Datum).getTime() - parseDate(b.Datum).getTime();
        });

        // Get all unique column names for this Bezeichnung (excluding Bezeichnung itself)
        const allColumns = new Set<string>();
        allColumns.add('Datum'); // Always first

        for (const record of records) {
            Object.keys(record).forEach(key => {
                if (key !== 'Bezeichnung') {
                    allColumns.add(key);
                }
            });
        }

        const columns = Array.from(allColumns);
        // Ensure Datum is first
        const sortedColumns = ['Datum', ...columns.filter(col => col !== 'Datum')];

        // Create CSV header
        const csvHeader = sortedColumns.join(',') + '\n';

        // Create CSV rows
        const csvRows = records.map(record => {
            return sortedColumns.map(column => {
                const value = record[column] || '';
                // Escape CSV field if needed
                if (value.toString().includes(',') || value.toString().includes('"') || value.toString().includes('\n')) {
                    return `"${value.toString().replace(/"/g, '""')}"`;
                }
                return value.toString();
            }).join(',');
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        // Write CSV file named after the Bezeichnung
        const csvFileName = `${bezeichnung}.csv`;
        const csvFilePath = path.join(output, csvFileName);
        await fs.writeFile(csvFilePath, csvContent);
    }

    // Generate HTML report
    const htmlFileName = "Befunde.html";
    const htmlFilePath = path.join(output, htmlFileName);

    // Read CSS from external file
    const cssFilePath = path.join(__dirname, '..', 'default.css');
    const cssContent = await fs.readFile(cssFilePath, 'utf-8');

    // Get patient info for the title (using patId for now)
    const patientInfo = patLabel; // You might want to get actual patient name here

    let htmlContent = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Befunde Bericht - ${patientInfo}</title>
    <style>
        ${cssContent}
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 Befunde Bericht</h1>
        <div class="summary">
            <strong>Patient:</strong> ${patientInfo}<br>
            <strong>Erstellt am:</strong> ${new Date().toLocaleDateString('de-DE')}<br>
            <strong>Anzahl Befund-Typen:</strong> ${groupedByBezeichnung.size}<br>
            <strong>Gesamtanzahl Befunde:</strong> ${total.length}
        </div>
`;

    // Add a section for each Bezeichnung
    for (const [bezeichnung, records] of groupedByBezeichnung) {
        // Sort records by date (same sorting as CSV)
        records.sort((a, b) => {
            const parseDate = (dateStr: string) => {
                const [day, month, year] = dateStr.split('.');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            };
            return parseDate(a.Datum).getTime() - parseDate(b.Datum).getTime();
        });

        // Get columns (same logic as CSV)
        const allColumns = new Set<string>();
        allColumns.add('Datum');

        for (const record of records) {
            Object.keys(record).forEach(key => {
                if (key !== 'Bezeichnung') {
                    allColumns.add(key);
                }
            });
        }

        const sortedColumns = ['Datum', ...Array.from(allColumns).filter(col => col !== 'Datum')];

        htmlContent += `
        <h2>📊 ${bezeichnung} (${records.length} Einträge)</h2>
        <table>
            <thead>
                <tr>
                    ${sortedColumns.map(col => `<th>${col}</th>`).join('')}
                </tr>
            </thead>
            <tbody>`;

        if (records.length > 0) {
            for (const record of records) {
                htmlContent += `
                <tr>
                    ${sortedColumns.map(col => {
                    const value = record[col] || '';
                    // Escape HTML characters
                    const escapedValue = value.toString()
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
                    return `<td>${escapedValue}</td>`;
                }).join('')}
                </tr>`;
            }
        } else {
            htmlContent += `
                <tr>
                    <td colspan="${sortedColumns.length}" class="no-data">Keine Daten verfügbar</td>
                </tr>`;
        }

        htmlContent += `
            </tbody>
        </table>`;
    }

    htmlContent += `
    </div>
</body>
</html>`;

    await fs.writeFile(htmlFilePath, htmlContent);
    await htmlToPdf(htmlFilePath, path.join(outputDir, "Befunde.pdf"));

}