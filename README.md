# infusion-nexus-gsheets
A Nexus adapter for Google Sheets.

Spreadsheets broadly, and Google Sheets in particular, are a lingua franca for both formal and informal data collection and analysis.
However... what's our however? 

## how to use it
```npm install```
...then what?

<img src="NexusTopology.jpg" width="600px"/>

This is an imagined deployment of the Nexus with this adaptation.
It implies that we are missing functionality in the Nexus API for mirroring (part of) the Nexus component tree in a browser Infusion instance.
It also opens some questions about the practice of programming applications that intermix Infusion components and local-to-the-browser UI components.

## use cases

### make a live visualization of a spreadsheet

### collect streamed data in a spreadsheet

### set up fine-grained data sharing between two spreadsheets

## development plan
 - [x] read data from a spreadsheet
 - [x] make a config file defining aliases for sheets of interest, token location, credentials location
 - [ ] figure out how to distribute the demo. I assume it either needs to work with public sheets, or there should be a user dialog for setting up credentials and either providing a URL or naming the data to go in a sheet
 - [ ] figure out how to package Nexus adapters as grades available to a Nexus instance on startup. Maybe copy Kettle's config functionality?
 - [ ] use Nexus WebSocket API to write something in the console and it is put in a cell in a spreadsheet
 - [ ] make it work bidirectionallity: write something in the cell in the spreadsheet, and it is put in the console
 - [ ] output the csv in the console?
 - [ ] can I keep the authenticated sheets object around so that I don't have to recreate the authorized client for each user action?

Do I depend on the nexus or not?
If I want to start the Nexus server from here, yes.
That means starting a kettle server that hosts a component tree which may be manipulated through the Nexus API.
the existing demos don't actually depend on the nexus? They just assume one will be started elsewhere
what is my ideal setup process?
open the demo, possibly open a google spreadsheet

It seems like we'd need to manually implement polling to get updates in response to sheet content changing.

The goal is to integrate spreadsheets with each other and with other functionality.
Sometimes we mediate this integration in interesting ways.
  - connecting spreadsheets to external data sources to ease the labor of manual data entry
  - connecting spreadsheets to each other to help people share data
  - connecting local spreadsheets to shared spreadsheets to support people using their own preferred interface
  - connecting spreadsheets to visualizations (in some improved ways???)
