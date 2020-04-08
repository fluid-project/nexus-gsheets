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
           args: ['{that}',
                  '{session}']
       },
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

/**
 * Update the cell value with the returned value from a read.
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
 * @param {Any} value The returned value
 */
spreadsheets.cell.updateValue = function(value) {
    // TODO:
    console.log('Received value from the remote cell: ', value);
};

/**
 * Display an error in the cell data fetching process
 * @param {Error} error The error produced during the fetch.
 */
spreadsheets.cell.displayError = function(error) {
    // TODO: use console.log to begin with
    console.log('Received an error while trying to read the remote cell: ', error);
};

fluid.defaults('spreadsheets.clientSession', {
    gradeNames: ['fluid.component'],
    members: {
        sheetsClient: null, // an authorized google API client object, filled with onCreate.impl
    },
    // TODO: ask A whether refactoring to a listener is preferrable here
    invokers: {
        get: 'spreadsheets.clientSession.get' // returns a promise
    },
    listeners: {
        'onCreate.impl': 'spreadsheets.clientSession.doCreate({that})',
        // 'onRead.impl': 'spreadsheets.clientSession.doRead',
    }
});

spreadsheets.clientSession.get = function(that, spreadsheetId, sheetName, coordinate) {
    let promiseTogo = that.sheetsClient.spreadsheets.values.get({
        spreadsheetId, 
        range: sheetName + '!' + coordinate
    });
    return promiseTogo;
}

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

/*
spreadsheets.clientSession.doCreate = function(that) {
    console.log('attempting to create clientSession');
    console.log(that);
    // TODO:
    // get and parse credentials from file 
    fs.readFile(CREDENTIALS_PATH).then(function(content) {
        var credentials = JSON.parse(content);
        var { client_secret, client_id, redirect_uris } = credentials.installed;
        var oAuth2Client = new google.auth.OAuth2(
            client_id, client_secret, redirect_uris[0]);
        
        fs.readFile(TOKEN_PATH).then(function(token) {
            console.log('read token file successfully');
            oAuth2Client.setCredentials(JSON.parse(token));
        }, function(err) {
            console.log('creating new token');
            var authUrl = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES
            });

            // TODO: how do I externalize this interaction?
            console.log('Authorize this app by visiting this url: ' + authUrl);
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question('Enter the code from that page here: ', function (code) {
                rl.close();
                oAuth2Client.getToken(code, function (err, token) {
                    if (err) {
                        that.events.onError.fire(err);
                    } else {
                        oAuth2Client.setCredentials(token);
                        // store the token to disk 
                        fs.writeFile(TOKEN_PATH, JSON.stringify(token), function (err) {
                            if (err) {
                                that.events.onError.fire(err);
                            }
                        })
                    }
                });
            });
        });

        // FIXME: we never get here because I don't understand promises
        // do I need to have this stuff happen in a then?
        console.log('creating sheets client');
        that.sheetsClient = new google.sheets({
            version: 'v4',
            auth: oAuth2Client
        });
    }).catch(function (err) {
        console.log(err);
        that.events.onError.fire(err);
    });
};
*/


/* For executing the client read, I wonder what is most faithful to the REST request idiom
 * options:
 * send search specification as
 *   1. parameter list
 *   2. parameter object (can Infusion resolve IoC refs in an object given as args?)
 *   3. members on the session
 * I think parameter object is most faithful to the notion of a request body
 * for now I can just do an array
 */

/**
 * Executes a call to spreadsheets.values.get
 * @see https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
 * @param {String} spreadSheetId the id of the host spreadsheet, which can be extracted from its URL
 * @param {String} sheetName the name of the host sheet, defaults to "Sheet1" in single-sheet spreadsheets
 * @param {String} range the range of values to get, expressed in A1 notation
 * @fires spreadsheets.clientSession.onResolve
 * @fires spreadsheets.clientSession.onError
 */
/*
spreadsheets.clientSession.doRead = async function(spreadsheetId, sheetName, range) {
    // TODO:
    // the parsed result is a 2D array, 
    // so for a single value it's [[value]]
    try {
        that.sheetsClient.values.get({ spreadsheetId, sheetName, range}).then(function(result) {
            //do stuff with result
        })
        var result = await that.sheetsClient.values.get({ spreadSheetId, sheetName, range });
        result = JSON.parse(result);
        console.log('Got result! ', result);
        that.events.onResolve.fire(result);
    } catch (error) {
        that.events.onError.fire(error);
    }
};
*/

// based on the range, gives a properly dimensioned model
// actually the component ought to be specified so it can contain
// a number of child queries into the same spreadsheet,
// whether ranges or single cells
// the point of this is that it gets to reuse the authorized client,
// and it implies a flow where specifying the sheet and specifying where your attention
// is in it are separate steps, and one of them happens more often than the other.
/* TODO:
fluid.defaults('spreadsheets.sheetRange', {

});
*/

// does a paginated resource extend downwards, keeping everything in memory,
// or does it remove the previous material, assuming it's on the client to
// garbage collect or memorize that state?
// could I adapt a grade written one way into one written the other way,
// in both directions?
/* TODO:
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
*/