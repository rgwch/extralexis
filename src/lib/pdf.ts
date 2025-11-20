import puppeteer from 'puppeteer'
import fs from 'fs/promises';
import path from 'path'

async function findChromePath(): Promise<string | undefined> {
    const possiblePaths = [
        // Windows paths
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        // macOS paths
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        // Linux paths
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium'
    ];

    for (const chromePath of possiblePaths) {
        try {
            await fs.access(chromePath);
            return chromePath;
        } catch {
            // Continue to next path
        }
    }
    
    return undefined;
}

export async function htmlToPdf(htmlFilePath: string, outputPdfPath: string) {
    await fs.copyFile(htmlFilePath, path.join(process.cwd(), "infile.html"));
    
    let launchOptions: any = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    // Try to find system Chrome first
    const chromePath = await findChromePath();
    if (chromePath) {
        console.log(`Using system Chrome at: ${chromePath}`);
        launchOptions.executablePath = chromePath;
    } else {
        console.log('System Chrome not found, using bundled Chromium (may require download)');
        // Let Puppeteer handle downloading Chromium if needed
        try {
            // First try without specifying executable path
        } catch (error) {
            console.error('Failed to launch browser:', error);
            throw new Error('Could not launch browser. Please install Chrome or run: npx puppeteer browsers install chrome');
        }
    }

    const browser = await puppeteer.launch(launchOptions);
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