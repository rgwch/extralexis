# Lab Results PDF Generator

This module provides comprehensive PDF generation capabilities for lab results, optimized for medical data presentation with proper pagination and formatting.

## Features

- **Optimized Layout**: Specifically designed for wide lab result tables
- **Multiple Page Formats**: Support for A3, A4, Letter, and Legal sizes
- **Orientation Options**: Portrait and landscape orientations
- **Smart Pagination**: Automatic page breaks that preserve table structure
- **Enhanced Typography**: Medical-grade formatting with proper fonts and spacing
- **Batch Processing**: Convert multiple files at once
- **Direct JSON-to-PDF**: Skip HTML generation step

## Usage Examples

### 1. Generate PDF from HTML file
```bash
npm run generate-pdf "./path/to/labor_results.html"
```

### 2. Generate PDF from JSON file (recommended)
```bash
npm run generate-pdf "./path/to/labor_results.json"
```

### 3. Custom format and orientation
```bash
npm run generate-pdf "./labor.json" "./output.pdf" --format A4 --orientation portrait
```

### 4. Batch convert entire directory
```bash
npm run generate-pdf --dir "./data/patient/" --format A3 --orientation landscape
```

### 5. Using in code
```typescript
import { generateLabResultsPdf, generateLabPdfFromJson } from './src/plugins/lab-pdf';

// From HTML file
await generateLabResultsPdf('input.html', 'output.pdf', {
    format: 'A3',
    orientation: 'landscape',
    scale: 0.8
});

// From JSON file (generates HTML automatically)
await generateLabPdfFromJson('input.json', 'output.pdf', {
    format: 'A4',
    orientation: 'portrait'
});
```

## Configuration Options

### PdfOptions Interface
```typescript
interface PdfOptions {
    format?: 'A4' | 'A3' | 'Letter' | 'Legal';    // Default: 'A3'
    orientation?: 'portrait' | 'landscape';        // Default: 'landscape'
    margins?: {
        top?: string;      // Default: '15mm'
        right?: string;    // Default: '10mm'
        bottom?: string;   // Default: '15mm'
        left?: string;     // Default: '10mm'
    };
    printBackground?: boolean;  // Default: true
    scale?: number;            // Default: 0.8 (80%)
}
```

## Recommended Settings by Use Case

### For Detailed Review (Maximum Information)
```typescript
{
    format: 'A3',
    orientation: 'landscape',
    scale: 0.7,
    margins: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' }
}
```

### For Standard Medical Records
```typescript
{
    format: 'A4',
    orientation: 'landscape',
    scale: 0.8,
    margins: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' }
}
```

### For Archival/Filing
```typescript
{
    format: 'A4',
    orientation: 'portrait',
    scale: 0.9,
    margins: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
}
```

## Automatic Integration

When you extract lab results using the main extraction process, PDFs are now automatically generated alongside JSON, CSV, and HTML files:

```
Labor/
├── labor_patientid.json  ← Raw data
├── labor_patientid.csv   ← Spreadsheet format
├── labor_patientid.html  ← Interactive table
└── labor_patientid.pdf   ← Print-ready document
```

## PDF Optimizations

### Typography
- **Font Size**: Optimized for readability (8-10px)
- **Line Height**: Compressed for maximum data density
- **Font Family**: Arial for consistent rendering

### Layout
- **Sticky Headers**: Parameter names and dates remain visible
- **Rotated Date Headers**: Space-efficient date display
- **Zebra Striping**: Alternating row colors for easy reading
- **Smart Breaks**: Prevents table rows from splitting across pages

### Page Structure
- **Header**: Patient info and generation timestamp
- **Footer**: Page numbers and generation date
- **Margins**: Optimized for medical record standards
- **Scale**: Adjustable to fit content preferences

## Troubleshooting

### PDF Generation Fails
- Ensure Puppeteer is properly installed
- Check that input files exist and are readable
- Verify output directory is writable

### Table Doesn't Fit
- Try A3 format instead of A4
- Use landscape orientation
- Reduce scale factor (e.g., 0.6)
- Increase margins if content is cut off

### Performance Issues
- Use batch processing for multiple files
- Close other applications to free memory
- Consider processing files in smaller batches

## Technical Details

The PDF generator uses Puppeteer with Chrome headless to render HTML content. Special CSS styles are injected to optimize the layout for print media:

- **Page Size Detection**: Automatically adjusts content to page dimensions
- **Print Media Queries**: Special styles for PDF output
- **Table Optimization**: Prevents awkward page breaks
- **Font Rendering**: Ensures consistent appearance across systems

## Integration with Existing Workflow

The PDF generator integrates seamlessly with your existing lab extraction process:

1. **Data Extraction**: Lab results pulled from database
2. **JSON Generation**: Raw data saved for processing
3. **CSV Export**: Spreadsheet-compatible format
4. **HTML Table**: Interactive web view
5. **PDF Generation**: Print-ready medical document ← **New!**

All formats are generated automatically during the extraction process, giving you multiple output options for different use cases.