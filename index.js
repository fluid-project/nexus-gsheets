var authorize = require('./src/authorize');
var config = require('./config.json');
var fluid = fluid || require('infusion');

/* TODO: use the Nexus WebSocket API to send data to a cell in a sheet
 * what's the setup process for that? 
 * 1. start a Nexus server, 
 * 2. create a grade for cells
 * 3. instantiate a component connected to a cell in a particular sheet
 * 4. set up a WebSocket to the model of that cell, 
 * 5. write a new value, see the value in the sheet
 * 
 * I could depend on a Nexus, but I think that reduces this code's usability as a library.
 * Instead, I _think_ I should simply have the grade definitions in here.
 * But how are they connected to the Nexus?
 * Do I have some setup that runs the PUT requests?
 * How do I "include a grade"?
 * I can't npm install it, I have to either run a setup script,
 * or create a module that is require()'d by users,
 * in which case config should be given info about the nexus server location.
 * 
 * fluid.registerNamespace('sheets', require('infusion-nexus-gsheets'));
 * (don't know if that's the signature)
 * that require executes some code which is parameterized with the config.
 * Issue though, the code must necessarily execute after the server is online...
 * Is there really no way to statically include grades?
 * 
 * This seems like something I might need to add to the Nexus,
 * some functionality for having it actively grab initial configuration on startup.
 * It should naturally be additive, so 
 * It should be equivalent to adding remote <script>s to index.html
 * 
 * Okay so after chat with Antranig, it looks like the topology would be:
 * 
 * browser: runs an Infusion application providing UI. Mirrors part of the Nexus component tree through code that ought really to be part of the standard Nexus API, but was implemented by Antranig for the VisibleNexus demo specifically.
 * 
 * Nexus: hosts HTTP-and-WebSocket-accessible resources such as avatars of google spreadsheets and sensors. Also hosts the relationships between those resources, and creates them via the co-occurrence engine.
 * 
 * sheets.google.com: hosts sheets
 */

 fluid.defaults('fluid.spreadsheets.cell', {
    gradeNames: ['fluid.modelComponent'],
    spreadSheetId: "", // the id of the host spreadsheet, which can be extracted from the URL
    sheetName: "Sheet 1", // the name of the host sheet, defaults to "Sheet 1" in single-sheet spreadsheets
    model: {
        value: null
    },
    listeners: {
        "onCreate.connectToCell": "fluid.spreadsheets.connectToCell"
    }
 });

 // what does this function receive? that?
 fluid.spreadsheets.connectToCell = function(that) {

 }


authorize.doAuthorized(function (sheets) {
    spreadsheetMetadata = config.spreadsheets["P1-google-group-threads"];

    sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetMetadata.id,
        range: 'B2:G'
    }, function (err, res) {
        if (err) throw new Error('The API returned an error ' + err);

        var rows = res.data.values;
        if (rows.length) {
            console.log('Date, Issue:');
            // Print columsn B and D, which correspond to indices 1 and 3
            // relative to the range.
            rows.map(function (row) {
                console.log(`${row[1]}, ${row[3]}`);
            });
        } else {
            console.log('No data found.');
        }
    });
});