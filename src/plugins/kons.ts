import { db } from '../index';
import { elexisDateToDateString, normalize, getVersionedResource } from '../util';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import * as Samdas from '@rgwch/samdastools';

export async function extractKons(patId: string, outputDir: string) {
  const fall_output = path.join(outputDir, "Faelle")
  const cases = await db("faelle").where({ patientid: patId }).whereNot("deleted", "1").select();
  if (cases.length === 0) {
    console.log(`No cases found for patient ${patId}`);
    return;
  }
  await fs.mkdir(fall_output, { recursive: true });

  for (const rcase of cases) {
    const fall = normalize(rcase)
    const kons = await db("behandlungen").where({ fallid: fall.id }).whereNot("deleted", "1").orderBy("datum", "asc").select();
    if (kons.length === 0) {
      console.log(`No consultations found for case ${fall.id} (${fall.bezeichnung})`);
      continue;
    }
    let output = path.join(fall_output, `Fall_${fall.bezeichnung || 'unbenannt'}_${elexisDateToDateString(fall.datumvon)}_bis_${elexisDateToDateString(fall.datumbis)}`);
    await fs.mkdir(output, { recursive: true });
    let fullext = "<html><head><meta charset=\"UTF-8\"><title>Konsultationen</title></head><body>";
    for (const rk of kons) {
      try {
        const k = normalize(rk)
        const date = k.datum ?? '00000000'
        const bdate = elexisDateToDateString(date)
        let title = `Konsultation_${bdate}`
        fullext += `<h2>${title}</h2>\n`
        const base64String = Buffer.isBuffer(k.eintrag) ? k.eintrag.toString('base64') : k.eintrag;
        const entry = await getVersionedResource(base64String);
        if (entry) {
          const html = await Samdas.toHtml(entry);
          fullext += html + "\n<br/>\n";
        }
      } catch (err) {
        console.error("Error processing kons", rk.id, err);
      }
    }
    fullext += "</body></html>";
    const ext = "html"
    const filepath = path.join(output, "Konsultationen");
    let i = 2
    let defpath = filepath
    while (existsSync(defpath + '.' + ext)) {
      defpath = filepath + `(${i++})`;
    }
    await fs.writeFile(defpath + '.' + ext, fullext);

  }
}