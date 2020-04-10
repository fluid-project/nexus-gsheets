var fs = require('fs');
var {google} = require('googleapis');
var config = require('../config.json');
var fluid = fluid || require('infusion');

var CREDENTIALS_PATH = config.credentialsPath;
var TOKEN_PATH = config.tokenPath;
var SCOPES = config.scopes;

/**********************
 * SPREADSHEET GRADES *
 **********************/

var spreadsheets = fluid.registerNamespace('spreadsheets');
module.exports = spreadsheets;

/*
 * for more realistic components where several reads are made over the component's life cycle,
 * we might want to have sub-components define each "sub-session" relating to a new spreadsheetId
 * 
 * TODO: make a grade spreadsheets.spreadsheet that maps an entire spreadsheet
 * It should probably be something like
 * model: {
 *   sheet1: [['Name', 'Age', 'Hobby'], 
 *            ['Philip', 27, 'Role-playing games'], 
 *            ['Colin', '??', 'Beer brewing']]
 * }
 * 
 * TODO: make the sheet writeable (via a modelListener?)
 * 
 * TODO: create a sheet on a Nexus
 * 
 * TODO: support the token creation path
 * 
 * TODO: create a browser client that creates and materializes a Nexus-based sheet component
 * 
 * TODO: set up unit testing:
 *      . a sheet has a value under certain conditions, maybe that a modelListener will pick it up
 *      . correctly formated API calls to all endpoints
 *      . repeated reads work after changes in the ground data?
 *      . model edit causes write 
 *      . writes transmit between two sheet objects
 *      . decoding/encoding works 
 */ 

// component for reading an entire spreadsheet once (to begin with)
fluid.defaults('spreadsheets.spreadsheet', {
   gradeNames: ['fluid.modelComponent'],
   spreadsheetId: '',
   components: {
       session: {
           type: 'spreadsheets.clientSession'
       }
   },
   listeners: {
       'onCreate.getContent': 'spreadsheets.spreadsheet.getContent({that}, {session})'
   }
});

/**
 * Convert a column and row to A1 notation, the conventional coordinate system of spreadsheets.
 * @param {Number} column The 1-indexed column number.
 * @param {Number} row The 1-indexed row number.
 * @returns {String} The coordinate in A1 notation.
 */
spreadsheets.coordToA1 = function(column, row) {
    // TODO: the trick is the column isn't exactly a conventional base
    // 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 26, 27, 28
    // A, B, C, D, E, F, G, H, I, J,   K,  Z, AA, AB
};

spreadsheets.spreadsheet.getContent = function(that, session) {
    // TODO: this implies that session.get should be a little more configurable
    // or maybe rather that session should have more endpoints
    // getRange: spreadsheets.values.get
    // getRanges: spreadsheets.values.batchGet
    // getSpreadsheet: spreadsheets.get // should get us a hash of GridData objects??
    //
    // I wonder if I can more declaratively specify
    //   which api call with which body
    //   how to decode and extract data
    //   how to fill the model
    // and whether that has value for the design
    console.log('enter spreadsheets.spreadsheet.getContent');
    var valuePromise;
    try {
        spreadsheetPromise = session.getSpreadsheet(session, that.options.spreadsheetId);
    } catch (error) {
        console.log(error);
    }
    console.log('spreadsheetPromise: ', valuePromise);
    var requests = [];
    spreadsheetPromise.then(function(res) {
        fluid.each(res.data.sheets, function(sheetObject) {
            console.log(sheetObject);
            // TODO: clear all empty rows and columsn from the outside until one is encountered with content in it
            var {title} = sheetsObject.properties;
            var {columnCount, rowCount} = sheetsObject.properties.gridProperties;
            requests.push({title, columnCount, rowCount});
            // TODO: put these in a collection, then do a sheets.values.batchGet by doing
            // spreadsheetId = spreadsheetId
            // range = title + '!' + columnsAndRowsToA1(columnCount, rowCount)
            // then iterate backwards through the resulting data
        });
        // value = res.data.sheets
        // value = res.data.values[0][0];
        // that.applier.change('value', value);
        // console.log('changed model value to ', value);
        var valuePromise;
        try {
            valuePromise = session.getRanges(
                session, 
                that.options.spreadsheetId, 
                requests.map(function({title, columnCount, rowCount}) {
                    return title + '!' + 'A1:' + x + rowCount;
            }));
        } catch (error) {
            console.log(error);
        }
    }, function(error) {
        console.log('promise rejected: ', error);
    });
    console.log('exit spreadsheets.spreadsheet.getContent');
};

// component for reading a single cell once
fluid.defaults('spreadsheets.cell', {
    gradeNames: ['fluid.modelComponent'],
    spreadsheetId: '', // the id of the host spreadsheet, which can be extracted from the URL
    sheetName: 'Sheet1', // the name of the host sheet, defaults to "Sheet1" in single-sheet spreadsheets
    coordinate: 'A1', // the coordinate of the cell in the host sheet
    model: {
        value: null // is replaced with the cell content on creation
    },
    components: {
        session: {
            type: 'spreadsheets.clientSession'
        }
    },
    listeners: {
        'onCreate.getCellContent': {
            func: 'spreadsheets.cell.getCellContent',
            args: ['{that}', '{session}']
        },
        // TODO: ask A about oldstyle event passing versus current setup, 
        // which is an onCreate listener triggering an invoker 
        // '{that}.session.events.onResolve': 'spreadsheets.cell.updateValue',
        // '{that}.session.events.onError': 'spreadsheets.cell.displayError'
    }
});

spreadsheets.cell.getCellContent = function (that, session) {
    const valuePromise = session.get(session, that.options.spreadsheetId, that.options.sheetName, that.options.coordinate);
    valuePromise.then(function(res) {
        value = res.data.values[0][0];
        that.applier.change('value', value);
        console.log('changed model value to ', value);
    }, function(error) {
        console.log('promise rejected: ', error);
    });
};

fluid.defaults('spreadsheets.clientSession', {
    gradeNames: ['fluid.component'],
    members: {
        sheetsClient: null, // an authorized google API client object, filled with onCreate.impl
    },
    // TODO: ask A whether refactoring to a listener is preferrable here
    // as in a few lines down
    // TODO: add an invoker or listener for each API endpoint
    invokers: {
        getRange: 'spreadsheets.clientSession.getRange', 
        getRanges: 'spreadsheets.clientSession.getRanges',
        getSpreadsheet: 'spreadsheets.clientSession.getSpreadsheet'
    },
    listeners: {
        'onCreate.impl': 'spreadsheets.clientSession.doCreate({that})',
        // 'onRead.impl': 'spreadsheets.clientSession.doRead',
    }
});

/**
 * Create and authorize an OAuth2 client providing the google sheets API
 * @param {Object} that The component representing the client
 */
spreadsheets.clientSession.doCreate = function(that) {
    var credentials = fs.readFileSync(CREDENTIALS_PATH);
    credentials = JSON.parse(credentials);
    var { client_secret, client_id, redirect_uris } = credentials.installed;
    var oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    var token = fs.readFileSync(TOKEN_PATH);
    if (token) {
        token = JSON.parse(token);
    } else { 
        // TODO: get the new file if the token doesn't already exist
        // this requires user interaction
    }

    oAuth2Client.setCredentials(token);

    that.sheetsClient = new google.sheets({
        version: 'v4',
        auth: oAuth2Client
    });
};

/**
 * Get a particular range of values in a particular spreadsheet.
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
 * @param {Object} that the clientSession component.
 * @param {String} spreadsheetId the id of the host spreadsheet, which can be extracted from its URL.
 * @param {String} sheetName the name of the host sheet, defaults to "Sheet1" in single-sheet spreadsheets.
 * @param {String} range the range of values to get, expressed in A1 notation.
 * @return {Promise} resolves with the addressed value or a rejection.
 */
spreadsheets.clientSession.getRange = function(that, spreadsheetId, sheetName, coordinate) {
    let promiseTogo = that.sheetsClient.spreadsheets.values.get({
        spreadsheetId, 
        range: sheetName + '!' + coordinate
    });
    return promiseTogo;
};

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
 * @param {Object} that the clientSession component.
 * @param {String} spreadsheetId the id of the host spreadsheet, which can be extracted from its URL.
 * @param {Array<String>} ranges an array of objects representing the ranges in A1 notation, e.g. "Sheet1!A1:B7".
 * @return {Promise} resolves with the addressed value or a rejection.
 */
spreadsheets.clientSession.getRanges = function(that, spreadsheetId, ranges) {
    let promiseTogo = that.sheetsClient.spreadsheets.values.batchGet({spreadsheetId, ranges});
    return promiseTogo;
}

/**
 * Get all values in all sheets of a particular spreadsheet.
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
 * @param {Object} that the clientSession component.
 * @param {String} spreadsheetId the id of the spreadsheet, which can be extracted from its URL.
 * @return {Promise} resolves with the spreadsheet as a JSON object or a rejection.
 */
spreadsheets.clientSession.getSpreadsheet = function(that, spreadsheetId) {
    let promiseTogo = that.sheetsClient.spreadsheets.get({spreadsheetId});
    return promiseTogo;
};