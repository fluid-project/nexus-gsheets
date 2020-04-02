var authorize = require('./src/authorize');
var config = require('./config.json');

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