var spreadsheets = require('./src/spreadsheets');

// Hypothetical examples of applications using the spreadsheet grades.

/**********************
 * TOY COMPONENT DEMO *
 **********************/

 // This one gives a sense of the ideal structure of a final client,
 // but it doesn't make sense currently, since it isn't clear whether this should exist on the browser or in a Nexus.

 // TODO: add a model listener
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
                sheetName: 'Sheet1',
                coordinate: "F2"
            }
        }
    }
});

fluid.defaults('spreadsheets.valueDisplay', {
    gradeNames: ['fluid.viewComponent'],
})

/*********************
 * MORE REFINED DEMO *
 *********************/

 // In this one, the UI should allow you to specify the URL or ID of the sheet,
 // as well as the coordinate, then display the value you've fetched

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

/**************
 * NEXUS DEMO *
 **************/
// TODO: the below shouldn't create a spreadsheets.cell directly,
// that cell should be created as a Nexus component.
// the client then establishes a WebSocket to the model of that cell,
// which updates the valueDisplay model

// I suppose I can make the POST request from the browser 
// here's what I don't understand, is there an Infusion-y way to request
// that a Nexus server creates a certain component?
// How would Infusion know that a particular component should live in the Nexus
// and only exist here as a mirrored one?
// I guess it could theoretically be done through a mixin grade, like
// nexusClient.mirroredComponent
// that might require a differentiation between local gradeNames and remote gradeNames

// TODO: test the cell sub-component here by itself directly on a running Nexus server
// does this imply I need a direct-translation thing that lets me do
//   nexus.defaults(...) -> emit a PUT
//   nexus.construct(...) -> emit a POST
//   nexus.connect(...) -> create an interactive prompt with readline
// just so constructNexusPeers-esque scripts can at least be easy to write

// I don't understand how viewComponents are attached to HTML
// I need to set up the rendering bit, and then the model relay from a cell
// well ACTUALLY, I need to 
//    . set up the view rendering bit (no clue whether that's changed in FLUID-6145 Infusion)
//      basic tutorial is here  https://docs.fluidproject.org/infusion/development/tutorial-developerIntroduction/DeveloperIntroductionToInfusionFramework-ViewsAndViewComponents.html
//    . create the cell on the Nexus server
//      for now, just use a constructNexusPeers script
//    . set up a WebSocket connection from index.html to the Nexus server, fetching the value of the cell
//    . update the view