export function elexisDateToISODate(elexisDate: string): string {
    // Elexis date format is YYYYMMDD
    if (!/^\d{8}$/.test(elexisDate)) {
        return '0000-00-00';
    }
    const year = elexisDate.slice(0, 4);
    const month = elexisDate.slice(4, 6);
    const day = elexisDate.slice(6, 8);
    return `${year}-${month}-${day}`;
}
export function elexisDateToDateString(elexisDate: string): string {
    // Elexis date format is YYYYMMDD
    if (!/^\d{8}$/.test(elexisDate)) {
        return '0000-00-00';
    }
    const year = elexisDate.slice(0, 4);
    const month = elexisDate.slice(4, 6);
    const day = elexisDate.slice(6, 8);
    return `${day}.${month}.${year}`;
}

export function isoDateToElexisDate(isoDate: string): string {
    // ISO date format is YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        throw new Error(`Invalid ISO date format: ${isoDate}`);
    }
    return isoDate.replace(/-/g, '');
}

export function normalize(p: any) {
    for (const key in p) {
        if (p[key] === null) {
            p[key] = '';
        }
        p[key.toLowerCase()] = p[key];
    }
    return p
}

export async function getVersionedResource(b64: string): Promise<string> {
    if (!b64 || b64.length === 0) {
        return "";
    }
    const result = await fetch(`${process.env.converter}/versionedresource/head`, {
        method: 'POST',
        body: b64,
        headers: {
            'Content-Type': 'text/plain'
        }
    });
    if (result.ok) {
        const text = await result.text();
        return text.trim();
    }
    console.error("Error fetching versioned resource", result.statusText);
    return ""
}

export async function hashmapToJson(mapped: string): Promise<any> {
    const result = await fetch(`${process.env.converter}/extinfo/serialized-to-json`, {
        method: 'POST',
        body: mapped,
        headers: {
            'Content-Type': 'text/plain'
        }
    });
    if (result.ok) {
        const json = await result.json();
        return json;
    }
    console.error("Error converting hashmap to json", result.statusText);
    return null;
}

export async function compexExpand(b64: string): Promise<string> {
    if (!b64 || b64.length === 0) {
        return "";
    }
    const result = await fetch(`${process.env.converter}/compex/expand`, {
        method: 'POST',
        body: b64,
        headers: {
            'Content-Type': 'text/plain'
        }
    });
    if (result.ok) {
        const text = await result.text();
        return Buffer.from(text.trim(), 'base64').toString('utf-8');
    }
    console.error("Error expanding compex", result.statusText);
    return ""
}

export function makeLabel(pat: any): string {
    const bdate = pat.geburtsdatum ? elexisDateToDateString(pat.geburtsdatum) : 'unknown_date';
    const lastname = pat.bezeichnung1 || "unbekannt"
    const firstname = pat.bezeichnung2 || "unbekannt"
    return lastname + " " + firstname + ", " + bdate
}

export function htmlSkeleton(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
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
<body><div class="container">${body}</div></body>
</html>`;
}