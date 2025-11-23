import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { PdfOptions, findChromePath } from '../lib/pdf';



/**
 * Enhanced PDF generator specifically optimized for lab results tables
 */
export async function generateLabResultsPdf(htmlFilePath: string, outputPdfPath: string, options: PdfOptions = {}): Promise<void> {
    const defaultOptions: Required<PdfOptions> = {
        format: 'A3', // A3 is better for wide lab tables
        orientation: 'landscape', // Landscape fits more columns
        margins: {
            top: '10mm',
            right: '5mm',  // Reduced right margin
            bottom: '10mm',
            left: '5mm'    // Reduced left margin
        },
        printBackground: true,
        scale: 0.7 // Smaller scale to fit more content
    };
    let chromePath = await findChromePath();

    const finalOptions = { ...defaultOptions, ...options };
    if (chromePath && process.env.NODE_ENV !== 'debug') {
        // console.log(`Using system Chrome at: ${chromePath}`);
    } else {
        chromePath = undefined
        console.log('System Chrome not found, using bundled Chromium (may require download)');
    }
    // Ensure output directory exists
    const outputDir = path.dirname(outputPdfPath);
    await fs.mkdir(outputDir, { recursive: true });

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ...(chromePath ? { executablePath: chromePath } : {})
    });

    try {
        const page = await browser.newPage();

        // Set viewport for better rendering of wide tables
        await page.setViewport({ width: 2000, height: 1400 });

        // Read and modify HTML for better PDF rendering
        const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
        const { scale: calculatedScale } = calculateColumnWidth(htmlContent);

        // Use calculated scale if not explicitly overridden
        if (!options.scale) {
            finalOptions.scale = calculatedScale;
        }

        const enhancedHtml = enhanceHtmlForPdf(htmlContent);

        // Write enhanced HTML to temporary file
        const tempHtmlPath = path.join(process.cwd(), `temp_${Date.now()}.html`);
        await fs.writeFile(tempHtmlPath, enhancedHtml);

        // Load the page
        await page.goto(`file://${tempHtmlPath}`, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Generate PDF with enhanced options
        await page.pdf({
            path: outputPdfPath,
            format: finalOptions.format,
            landscape: finalOptions.orientation === 'landscape',
            printBackground: finalOptions.printBackground,
            margin: finalOptions.margins,
            scale: finalOptions.scale,
            preferCSSPageSize: true
        });

        // Clean up temp file
        await fs.unlink(tempHtmlPath);

        console.log(`PDF generated successfully: ${outputPdfPath}`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

/**
 * Calculate optimal column width based on number of date columns
 */
function calculateColumnWidth(htmlContent: string): { dateWidth: string, scale: number } {
    // Count date columns by looking for date-header classes
    const dateHeaderMatches = htmlContent.match(/class="date-header"/g);
    const dateColumnCount = dateHeaderMatches ? dateHeaderMatches.length : 0;

    // Fixed columns take roughly 260px (120+60+80)
    // A3 landscape at 0.7 scale has roughly 1000px usable width
    const availableWidth = 1000 - 260;
    const dateWidth = Math.max(20, Math.floor(availableWidth / dateColumnCount));

    // If we need very narrow columns, reduce scale further
    let scale = 0.7;
    if (dateWidth < 25) {
        scale = 0.6;
    }
    if (dateWidth < 20) {
        scale = 0.5;
    }

    return {
        dateWidth: `${dateWidth}px`,
        scale
    };
}

/**
 * Enhance HTML content for better PDF rendering
 */
function enhanceHtmlForPdf(htmlContent: string): string {
    // Calculate optimal column widths
    const { dateWidth, scale } = calculateColumnWidth(htmlContent);

    // Add PDF-specific CSS for better page breaks and printing
    const pdfStyles = `
    <style type="text/css" media="print">
        @page {
            size: A3 landscape;
            margin: 10mm 5mm;
        }
        
        body {
            margin: 0;
            padding: 0;
            font-size: 9px;
            line-height: 1.1;
            overflow-x: visible;
        }
        
        .container {
            margin: 0;
            padding: 5px;
            box-shadow: none;
            width: 100%;
            max-width: none;
        }
        
        h1 {
            font-size: 18px;
            margin-bottom: 10px;
            page-break-after: avoid;
        }
        
        .info {
            font-size: 10px;
            margin-bottom: 10px;
            page-break-after: avoid;
        }
        
        table {
            width: 100%;
            font-size: 7px;
            page-break-inside: avoid;
            table-layout: auto;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 2px 4px;
            border: 0.5px solid #ddd;
            font-size: 7px;
            word-break: break-word;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        th {
            background-color: #f0f0f0 !important;
            font-weight: bold;
            page-break-after: avoid;
            page-break-inside: avoid;
        }
        
        .fixed-column, .einheit-column, .referenz-column {
            position: static !important;
            left: auto !important;
            background-color: #f9f9f9 !important;
        }
        
        .fixed-column {
            width: 120px;
            max-width: 120px;
            min-width: 120px;
        }
        
        .einheit-column {
            width: 60px;
            max-width: 60px;
            min-width: 60px;
        }
        
        .referenz-column {
            width: 80px;
            max-width: 80px;
            min-width: 80px;
        }
        
        .date-header {
            writing-mode: horizontal-tb !important;
            text-orientation: initial !important;
            font-size: 6px;
            transform: rotate(-45deg);
            white-space: nowrap;
            height: 50px;
            vertical-align: bottom;
            width: ${dateWidth};
            max-width: ${dateWidth};
            min-width: ${dateWidth};
        }
        
        .value-cell {
            font-family: Arial, sans-serif;
            font-size: 7px;
            text-align: center;
            width: ${dateWidth};
            max-width: ${dateWidth};
            min-width: ${dateWidth};
        }
        
        .empty-cell {
            background-color: #f8f8f8 !important;
        }
        
        /* Ensure table doesn't break across pages poorly */
        tbody tr {
            page-break-inside: avoid;
        }
        
        /* Add page breaks for very long tables */
        tbody tr:nth-child(25n) {
            page-break-after: auto;
        }
        
        /* Footer with page info */
        .pdf-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 8px;
            color: #666;
            padding: 5px;
        }
    </style>
    `;

    // Insert PDF styles before closing head tag
    const enhancedHtml = htmlContent.replace('</head>', pdfStyles + '</head>');

    // Add footer
    const footerHtml = `
    <div class="pdf-footer">
        Laborergebnisse - Generiert am ${new Date().toLocaleDateString('de-DE')}
    </div>
    `;

    return enhancedHtml.replace('</body>', footerHtml + '</body>');
}

/**
 * Generate PDF from lab results JSON directly
 */
export async function generateLabPdfFromJson(jsonFilePath: string, outputPdfPath: string, options: PdfOptions = {}): Promise<void> {
    const { generateLabResultsHTML } = await import('./lab-html');

    // Generate temporary HTML file
    const tempHtmlPath = jsonFilePath.replace('.json', '_temp.html');
    await generateLabResultsHTML(jsonFilePath, tempHtmlPath);

    try {
        // Generate PDF from HTML
        await generateLabResultsPdf(tempHtmlPath, outputPdfPath, options);
    } finally {
        // Clean up temporary HTML file
        try {
            await fs.unlink(tempHtmlPath);
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

/**
 * Batch convert multiple lab result files to PDF
 */
export async function batchGenerateLabPdfs(inputDir: string, options: PdfOptions = {}): Promise<void> {
    const laborDir = path.join(inputDir, 'Labor');

    try {
        const files = await fs.readdir(laborDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        for (const jsonFile of jsonFiles) {
            const jsonPath = path.join(laborDir, jsonFile);
            const pdfFile = jsonFile.replace('.json', '.pdf');
            const pdfPath = path.join(laborDir, pdfFile);

            console.log(`Converting ${jsonFile} to PDF...`);
            await generateLabPdfFromJson(jsonPath, pdfPath, options);
        }

        console.log(`Successfully converted ${jsonFiles.length} files to PDF`);
    } catch (error) {
        console.error('Error in batch PDF generation:', error);
        throw error;
    }
}