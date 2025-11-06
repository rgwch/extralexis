import fs from 'fs/promises';
import path from 'path';
import { db } from '../index';
import { elexisDateToDateString, normalize, hashmapToJson } from '../util';

/**
 * Extracts all findings (Befunde) for a patient from the "elexisbefunde" table 
 * and saves them in both JSON and CSV formats 
 * @param patId 
 * @param outputDir 
 * @returns 
 */
export async function extractFindings(patId: string, outputDir: string) {
    const setup = await db("elexisbefunde").where({ id: "__SETUP__" }).select();
    const setupb64 = Buffer.isBuffer(setup[0].befunde) ? setup[0].befunde.toString('base64') : setup[0].befunde;
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

        const json = await hashmapToJson(base64String);
        if (json) {
            const element = setupjson[r.name]?.split(",");
            if (!element) continue;
            const line = { "Datum": elexisDateToDateString(r.datum), "Bezeichnung": r.name };
            for (let i = 0; i < element.length; i++) {
                line[element[i]] = json[element[i]];
            }
            total.push(line);
        }

    }

    // Write JSON file
    const fileName = `befunde_${patId}.json`;
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
    const htmlFileName = `befunde_${patId}_report.html`;
    const htmlFilePath = path.join(output, htmlFileName);

    // Get patient info for the title (using patId for now)
    const patientInfo = patId; // You might want to get actual patient name here

    let htmlContent = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Befunde Bericht - ${patientInfo}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        h2 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 5px;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background-color: white;
        }
        th {
            background-color: #3498db;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        tr:hover {
            background-color: #e8f4f8;
        }
        .summary {
            background-color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .no-data {
            text-align: center;
            color: #7f8c8d;
            font-style: italic;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📋 Befunde Bericht</h1>
        <div class="summary">
            <strong>Patient ID:</strong> ${patientInfo}<br>
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
}
