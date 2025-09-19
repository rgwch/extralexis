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