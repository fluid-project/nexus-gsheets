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

/*******************
 * MOST BASIC DEMO *
 *******************/

fluid.defaults("spreadsheets.demo", {
    gradeNames: ['fluid.viewComponent'],
    selectors: {
        main: "",
        valueDisplay: ""
    },
    container: "{that}.dom.main",
    components: {
        valueDisplay: {
            type: 'spreadsheets.valueDisplay',
        },
        cell: {
            type: 'spreadsheets.cell',
            options: {
                spreadsheetId: "1DOUq58pEHp66LdVaVdEMtO8jMpHe7iuO6MKREXfm9e4",
                coordinate: "F2",
                container: "{demo}.dom.valueDisplay"
            }
        }
    }
});

// I don't understand how viewComponents are attached to HTML
// I need to set up the rendering bit, and then the model relay from a cell
// well ACTUALLY, I need to 
//    . set up the view rendering bit (no clue whether that's changed in FLUID-6145 Infusion)
//      basic tutorial is here  https://docs.fluidproject.org/infusion/development/tutorial-developerIntroduction/DeveloperIntroductionToInfusionFramework-ViewsAndViewComponents.html
//    . create the cell on the Nexus server
//    . set up a WebSocket connection from index.html to the Nexus server, fetching the value of the cell
//    . update the view
fluid.defaults('spreadsheets.valueDisplay', {
    gradeNames: ['fluid.viewComponent'],
})

/*********************
 * MORE REFINED DEMO *
 *********************/

 // In this one, the UI should allow you to specify the URL or ID of the sheet,
 // as well as the coordinate, then display the value you've fetched

/**********************
 * SPREADSHEET GRADES *
 **********************/

var spreadsheets = fluid.registerNameSpace('spreadsheets');

 fluid.defaults('spreadsheets.cell', {
    gradeNames: ['fluid.modelComponent'],
    spreadSheetId: "", // the id of the host spreadsheet, which can be extracted from the URL
    sheetName: "Sheet 1", // the name of the host sheet, defaults to "Sheet 1" in single-sheet spreadsheets
    coordinate: "A1", // the coordinate of the cell in the host sheet
    model: {
        value: null
    },
    listeners: {
        "onCreate.connectToCell": "spreadsheets.connectToCell"
    }
 });

// module.exports = spreadsheets;

 // what does this function receive? that?
 fluid.spreadsheets.connectToCell = function(that) {
    // this should inherit the grade of async data sources
    // doAuthorized a function that grabs the value of the cell at cellPosition,
    // and puts it in value
    // Since that function itself is async, I don't know if it can just be thrown
    // in an onCreate listener, but I should just find an example of Antranig
    // using the new grade
 }

 // based on the range, gives a properly dimensioned model
// actually the component ought to be specified so it can contain
// a number of child queries into the same spreadsheet,
// whether ranges or single cells
// the point of this is that it gets to reuse the authorized client,
// and it implies a flow where specifying the sheet and specifying where your attention
// is in it are separate steps, and one of them happens more often than the other.
 fluid.defaults('spreadsheets.sheetRange', {
 
 });

 // does a paginated resource extend downwards, keeping everything in memory,
 // or does it remove the previous material, assuming it's on the client to
 // garbage collect or memorize that state?
 // could I adapt a grade written one way into one written the other way,
 // in both directions?
 fluid.defaults('spreadsheets.paginatedSheet', {
     events: {
         nextPage: null,
         previousPage: null
     },
     listeners: {
        'nextPage.loadNextPage': "",
        'previousPage.loadPreviousPage': ""
     }
 })

