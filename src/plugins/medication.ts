import fs from 'fs/promises';
import path from 'path';
import { db } from '../index';
import { elexisDateToDateString, elexisDateToISODate, normalize, htmlSkeleton, hashmapToJson } from '../util';

export async function extractMedication(patId: string, outputDir: string) {
    const output = path.join(outputDir, "Medikation");
    await fs.mkdir(output, { recursive: true });

    try {
        const meds: Array<any> = await db("patient_artikel_joint").where({ deleted: "0", patientid: patId }).orderBy("datefrom","asc")
        const all = []
        for (const med of meds) {
            let prescription: any = {}
            let art = null
            if (med.artikelid) {
                art = await db("artikel").where({ id: med.artikelid })
            } else if (med.artikel) {
                const ident = med.artikel.split("::")
                art = await db("artikelstamm_ch").where({ id: ident[ident.length - 1] })
                if (!art || art.length == 0) {
                    art = await db("artikel").where({ id: ident[ident.length - 1] })
                }
   
            } else {
                continue;
            }
            prescription.name = art?.[0]?.dscr ?? art?.[0]?.name ?? ""
            prescription.dateFrom = elexisDateToDateString(med.datefrom)
            prescription.dateUntil = med.dateuntil;
            prescription.prescdate = med.prescdate;
            prescription.presctype = med.presctype;
            prescription.dosis = med.dosis
            all.push(prescription)
        }
        // Write JSON file
        const fileName = `medications.json`;
        const filePath = path.join(output, fileName);
        await fs.writeFile(filePath, JSON.stringify(all, null, 2));
    } catch (err) {
        console.log(err)
    }
}