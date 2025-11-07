import puppeteer from 'puppeteer'
import fs from 'fs/promises';
import path from 'path'

export async function htmlToPdf(htmlFilePath, outputPdfPath) {
    await fs.copyFile(htmlFilePath, path.join(process.cwd(), "infile.html"));
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`file://${path.join(process.cwd(), "infile.html")}`, { waitUntil: 'networkidle0' });
    await page.pdf({
        path: outputPdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    await browser.close();
    await fs.unlink(path.join(process.cwd(), "infile.html"));
}