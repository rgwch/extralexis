import fs from 'fs/promises';
import path from 'path';
import { db } from '../index';
import { elexisDateToDateString, elexisDateToISODate, normalize } from '../util';

export async function extractMedication(patId: string, outputDir: string) {
    try {
        const meds = await db("patient_artikel_joint").where({ presctype: 0, patientid: patId })
    } catch (err) {
        console.log(err)
    }
}