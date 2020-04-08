var fs = require('fs');
var {google} = require('googleapis');
var config = require('../config.json');
var fluid = fluid || require('infusion');

var CREDENTIALS_PATH = config.credentialsPath;
var TOKEN_PATH = config.tokenPath;
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

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
 *   sheet1: [['Name', 'Age', 'Hobby'], ['Philip', 27, 'Role-playing games'], ['Colin', '??', 'Beer brewing']]
 * }
 */ 

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
       // which is an onCreate invoker
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
    invokers: {
        get: 'spreadsheets.clientSession.get' // returns a promise
    },
    listeners: {
        'onCreate.impl': 'spreadsheets.clientSession.doCreate({that})',
        // 'onRead.impl': 'spreadsheets.clientSession.doRead',
    }
});

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
 * Executes a call to spreadsheets.values.get
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
 * @param {Object} that the clientSession component.
 * @param {String} spreadSheetId the id of the host spreadsheet, which can be extracted from its URL.
 * @param {String} sheetName the name of the host sheet, defaults to "Sheet1" in single-sheet spreadsheets.
 * @param {String} range the range of values to get, expressed in A1 notation.
 * @return {Promise} resolves with the addressed value or a rejection.
 */
spreadsheets.clientSession.get = function(that, spreadsheetId, sheetName, coordinate) {
    let promiseTogo = that.sheetsClient.spreadsheets.values.get({
        spreadsheetId, 
        range: sheetName + '!' + coordinate
    });
    return promiseTogo;
}