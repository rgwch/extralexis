import { db } from './index';
import { elexisDateToDateString, normalize, makeLabel, compexExpand, htmlSkeleton, dateToDisplayDate } from './lib/util';
import { htmlToPdf } from './lib/pdf';
import { readme_plaintext, readme_html } from './lib/readme';
import fs from 'fs/promises';
import path from 'path';


/**
 * Retrieve a list of patients with pagination, orderd by lastname (bezeichnung1).
 * @param offset number of partients to skip
 * @param limit number of patients to retrieve 
 * @returns 
 */
export async function getPatients(offset: number, limit: number): Promise<Array<{ id: string, bezeichnung1: string, bezeichnung2: string, geburtsdatum: string, patientnr: string }>> {
    const pats = await db('kontakt').select('id', 'bezeichnung1', 'bezeichnung2', 'geburtsdatum', "patientnr")
        .where({ istpatient: "1" }).whereNot({ deleted: "1" }).andWhere('bezeichnung1', '!=', '').orderBy('bezeichnung1').limit(limit).offset(offset);
    // console.log(pats);
    return pats.map(p =>
        normalize(p)
    )
}

/**
 * Number of total patients in the database. (Which are entries in the kontakt table with istpatient = 1 and not deleted)
 * @returns 
 */
export async function getTotalPatientCount(): Promise<number> {
    const result = await db('kontakt').count<{ count: number }>('id as count').where({ istpatient: "1" })
        .whereNot({ deleted: "1" }).first();
    return result ? result.count : 0;
}

/**
 * Retrieve patient entry by their unique ID (which is not the patient number, but an UUID).
 * @param id 
 * @returns 
 */
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

/**
 * Process patient data by their lastname, and/or firstname and/or birthdate.
 * @param descr a string like lastnanme, firstname, birthdate (dd.mm.yyyy)
 */
export async function extractDataByPatData(descr: string) {
    try {
        const { lastname, firstname, birthdate } = (() => {
            const parts = descr.split(",").map(p => p.trim());
            return { lastname: parts[0], firstname: parts[1] || "", birthdate: parts[2] || "" };
        })();
        let birthdateFormatted = birthdate;
        if (birthdate && birthdate.includes(".")) {
            const bdparts = birthdate.split(".").map(p => p.trim());
            if (bdparts.length === 3) {
                const day = bdparts[0].padStart(2, '0');
                const month = bdparts[1].padStart(2, '0');
                const year = bdparts[2];
                birthdateFormatted = `${year}${month}${day}`;
            }
        }
        const constraints = {}
        if (lastname) constraints['bezeichnung1'] = lastname
        if (firstname) constraints['bezeichnung2'] = firstname
        if (birthdate) constraints['geburtsdatum'] = birthdateFormatted
        const pats = await db("kontakt")
            .where(constraints)
            .select("id")
            .timeout(3000, { cancel: true }) // 3 second timeout
        for (const pat of pats) {
            await extractData(pat.id);
        }
    } catch (err) {
        console.error("Error in extractDataByPatName:", err);
        throw err;
    }
}

/**
 * Process patient data by their patient number (KG Nummer) (which is not the patient ID).
 * @param patnumber 
 * @returns 
 */
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

/**
 * Process patient data to output directory.
 * @param id 
 */
export async function extractData(id: string) {
    try {
        const pat = await getPatientById(id);
        if (pat) {
            // create output directory and write raw patient entry a sjson
            const bdate = pat.geburtsdatum ? elexisDateToDateString(pat.geburtsdatum) : 'unknown_date';
            const dirname = (pat.bezeichnung1 || 'unknown_name') + "_" +
                (pat.bezeichnung2 || 'unknown_surname') + "_" +
                bdate + "_(" +
                (pat.patientnr || "????") + ")";
            const patpath = path.join(process.env.output || "./data", dirname);
            await fs.mkdir(patpath, { recursive: true });
            await fs.writeFile(path.join(patpath, "info.json"), JSON.stringify(pat, null, 2));

            // create summary file (Deckblatt)
            let html = `<p>KG Nummer: ${pat.patientnr}</p>\n` +
                `<div><pre>${(pat.anschrift || "Keine Anschrift vorhanden").trim()}\n${pat.telefon1 ? pat.telefon1 + ", " : ""}${pat.email}</pre></div>\n`;

            const diags = pat.diagnosen
            if (diags) {
                const diagsb64 = Buffer.isBuffer(diags) ? diags.toString('base64') : diags;
                const dexp = await compexExpand(diagsb64)
                //console.log("Expanded diagnoses for patient", id, dexp);
                html += `<h2>Diagnosen</h2>\n`;
                html += `<pre>${dexp}</pre>\n`;
            }
            const pa = pat.persanamnese
            if (pa) {
                const pab64 = Buffer.isBuffer(pa) ? pa.toString('base64') : pa;
                const paexp = await compexExpand(pab64)
                html += `<h2>Persönliche Anamnese</h2>\n`;
                html += `<pre>${paexp}</pre>\n`;
            }
            const fa = pat.famanamnese
            if (fa) {
                const fab64 = Buffer.isBuffer(fa) ? fa.toString('base64') : fa;
                const faexp = await compexExpand(fab64)
                html += `<h2>Familienanamnese</h2>\n`;
                html += `<pre>${faexp}</pre>\n`;
            }
            if (pat.allergien) {
                html += `<h2>Allergien</h2>\n`;
                html += `<pre>${pat.allergien}</pre>\n`;
            }
            if (pat.risiken) {
                html += `<h2>Risiken</h2>\n`;
                html += `<pre>${pat.risiken}</pre>\n`;
            }
            if (pat.bemerkung) {
                html += `<h2>Bemerkung</h2>\n`;
                html += `<pre>${pat.bemerkung}</pre>\n`;
            }
            const htmlfile = path.join(patpath, "Deckblatt.html");
            await fs.writeFile(htmlfile, htmlSkeleton(pat, `[${pat.patientnr}] - ${makeLabel(pat)}`, html));
            await htmlToPdf(htmlfile, path.join(patpath, "Deckblatt.pdf"));
            await fs.mkdir(path.join(patpath, "Rohdaten")).catch(() => {
                console.warn("Rohdaten folder probably exists already, skipping creation.");
            });
            await fs.rename(path.join(patpath, "info.json"), path.join(patpath, "Rohdaten", "info.json"));
            await fs.rename(path.join(patpath, "Deckblatt.html"), path.join(patpath, "Rohdaten", "Deckblatt.html"));

            const readmeContent = readme_plaintext.replace("{patient}", makeLabel(pat)).replace("{date}", dateToDisplayDate(new Date()));
            await fs.writeFile(path.join(patpath, "Bitte_lesen.txt"), readmeContent);

            const readmeHtmlContent = readme_html(pat, dateToDisplayDate(new Date()));
            const htmlfile2 = path.join(patpath, "Bitte_lesen.html");
            await fs.writeFile(htmlfile2, readmeHtmlContent);
            await htmlToPdf(htmlfile2, path.join(patpath, "Bitte_lesen.pdf"));
            await fs.unlink(htmlfile2);

            // Process Handlers for various data types
            const handlers = (process.env.handlers || "kons").split(",").map(h => h.trim().toLowerCase());

            if (handlers.includes("medication")) {
                const { extractMedication } = await import("./plugins/medication")
                await extractMedication(pat, patpath);
                await fs.rename(path.join(patpath, "Medikation"), path.join(patpath, "Rohdaten", "Medikation")).catch(() => {
                    console.warn("Medikation folder probably does not exist, skipping moving it to Rohdaten.");
                })

            }

            if (handlers.includes("befunde")) {
                const { extractFindings } = await import('./plugins/befunde');
                await extractFindings(pat, makeLabel(pat), patpath);
                await fs.rename(path.join(patpath, "Befunde"), path.join(patpath, "Rohdaten", "Befunde")).catch(() => {
                    console.warn("Befunde folder probably does not exist, skipping moving it to Rohdaten.");
                })
            }

            if (handlers.includes("omnivore")) {
                const { extractOmnivore } = await import('./plugins/omnivore');
                await extractOmnivore(pat, patpath);
            }

            if (handlers.includes("briefe")) {
                const { extractBriefe } = await import('./plugins/briefe');
                await extractBriefe(pat, patpath);
            }

            if (handlers.includes("kons")) {
                const { extractKons } = await import('./plugins/kons');
                await extractKons(pat, patpath);
                await fs.rename(path.join(patpath, "Konsultationen.html"), path.join(patpath, "Rohdaten", "Konsultationen.html"))
            }

            if (handlers.includes("lucinda")) {
                const { extractLucinda } = await import('./plugins/lucinda');
                await extractLucinda(`${pat.bezeichnung1}_${pat.bezeichnung2}_${elexisDateToDateString(pat.geburtsdatum)} `, patpath);
            }

            if (handlers.includes("labor")) {
                const { extractLabresults } = await import('./plugins/lab');
                await extractLabresults(pat, patpath);
                await fs.rename(path.join(patpath, "Labor", "labor.csv"), path.join(patpath, "Labor.csv")).catch(() => {
                    console.warn("labor.csv probably does not exist, skipping moving it to Rroot.");
                })
                await fs.rename(path.join(patpath, "Labor"), path.join(patpath, "Rohdaten", "Labor")).catch(() => {
                    console.warn("Labor folder probably does not exist, skipping moving it to Rohdaten.");
                })
            }

            if (handlers.includes("vaccs")) {
                const { extractVaccinations } = await import('./plugins/vaccs');
                await extractVaccinations(pat, patpath);
                await fs.rename(path.join(patpath, "Impfungen"), path.join(patpath, "Rohdaten", "Impfungen")).catch(() => {
                    console.warn("Impfungen folder probably does not exist, skipping moving it to Rohdaten.");
                })

            }
            console.log(`Extraction completed for patient id ${id} at ${patpath}`);
        }
    } catch (err) {
        console.error("Error extracting data for patient id", id, err);

    }
}