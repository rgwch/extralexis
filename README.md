# Extralexis - Extract data from Elexis

This tool extracts relevant patient data from the [Elexis](http://www.elexis.ch) EMR system into different files for human reading (ODT, PDF, HTML) and for automated processing (JSON, CSV, XML).

Patients can receive these files on a USB stick or CD to hand them out to other doctors, e.g., when changing doctors or if the family doctor closes their practice.

Currently, the tool extracts:

* Patient personal details
* Outgoing letters
* Incoming documents from Omnivore and Lucinda
* Encounter texts
* Lab values
* Vaccinations
* Findings (from the original "Befunde" plugin)
* Medications

You can easily add extractors for your own Elexis plugins.

## Prerequisites

* Node 22
* Java 17 

## Install

```bash
git clone https://github.com/rgwch/extralexis
cd extralexis
npm i
```
Then, copy .env.copy to .env (or to extralexis.cfg) and change the values to match your own system and the data types you want to include in the export.

## Usage

### Helper Service

Because Elexis uses some data structures that are very Java-specific, we need a converter service to extract this data into an exportable format. This helper service is in the elexis_converter_x.x.x.jar which is launched automatically at the beginning of the script and terminated at the end. This service requires Java version 17 or higher. By default, it needs port 8080 to be available.

### Main program

Build the program with `npm run build`

and launch it with `node dist/index.js <options>`

where possible options are:

* -s x or --skip x: start with the x-th patient
* -n x or --number x: extract x patients (starting from -s)
* -p x or --patid x: extract only the patient with PatientNr x
* -d or --data: extract patients by identifier lastname,firstname,birthdate. e.g., `testperson,armeswesen,1.2.1950` or `testperson` or `,armeswesen` or `,,1.2.1950`. Will extract all matching patients.  
* -a or --all: extract all patients (can take a very long time)

After processing, there will be a subdirectory in the declared output directory for every matched patient. Data is provided in .json, .csv, .html, .odt, .xml, or .pdf format, as appropriate.

### Troubleshooting

In newer Ubuntu distributions, PDF generation may fail because [Puppeteer](https://github.com/puppeteer/puppeteer) (the library used as PDF generator) can't launch its unsecured Chrome browser. You can disable this temporarily with `echo 0 | sudo tee /proc/sys/kernel/apparmor_restrict_unprivileged_userns` until the next boot, or until you enter `echo 1 | sudo tee /proc/sys/kernel/apparmor_restrict_unprivileged_userns`

Alternatively, and probably more convenient: You can install an official version of the [Chrome Browser](https://www.google.com/intl/de/chrome/) or the [Chromium Browser](https://www.chromium.org/getting-involved/download-chromium/). If Puppeteer finds such an instance of Chrome or Chromium, it will use that.

## Standalone

If you have installed [bun](https://bun.sh/), you can create a standalone program: `bun install`, then `bun run standalone` will create a single executable that runs on computers without Node.js or Bun installed. You'll still need elexis_converter_x.y.z.jar in the same directory as the executable (and Java 17 installed, but if you are using Elexis, this will probably already be available).
As a convenience, the [releases](https://github.com/rgwch/extralexis/releases/) have such executables ready for download. 

**Important for PDF generation:** The standalone executable requires Chrome or Chromium to be installed on the target system for PDF generation to work. If Chrome is not found, you may need to:
- Install Google Chrome on the target system, or
- Run `npx puppeteer browsers install chrome` in the same directory as the executable

You can create an 'extralexis.cfg' file with the same contents as described in .env.copy. On startup, Extralexis will look for such a file and parse it if found. Values in that file will override environment values.

The script `deployment.sh` will create Extralexis executables for Linux-x64, Windows-x64, Mac-x64, and Mac-arm64 systems.

## Security considerations

* Extralexis makes only read requests to the database.
* The Helper Service is of course OpenSource as well: [rgw-utility](https://gitlab.com/rgwch/ch.rgw.utility/-/tree/webservice?ref_type=heads), whis was originally part of Elexis.

## No Warranty

You can use this program free of charge and you may modify it as you like. Please note:

THE PROGRAM IS PROVIDED ON AN “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED INCLUDING, WITHOUT LIMITATION, ANY WARRANTIES OR CONDITIONS OF TITLE, NON-INFRINGEMENT, MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Each Recipient is solely responsible for determining the appropriateness of using and distributing the Program and assumes all risks associated with its exercise of rights under this Agreement, including but not limited to the risks and costs of program errors, compliance with applicable laws, damage to or loss of data, programs or equipment, and unavailability or interruption of operations. 


## Acknowledgement

Parts of this program were created or improved by Github Copilot (Claude Sonnet 4).
