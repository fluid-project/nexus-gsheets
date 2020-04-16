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

// This logging function is used to trigger a breakpoint and get component tree state
spreadsheets.debug = function(...messages) {
    console.log(messages);
}

/**
 * component for reading and writing entire spreadsheets, located based on their id/URL
 */
fluid.defaults('spreadsheets.spreadsheet', {
    gradeNames: ['fluid.modelComponent'],
    spreadsheetId: '', // the id of the host spreadsheet, which can be extracted from the URL
    members: {
        sheetBounds: {} // the coordinate ranges containing all data in each sheet 'tab', keyed by the sheetName
        // this may be significantly larger than the used cells without incurring any computational cost
    },
    components: {
        apiClient: { // the authorized API client
            type: 'spreadsheets.sheetsAPIClient'
        }
    },
    // TODO: ask A about old-style event passing versus current setup, 
    // which is an onCreate listener triggering an invoker 
    // '{that}.apiClient.events.onResolve': 'spreadsheets.cell.updateValue',
    // '{that}.apiClient.events.onError': 'spreadsheets.cell.displayError'
    listeners: { // read the remote spreadsheet on component creation
        'onCreate.getRemoteContent': 'spreadsheets.spreadsheet.getRemoteContent({that}, {apiClient})'
    },
    // When the model is written to, update the remote sheet
    // TODO: where is the change source stored?
    modelListeners: {
        '*': {
            func: 'spreadsheets.spreadsheet.setRemoteContent',
            args: ['{that}', '{apiClient}', '{change}.path.0', '{change}.value'],
            // FIXME: currently, this model relay doesn't work as intended. 
            // It should systematically exclude mutations coming from reads. 
            // Can those be associated with a particular invoker on the apiClient sub-component or locally? 
            // The kludge I can make right now is to check the written value against the last-read value.
            // excludeSource: 'init' does not seem to be what I want, because multiple reads could happen over the component life cycle.
        }
    }
});

// TODO: refactor this messy function
// TODO: I wonder if I can more declaratively specify
//   which api call with which body
//   how to decode and extract data
//   how to fill the model
// and whether that has value for the design
spreadsheets.spreadsheet.getRemoteContent = function(that, apiClient) {
    var metadataPromise = apiClient.getSpreadsheet(apiClient, that.options.spreadsheetId);
    var requests = [];
    metadataPromise.then(function(res) {
        fluid.each(res.data.sheets, function(sheetObject) {
            var {title} = sheetObject.properties;
            var {columnCount, rowCount} = sheetObject.properties.gridProperties;
            requests.push({title, columnCount, rowCount});
        });
        var ranges = [];
        fluid.each(requests, function({title, columnCount, rowCount}) {
            var boundingRange = title + '!' + 'A1:' + spreadsheets.coordToA1(columnCount, rowCount);
            that.sheetBounds[title] = boundingRange;
            ranges.push(boundingRange);
        });
        var valuePromise = apiClient.getRanges(
            apiClient,
            that.options.spreadsheetId,
            ranges);
        valuePromise.then(function(res) {
            fluid.each(res.data.valueRanges, function({range, values}) {
                var sheetName = range.split('!')[0];
                that.applier.change(sheetName, values);
            });
        });
    }, function(error) {
        fluid.log(fluid.logLevel.WARN, error);
    });
};

/**
 * Convert a column and row to A1 notation, the conventional coordinate system of spreadsheets.
 * @param {Number} column The 1-indexed column number.
 * @param {Number} row The 1-indexed row number.
 * @returns {String} The coordinate in A1 notation.
 */
spreadsheets.coordToA1 = function(column, row) {
    return numberToColumn(column) + row;
};

var numberToColumn = function(int) {
    var togo = int - 1;
    togo = togo.toString(26);
    togo = successorBase27(togo);
    togo = shiftToAlphabetical(togo);
    return togo;
};

var successorBase27 = function(str) {
    var togo;
    for (i = str.length - 1; i >= 0; i--) {
        var char = str[i];
        if (char !== 'q') {
            togo = str.substring(0, i) + (parseInt(char, 26) + 1).toString(27) + str.substring(i + 1)
            return togo;
        } else {
            togo = str.substring(0, i) + '0' + str.substring(i + 1);
        }
    }
    return '1' + togo;
};

var shiftToAlphabetical = function(str) {
    return str.replace(/\w/g, (char) => ({ 
        1: 'A', 
        2: 'B',
        3: 'C',
        4: 'D',
        5: 'E', 
        6: 'F', 
        7: 'G',
        8: 'H',
        9: 'I', 
        a: 'J', 
        b: 'K',
        c: 'L', 
        d: 'M',
        e: 'N',
        f: 'O', 
        g: 'P', 
        h: 'Q',
        i: 'R', 
        j: 'S', 
        k: 'T',
        l: 'U', 
        m: 'V',
        n: 'W',
        o: 'X',
        p: 'Y', 
        q: 'Z' 
    })[char]);
};

/**
 * Send a new value for the component model to the remote spreadsheet.
 * @param {String} sheetName The name of the sheet (within the spreadsheet) the update is being issued to
 * @param {Array} value A 2D array representing the updated value of the sheet, as a list of rows.
 */
spreadsheets.spreadsheet.setRemoteContent = function(that, apiClient, sheetName, values) {
    // FIXME: this should not issue updates when the source of a change is reading from the remote sheet
    var writePromise = apiClient.updateRange(apiClient, that.options.spreadsheetId, sheetName, that.sheetBounds[sheetName], values);
    writePromise.then(function(response) {
        fluid.log(fluid.logLevel.INFO, response);
    }, function(rejection) {
        fluid.log(fluid.logLevel.WARN, rejection);
    });
};

/**
 * A component managing a client for the Google Sheets API.
 * It takes care of creating and authenticating the client using the OAuth2 protocol, and exposes API endpoints as invokers.
 */
fluid.defaults('spreadsheets.sheetsAPIClient', {
    gradeNames: ['fluid.component'],
    members: {
        clientObject: null, // an authorized google API client object, filled with onCreate.impl
    },
    // TODO: ask A whether refactoring to listeners is preferrable here
    // as in a few lines down
    invokers: {
        getRange: 'spreadsheets.sheetsAPIClient.getRange', 
        getRanges: 'spreadsheets.sheetsAPIClient.getRanges',
        getSpreadsheet: 'spreadsheets.sheetsAPIClient.getSpreadsheet',
        updateRange: 'spreadsheets.sheetsAPIClient.updateRange'
    },
    listeners: {
        'onCreate.impl': 'spreadsheets.sheetsAPIClient.createAuthorizedClient({that})',
        // 'onRead.impl': 'spreadsheets.sheetsAPIClient.doRead',
    }
});

/**
 * Create and authorize an OAuth2 client providing the google sheets API
 * @param {Object} that The component representing the client
 */
spreadsheets.sheetsAPIClient.createAuthorizedClient = function(that) {
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

    that.clientObject = new google.sheets({
        version: 'v4',
        auth: oAuth2Client
    });
};

/**
 * Get a particular range of values in a particular spreadsheet.
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
 * @param {Object} that the sheetsAPIClient component.
 * @param {String} spreadsheetId the id of the host spreadsheet, which can be extracted from its URL.
 * @param {String} sheetName the name of the host sheet, defaults to "Sheet1" in single-sheet spreadsheets.
 * @param {String} range the range of values to get, expressed in A1 notation.
 * @return {Promise} resolves with the addressed value or a rejection.
 */
spreadsheets.sheetsAPIClient.getRange = function(that, spreadsheetId, sheetName, coordinate) {
    let promiseTogo = that.clientObject.spreadsheets.values.get({
        spreadsheetId, 
        range: sheetName + '!' + coordinate
    });
    return promiseTogo;
};

/**
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchGet
 * @param {Object} that the sheetsAPIClient component.
 * @param {String} spreadsheetId the id of the host spreadsheet, which can be extracted from its URL.
 * @param {Array<String>} ranges an array of objects representing the ranges in A1 notation, e.g. "Sheet1!A1:B7".
 * @return {Promise} resolves with the addressed value or a rejection.
 */
spreadsheets.sheetsAPIClient.getRanges = function(that, spreadsheetId, ranges) {
    let promiseTogo = that.clientObject.spreadsheets.values.batchGet({spreadsheetId, ranges});
    return promiseTogo;
}

/**
 * Get all values in all sheets of a particular spreadsheet.
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/get
 * @param {Object} that the sheetsAPIClient component.
 * @param {String} spreadsheetId the id of the spreadsheet, which can be extracted from its URL.
 * @return {Promise} resolves with the spreadsheet as a JSON object or a rejection.
 */
spreadsheets.sheetsAPIClient.getSpreadsheet = function(that, spreadsheetId) {
    let promiseTogo = that.clientObject.spreadsheets.get({spreadsheetId});
    return promiseTogo;
};

/**
 * Set the values in a range in a spreadsheet
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/update
 * @param {Object} that the sheetsAPIClient component.
 * @param {String} spreadsheetId the id of the host spreadsheet, which can be extracted from its URL.
 * @param {String} sheetName the name of the host sheet, defaults to "Sheet1" in single-sheet spreadsheets.
 * @param {String} range the range of values to get, expressed in A1 notation.
 * @return {Promise} resolves with an HTTP status indicating whether the write was successful.
 */
spreadsheets.sheetsAPIClient.updateRange = function(that, spreadsheetId, sheetName, range, values) {
    var promiseTogo = that.clientObject.spreadsheets.values.update({
        spreadsheetId,
        range: range, // FIXME: I need to be consistent about where the transformation of range to sheetName!range happens,
        // i.e. whether client expects them pre-formatted (as the API does) or not
        valueInputOption: 'USER_ENTERED', // elements in {values} are formatted as strings, but will be interpreted as numbers, dates, etc.
        includeValuesInResponse: false,
        responseDateTimeRenderOption: 'FORMATTED_STRING',
        resource: {
            majorDimension: 'ROWS', // {values} is an array of arrays, where the inner arrays represent rows
            values
        }
    });
    return promiseTogo;
}