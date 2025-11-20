import fs from 'fs/promises';
import path from 'path';

interface LabResult {
    Datum: string;
    Item: string;
    Wert: string;
    Einheit: string;
    Referenzbereich: string;
    Kommentar: string;
}

interface ItemData {
    item: string;
    einheit: string;
    referenzbereich: string;
    values: { [date: string]: string };
}

/**
 * Generates an HTML table from lab results JSON data
 * @param jsonFilePath Path to the JSON file containing lab results
 * @param outputPath Path where the HTML file should be saved
 */
export async function generateLabResultsHTML(jsonFilePath: string, outputPath: string): Promise<void> {
    try {
        // Read and parse the JSON file
        const jsonContent = await fs.readFile(jsonFilePath, 'utf-8');
        const labResults: LabResult[] = JSON.parse(jsonContent);

        // Process data to group by Item
        const itemMap = new Map<string, ItemData>();
        const allDates = new Set<string>();

        labResults.forEach(result => {
            const { Datum, Item, Wert, Einheit, Referenzbereich } = result;
            
            // Add date to our set of all dates
            allDates.add(Datum);

            // Group by Item
            if (!itemMap.has(Item)) {
                itemMap.set(Item, {
                    item: Item,
                    einheit: Einheit,
                    referenzbereich: Referenzbereich,
                    values: {}
                });
            }

            const itemData = itemMap.get(Item)!;
            itemData.values[Datum] = Wert;
        });

        // Sort dates chronologically
        const sortedDates = Array.from(allDates).sort((a, b) => {
            // Convert DD.MM.YYYY to YYYY-MM-DD for proper sorting
            const dateA = a.split('.').reverse().join('-');
            const dateB = b.split('.').reverse().join('-');
            return dateA.localeCompare(dateB);
        });

        // Generate HTML
        const html = generateHTML(Array.from(itemMap.values()), sortedDates);

        // Write HTML file
        await fs.writeFile(outputPath, html, 'utf-8');
        console.log(`HTML file generated successfully: ${outputPath}`);

    } catch (error) {
        console.error('Error generating HTML file:', error);
        throw error;
    }
}

function generateHTML(items: ItemData[], dates: string[]): string {
    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laborergebnisse</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow-x: auto;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            min-width: 800px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .fixed-column {
            background-color: #fff;
            position: sticky;
            left: 0;
            z-index: 5;
            border-right: 2px solid #007bff;
        }
        .fixed-column.header {
            z-index: 15;
            background-color: #f8f9fa;
        }
        .einheit-column, .referenz-column {
            background-color: #fff;
            position: sticky;
            z-index: 5;
            border-right: 1px solid #ddd;
        }
        .einheit-column {
            left: 200px; /* Adjust based on Item column width */
        }
        .referenz-column {
            left: 350px; /* Adjust based on Item + Einheit column widths */
        }
        .einheit-column.header, .referenz-column.header {
            background-color: #f8f9fa;
            z-index: 15;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #e3f2fd;
        }
        .date-header {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            min-width: 60px;
            background-color: #e3f2fd;
        }
        .value-cell {
            text-align: center;
            font-family: 'Courier New', monospace;
        }
        .empty-cell {
            background-color: #f5f5f5;
            color: #999;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Laborergebnisse</h1>
        <table>
            <thead>
                <tr>
                    <th class="fixed-column header">Item</th>
                    <th class="einheit-column header">Einheit</th>
                    <th class="referenz-column header">Referenzbereich</th>
                    ${dates.map(date => `<th class="date-header">${date}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                <tr>
                    <td class="fixed-column">${escapeHtml(item.item)}</td>
                    <td class="einheit-column">${escapeHtml(item.einheit)}</td>
                    <td class="referenz-column">${escapeHtml(item.referenzbereich)}</td>
                    ${dates.map(date => {
                        const value = item.values[date];
                        return value 
                            ? `<td class="value-cell">${escapeHtml(value)}</td>`
                            : `<td class="empty-cell">-</td>`;
                    }).join('')}
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}