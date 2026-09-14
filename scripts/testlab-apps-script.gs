// Test Lab results collector.
// Paste into Extensions → Apps Script of the results spreadsheet, set SECRET, deploy as web app.
const SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.token !== SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'forbidden' }));
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = payload.kind === 'session' ? 'Sessions' : 'TaskResults';
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);

    const row = payload.row || {};
    // Header-driven append: first write establishes columns; new keys extend the header.
    let header = [];
    if (sheet.getLastRow() >= 1) {
      header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].filter(String);
    }
    if (header.length === 0) {
      header = Object.keys(row);
      sheet.getRange(1, 1, 1, header.length).setValues([header]);
    } else {
      const missing = Object.keys(row).filter(function (k) { return header.indexOf(k) === -1; });
      if (missing.length) {
        sheet.getRange(1, header.length + 1, 1, missing.length).setValues([missing]);
        header = header.concat(missing);
      }
    }
    const values = header.map(function (k) {
      const v = row[k];
      return v === undefined || v === null ? '' : v;
    });
    sheet.appendRow(values);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }));
  }
}
