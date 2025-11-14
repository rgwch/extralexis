import fs from 'fs/promises';
import path from 'path';
import { db } from '../index';
import { elexisDateToDateString, elexisDateToISODate, normalize, htmlSkeleton } from '../util';

export async function extractMedication(patId: string, outputDir: string) {
    try {
        const meds: Array<any> = await db("patient_artikel_joint").where({ presctype: 0, patientid: patId })
        for (const med of meds) {
            let art = null
            if (med.artikelid) {
                art = await db("artikel").where({ id: med.artikelid })
            } else if (med.artikel) {
                const ident = med.artikel.split("::")
                art = await db("artikelstamm_ch").where({ id: ident[ident.length - 1] })
            } else {
                continue;
            }
            const name=art[0].dscr ?? art[0].name
            const dateFrom=med.datefrom
            const dateUntil=med.dateuntil;
            const prescdate=med.prescdate;
            const presctype=med.presctype;
            const dosis=med.dosis
            console.log(art)
        }
    } catch (err) {
        console.log(err)
    }
}