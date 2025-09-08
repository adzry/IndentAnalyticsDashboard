function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Indent vs Supply Data Report & Analytics')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function getData(sheetUrl, gid) {
  try {
    var match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error('Invalid Google Sheet URL provided.');
    var spreadsheetId = match[1];
    var g = gid && /^\d+$/.test(gid) ? gid : '0';
    var csvUrl = 'https://docs.google.com/spreadsheets/d/' +
      spreadsheetId + '/gviz/tq?tqx=out:csv&gid=' + g;
    var response = UrlFetchApp.fetch(csvUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      throw new Error('Failed to fetch CSV. Response: ' + response.getContentText());
    }
    return response.getContentText();
  } catch (e) {
    return { error: e.message };
  }
}
