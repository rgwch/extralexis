import { db } from './index';
import { elexisDateToDateString, normalize } from './util';
import { extractOmnivore } from './plugins/omnivore';
import { extractBriefe } from './plugins/briefe';
import { extractKons } from './plugins/kons';
import fs from 'fs/promises';
import path from 'path';


export async function getPatients(offset: number, limit: number): Promise<Array<{ id: string, bezeichnung1: string, bezeichnung2: string, geburtsdatum: string, patientnr: string }>> {
    const pats = await db('kontakt').select('id', 'bezeichnung1', 'bezeichnung2', 'geburtsdatum', "patientnr")
        .where({ istpatient: "1" }).whereNot({ deleted: "1" }).andWhere('bezeichnung1', '!=', '').orderBy('bezeichnung1').limit(limit).offset(offset);
    // console.log(pats);
    return pats.map(p =>
        normalize(p)
    )
}

export async function getTotalPatientCount(): Promise<number> {
    const result = await db('kontakt').count<{ count: number }>('id as count').where({ istpatient: "1" })
        .whereNot({ deleted: "1" }).first();
    return result ? result.count : 0;
}

export async function getPatientById(id: string) {
    console.log("getPatientById called with id:", id);
    try {
        const pat = await db("kontakt")
            .where({ id })
            .timeout(3000, { cancel: true }) // 3 second timeout
            .first();
        // console.log("Query result:", pat);
        return normalize(pat);
    } catch (err) {
        console.error("Error in getPatientById:", err);
        throw err;
    }
}

export async function extractDataByPatNumber(patnumber: string) {
    try {
        const pat = await db("kontakt")
            .where({ patientnr: patnumber })
            .select("id")
            .timeout(3000, { cancel: true }) // 3 second timeout
            .first();
        return extractData(pat.id);
    } catch (err) {
        console.error("Error in extractDataByPatNumber:", err);
        throw err;
    }
}

export async function extractData(id: string) {
    try {
        const pat = await getPatientById(id);
        if (pat) {
            const bdate = pat.geburtsdatum ? elexisDateToDateString(pat.geburtsdatum) : 'unknown_date';
            const dirname = (pat.bezeichnung1 || 'unknown_name') + "_" +
                (pat.bezeichnung2 || 'unknown_surname') + "_" +
                bdate + "_(" +
                (pat.patientnr || "????") + ")";
            const patpath = path.join(process.env.output || "./data", dirname);
            await fs.mkdir(patpath, { recursive: true });
            await fs.writeFile(path.join(patpath, "info.json"), JSON.stringify(pat, null, 2));
            const handlers = (process.env.handlers || "omnivore").split(",").map(h => h.trim().toLowerCase());
            if (handlers.includes("omnivore")) {
                await extractOmnivore(id, patpath);
            }
            if (handlers.includes("briefe")) {
                await extractBriefe(id, patpath);
            }
            if (handlers.includes("kons")) {
                await extractKons(id, patpath);
            }
            if (handlers.includes("lucinda")) {
                const { extractLucinda } = await import('./plugins/lucinda');
                await extractLucinda(`${pat.bezeichnung1}_${pat.bezeichnung2}_${elexisDateToDateString(pat.geburtsdatum)}`, patpath);
            }
            if (handlers.includes("labor")) {
                const { extractLabresults } = await import('./plugins/lab');
                await extractLabresults(id, patpath);
            }
        }
    } catch (err) {
        console.error("Error extracting data for patient id", id, err);

    }
}