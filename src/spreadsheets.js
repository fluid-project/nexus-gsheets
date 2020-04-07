// TODO: consider changing authorize to an oAuth grade
var authorize = require('./src/authorize');
var config = require('./config.json');
var fluid = fluid || require('infusion');

/**********************
 * SPREADSHEET GRADES *
 **********************/

 /*
  * These grades are meant to created on Nexus servers using the Nexus API.
  * 
  * 
  */

var spreadsheets = fluid.registerNameSpace('spreadsheets');

module.exports = spreadsheets;

// TODO: make this a fluid.dataSource, I think
// onCreate, start the session,
// then have an invoker for sending calls to the session
// yeah, seems like it should be a dataSource, considering
// the API returns asynchronously
fluid.defaults('spreadsheets.oAuthSession', {
    gradeNames: ['fluid.component'],
    events: {
        onResolve: null,
        onError: null
    },
    listeners: {
        'onCreate.impl': 'spreadsheets.oAuthSession.doCreate',
        'onRead.impl': 'spreadsheets.oAuthSession.doRead',
    }
});

spreadsheets.oAuthSession.doCreate = function(that) {
    // TODO
    // . get and parse credentials from file (can fail)
    // . create a new google.auth.oAuth2 with data from credentials
    // . get and parse session token from file (can fail)
    // . call oAuth2.setCredentials with the parsed token
    // . create a google.sheets({version: 'v4', auth: oAuth2Client})
    // on failures, trigger that.events.onError
}

// For executing the client read, I wonder what is most faithful to the REST request idiom
// options:
// send search specification as
//   1. parameter list
//   2. parameter object (can Infusion resolve IoC refs in an object given as args?)
//   3. members on the session
// I think parameter object is most faithful to the notion of a request body
// for now I can just do an array

/**
 * Executes a call to spreadsheets.values.get
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
 * @param {String} spreadSheetId the id of the host spreadsheet, which can be extracted from its URL
 * @param {String} sheetName the name of the host sheet, defaults to "Sheet 1" in single-sheet spreadsheets
 * @param {String} range the range of values to get, expressed in A1 notation
 * @fires spreadsheets.oAuthSession.onResolve
 * @fires spreadsheets.oAuthSession.onError
 */
spreadsheets.oAuthSession.doRead = function(spreadsheetId, sheetName, range) {
    // TODO:
}

// component for reading a single cell once
fluid.defaults('spreadsheets.cell', {
   gradeNames: ['fluid.modelComponent'],
   spreadSheetId: '', // the id of the host spreadsheet, which can be extracted from the URL
   sheetName: 'Sheet 1', // the name of the host sheet, defaults to "Sheet 1" in single-sheet spreadsheets
   coordinate: 'A1', // the coordinate of the cell in the host sheet
   model: {
       value: null // is replaced with the cell content on creation
   },
   components: {
       session: {
           type: 'spreadsheets.oAuthSession'
       }
   },
   listeners: {
       "onCreate.getCellContent": {
           func: '{that}.session.events.doRead.fire',
           args: ['{that}.spreadSheetId', '{that}.sheetName', '{that}.coordinate'],
           priority: 'first'
       },
       '{that}.session.events.onResolve': 'spreadsheets.cell.updateValue',
       '{that}.session.events.onError': 'spreadsheets.cell.displayError'
   }
});

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