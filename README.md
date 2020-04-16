# infusion-nexus-gsheets
A Nexus adapter for Google Sheets.

Spreadsheets broadly, and Google Sheets in particular, are a lingua franca for both formal and informal data collection and analysis.
However... what's our however? 

## How to use nexus-gsheets as a development library
(If you want to develop Infusion/Nexus applications that interact with Google spreadsheets.)

### Installing the library
```npm install```
...then what?
Since this should be distributed simply as some grades, I should indicate how those grades might be put to use by reference to a demo project where those grades are actually deployed on a nexus.

### Deploying spreadsheet integrations
<img src="NexusTopology.jpg" width="600px"/>

This is an imagined deployment of the Nexus with this adaptation.
It implies that we are missing functionality in the Nexus API for mirroring (part of) the Nexus component tree in a browser Infusion instance.
It also opens some questions about the practice of programming applications that intermix Infusion components and local-to-the-browser UI components.

### Addressing spreadsheets
Google spreadsheets are adressed by a combination of a spreadsheetId, sheetName, and a range or coordinate in A1 notation.
The spreadsheetId is the alphanumeric identifier found in the URL for a spreadsheet, e.g. in `https://docs.google.com/spreadsheets/d/1B2769NqCW1yBlP_eT6kQ5iRBM1cbYyhB_0paDgNT6dk/` the spreadsheetId is `1B2769NqCW1yBlP_eT6kQ5iRBM1cbYyhB_0paDgNT6dk`.
The sheetName is the identifier of a single 'tab' within the spreadsheet. It can be set by the user. The default value for the single tab in a new spreadsheet is `Sheet1`.
A coordinate is written as a combination of letters referring to the column and a number referring to the row, e.g. `A1` for the top left cell.
A range is written as two coordinates with a colon between them, e.g. `A1:B2` is the square of four cells at the top left of a spreadsheet.
The first coordinate in a range must be in a lower column or row than the second coordinate.
In API functions, the sheetName and coordinate/range are combined in one string, written `{sheetName}!{coordinate/range}`, e.g. `Sheet1!A1:B2`

## Things you can make with nexus-gsheets

### make a live visualization of a spreadsheet

### collect streamed data in a spreadsheet

### set up fine-grained data sharing between two spreadsheets

## development plan
 - [x] read data from a spreadsheet
 - [x] make a config file defining aliases for sheets of interest, token location, credentials location
 - [x] write data to a spreadsheet
 - [ ] use Nexus WebSocket API to write something in the console and it is put in a cell in a spreadsheet
 - [ ] figure out how to package Nexus adapters as grades available to a Nexus instance on startup. Maybe copy Kettle's config functionality?
 - [ ] make a mock of the google sheets oAuth2 client object, extending as you use it, for testing. Note that the mock must also be asynchronous
 - [ ] figure out how to distribute the demo. I assume it either needs to work with public sheets, or there should be a user dialog for setting up credentials and either providing a URL or naming the data to go in a sheet

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

## what should be tested
 - creation of grades and showing that the models contain the expected results