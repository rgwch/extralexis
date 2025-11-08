# Extralexis Codebase Instructions

## Project Overview
Extralexis is a medical data extraction tool for doctors closing their practice who use the Elexis EMR system. It extracts patient data from MySQL databases into human-readable formats (JSON, CSV, HTML, PDF) for patient handoff.

## Architecture Components

### Core System (`src/index.ts`, `src/patient.ts`)
- **Database Layer**: Uses Knex.js with MySQL2 for Elexis database queries
- **Extraction Pipeline**: Processes patients in batches or individually via CLI options
- **Plugin System**: Dynamic imports based on `.env` handlers configuration
- **Output Structure**: Creates patient directories like `"Lastname_Firstname_DD.MM.YYYY_(PatientNr)"`

### Plugin Architecture (`src/plugins/`)
Each plugin follows this pattern:
```typescript
export async function extractPluginName(patId: string, outputDir: string) {
    // 1. Query Elexis database tables specific to plugin
    // 2. Transform data using src/util.ts helpers
    // 3. Generate multiple output formats (JSON/CSV/HTML/PDF)
    // 4. Save to plugin-specific subdirectory
}
```

### External Dependencies
- **Java Converter Service**: Required for Elexis-specific data formats (VersionedResource, SAMDAS text, Compex)
  - Start with: `java -jar elexis_converter_x.x.x.jar`
  - Converts proprietary formats to readable text via HTTP API
- **Puppeteer**: PDF generation from HTML (may need AppArmor fixes on Ubuntu)

## Key Data Transformations

### Elexis Date Format
```typescript
// Elexis stores dates as YYYYMMDD strings
elexisDateToDateString("20231108") → "08.11.2023"
elexisDateToISODate("20231108") → "2023-11-08"
```

### Database Normalization
```typescript
normalize(dbResult) // Converts null to "", lowercases all keys
```

### Rich Text Processing
- **VersionedResource**: Binary blob → base64 → converter service → plain text
- **SAMDAS**: Elexis rich text → @rgwch/samdastools → HTML
- **Compex**: Compressed XML → converter service → readable text

## Build & Development Workflows

### Development Commands
```bash
npm run dev          # Build + run with debug env
npm run single       # Extract single test patient (ID=2)
npm run build        # Compile TypeScript + copy CSS
npm run start        # Production build + run
```

### Standalone Utilities
```bash
npm run generate-html <json-file>  # Convert lab JSON to HTML table
npm run generate-pdf <html-file>   # Convert HTML to optimized PDF
npx ts-node test-pdf-settings.ts   # Test different PDF layouts
```

### Configuration
- Copy `.env.copy` to `.env` and configure:
  - Database connection (MySQL Elexis instance)
  - Output directory path
  - Handlers list (comma-separated plugin names)
  - Converter service URL
  - Document paths for file-based plugins

## Plugin Development Patterns

### Database Queries
Most plugins use patient-linked queries:
```typescript
await db("table_name").where({ patientid: patId }).whereNot("deleted", "1")
```

### Multi-Format Output
Standard pattern generates 4 formats:
1. **JSON**: Raw structured data
2. **CSV**: Spreadsheet-compatible
3. **HTML**: Interactive web view with styling
4. **PDF**: Print-optimized (A3 landscape for wide tables)

### Error Handling
- Plugins should handle missing data gracefully (return early if no results)
- Use try-catch for external service calls (converter, file operations)
- Log patient ID context in error messages

## Medical Data Specifics

### Lab Results Special Features
- Dynamically calculates optimal PDF column widths based on date count
- Chronological sorting with German date format
- Aggregates results by lab parameter across dates
- Sticky headers for wide table navigation

### HTML Styling (`src/default.css`)
- Medical-grade typography with professional styling
- Responsive design for various screen sizes
- Print-optimized CSS for PDF generation
- Color-coded sections and alternating table rows

## Critical Integration Points

### MySQL Elexis Schema
Key tables: `kontakt` (patients), `behandlungen` (encounters), `laborwerte` (lab results), `faelle` (cases)
- Soft deletes via `deleted` field (exclude with `whereNot("deleted", "1")`)
- Patient linking via `patientid` foreign keys
- Date fields stored as YYYYMMDD strings

### File System Organization
Output structure mirrors medical practice workflows:
```
PatientName_Surname_DD.MM.YYYY_(Nr)/
├── Deckblatt.pdf           # Patient summary
├── Labor/                  # Lab results in all formats  
├── Briefe/                 # Outgoing correspondence
├── Befunde/               # Findings and reports
└── Rohdaten/              # Raw technical data
```

This structure enables easy patient data handoff on physical media.