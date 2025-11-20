# Extralexis - Extract data from Elexis

This tool is for doctors using the [Elexis](http://www.elexis.ch) EMR system who are closing their medical practice. It extracts relevant patient data into separate directories in human-readable form. 
These directories can easily be copied to a USB stick or burned to a CD to hand them out directly to the patient.

You can also use this tool to extract data for only one patient - e.g., someone who is changing doctors.

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
Then, copy .env.sample to .env and change the values to match your own system and the data types you want to include in the export.

## Usage

### Helper Service

Because Elexis uses some data structures that are very Java-specific, we need a converter service to extract this data into an exportable format. This helper service is in the elexis_converter_x.x.x.jar which is launched automatically ad the beginning of the script and terminated after the end. This service depends on Java at least version 17. 

### Main program

Build the program with `npm run build`

and launch it with `node dist/index.js <options>`

where possible options are:

* -s x or --skip x: start with the x-th patient
* -n x or --number x: extract x patients (starting from -s)
* -p x or --patid x: extract only the patient with PatientNr x
* -d or --data: extract patients by identifier lastname,firstname,birthdate. e.g. `testperson,armeswesen,1.2.1950` or `testperson` or `,armeswesen` or `,,1.2.1950`. Will extract all matching patients.  
* -a or --all: extract all patients (can take a very long time)

After processing, there will be a subdirectory in the directory declared with "output" in .env for every matched patient. Data is provided in .json, .csv, .html, or .pdf format, as appropriate.

### Troubleshooting

In newer Ubuntu distributions, PDF generation may fail because Puppeteer can't launch its unsecured Chrome browser. You can disable this temporarily with `echo 0 | sudo tee /proc/sys/kernel/apparmor_restrict_unprivileged_userns` until the next boot, or until you enter `echo 1 | sudo tee /proc/sys/kernel/apparmor_restrict_unprivileged_userns`

### Wrapper

For Linux Systems, there's a simple wrapper to launch the converter, modify AppArmor and export: `./run.sh -p 1234` will set AppArmor restrictions to 0, launch `node dist/index.js -p 1234`, and reset the AppArmor restrictions to 1. 

## Acknowledgement

Parts of this program were created or improved by Github Copilot (Claude Sonnet 4).
