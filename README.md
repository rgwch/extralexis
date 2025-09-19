# Extralexis - Extract data from elexis

This tool is for doctors uing the [Elexis](http://www.elexis.ch) EMR system, who are giving up their medical practice. It extracts relevant data of the patients into separate directories in human readable form. 
Such directories can easily be copied on a stick or burned on a CD to hand them out directly to the patient.

You can also use this tool to extract only one patient - e.g. someone who changes the doctor.

At this time, the tool copies 

* Patient's personal details
* outgoing letters
* incoming documents from omnivore and lucinda
* encounter texts
* lab values
* vaccinations

But you can easily add extractors for your own Elexis-plugins.

## Prerequisites

* Node 22
* Java 17 (Only if you want to export encounter texts)

## Install

```bash
git clone https://github.com/rgwch/extralexis
cd extralexis
npm i
```
then, copy .env.copy to .env and change the values to match your own system

## Usage

If you want to extract encounter texts (i.e. you have included "kons" in the handlers list in .env), then you need to launch the elexis converter service to convert the Samdas entries to html:

* Make sure you have installed java17
* run java -jar elexis_converter_x.x.x.jar

Then, build the program with `npm run build`

and launch with `node dist/index.js <options>`

where possible options are:

* -s x or --skip x: start with x'th patient
* -n  x or --number x: extract x patients (starting from -s)
* -p x or --patid x: extract only patient with PatientNr x
* -a or --all: extraxt all patients (can take very long time)

After processing, there will be a subdirectory in the directory declared with "output" in .env for every matched patient.

