import fs from 'fs/promises';
import path from 'path';
import { db } from '../index';
import { elexisDateToDateString, elexisDateToISODate, normalize, htmlSkeleton, hashmapToJson } from '../util';
import { htmlToPdf } from '../pdf';

enum medicationType {
    unknown = -1,
    fixed_medication = 0,         // Fixnedikation
    on_demand_medication = 1,     // Bedarfsmedikation 
    prescribed_medication = 2,    // Verordnete Medikation
    self_dispensed = 3,           // Direktabgabe
    symptomatic_medication = 5    // Symptomatische Medikation
}
function medicationTypeToString(type: number): string {
    switch (type) {
        case medicationType.fixed_medication:
            return "Fixmedikation";
        case medicationType.on_demand_medication:
            return "Bedarfsmedikation";
        case medicationType.prescribed_medication:
            return "Verordnete Medikation";
        case medicationType.self_dispensed:
            return "Direktabgabe";
        case medicationType.symptomatic_medication:
            return "Symptomatische Medikation";
        default:
            return "Unbekannt";
    }
}
export async function extractMedication(pat: any, outputDir: string) {
    const output = path.join(outputDir, "Medikation");
    await fs.mkdir(output, { recursive: true });

    try {
        const meds: Array<any> = await db("patient_artikel_joint").where({ deleted: "0", patientid: pat.id }).orderBy("datefrom", "asc")
        if (meds.length == 0) {
            console.log(`No medications found for patient ${pat.id}`);
            return;
        }
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
            prescription.dateUntil = elexisDateToDateString(med.dateuntil);
            prescription.prescdate = elexisDateToDateString(med.prescdate);
            prescription.presctype = med.presctype;
            prescription.dosis = med.dosis
            all.push(prescription)
        }
        // Write JSON file
        const fileName = `medications.json`;
        const filePath = path.join(output, fileName);
        await fs.writeFile(filePath, JSON.stringify(all, null, 2));
        let htmlFix = '<h2>Fixmedikation</h2><table><tr><th>Startdatum</th><th>Medikament</th><th>Enddatum</th><th style="min-width:100px">Dosis</th></tr>';
        let htmlOther = "<br /><br /><hr><br /><h2>Alle Medikamente</h2><table><tr><th>Datum</th><th>Medikament</th><th>Dosis</th></tr>";
        for (const row of all) {
            if (row.presctype == medicationType.fixed_medication) {
                htmlFix += `<tr><td>${row.dateFrom}</td><td>${row.name}</td><td>${row.dateUntil}</td><td style="width:100px;">${row.dosis}</td></tr>`;
            } else {
                htmlOther += `<tr><td>${row.dateFrom}</td><td>${row.name}</td><td>${row.dosis}</td></tr>`;
            }
        }
        htmlFix += "</table>";
        htmlOther += "</table>";
        const htmlFile = path.join(output, "Medikamente.html")
        await fs.writeFile(htmlFile, htmlSkeleton(pat, "Medikamente", htmlFix + htmlOther));
        await htmlToPdf(htmlFile, path.join(outputDir, "Medikamente.pdf"));
        console.log(`Extracted ${all.length} medications for patient ${pat.id}`);

    } catch (err) {
        console.log(err)
    }
}