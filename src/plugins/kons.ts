import { db } from '../index';
import { elexisDateToDateString, normalize, getVersionedResource, htmlSkeleton } from '../util';
import { htmlToPdf } from '../pdf';
import fs from 'fs/promises';
import path from 'path';
import * as Samdas from '@rgwch/samdastools';

/**
 * Text entries of consultations (Konsultationen) are stored in the "behandlungen" table.
 * Elexis uses a custom rich text format called SAMDAS, and a versioned resource system to store
 * the actual content. This function extracts all consultations for all cases of a patient,
 * converts them to HTML, and saves them in a single HTML file per case.
 * The conversion from VersionedResource/Samdas to HTML is done using a webservice (elexis_converter_x.y.z.jar) 
 * and the @rgwch/samdastools library.
 * @param patId 
 * @param outputDir 
 * @returns 
 */
export async function extractKons(pat: any, outputDir: string) {
  const cases = await db("faelle").where({ patientid: pat.id }).whereNot("deleted", "1").select();
  if (cases.length === 0) {
    console.log(`No cases found for patient ${pat.id}`);
    return;
  }
  let html = "<h1>Konsultationen</h1>\n";
  for (const rcase of cases) {
    const fall = normalize(rcase)
    const kons = await db("behandlungen").where({ fallid: fall.id }).whereNot("deleted", "1").orderBy("datum", "asc").select();
    if (kons.length === 0) {
      console.log(`No consultations found for case ${fall.id} (${fall.bezeichnung})`);
      continue;
    }
    html += `<h2>Fall: ${fall.bezeichnung || 'unbenannt'} (${elexisDateToDateString(fall.datumvon)} bis ${elexisDateToDateString(fall.datumbis)})</h2>\n`;
    html += `<p class="subtitle">Gesetz: ${fall.gesetz || 'unbekannt'}, Grund: ${fall.grund || 'unbekannt'}, Versicherungsnummer: ${fall.versnummer || 'unbekannt'}</p>\n`;
    for (const rk of kons) {
      try {
        const k = normalize(rk)
        const date = k.datum ?? '00000000'
        const bdate = elexisDateToDateString(date)
        let title = `Konsultation vom ${bdate}`
        html += `<h3>${title}</h3>\n`
        const base64String = Buffer.isBuffer(k.eintrag) ? k.eintrag.toString('base64') : k.eintrag;
        const entry = await getVersionedResource(base64String);
        if (entry) {
          const entryHtml = await Samdas.toHtml(entry);
          html += entryHtml + "\n<br/>\n";
        }
      } catch (err) {
        console.error("Error processing kons", rk.id, err);
      }
    }


  }
  const filepath = path.join(outputDir, "Konsultationen.html");
  await fs.writeFile(filepath, htmlSkeleton(`[Konsultationen]`, html));
  await htmlToPdf(filepath, path.join(outputDir, "Konsultationen.pdf"));
}