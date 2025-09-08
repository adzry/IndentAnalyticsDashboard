/**
 * Elite Google Apps Script Backend
 * Serves Index.html and proxies Google Sheet CSV fetch
 * Provides JSON output for advanced filtering
 */

/**
 * Entry point for the web app.
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.format === "json") {
    return handleJsonRequest(e);
  }
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Indent vs Supply — Elite Dashboard")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handle JSON data requests from frontend.
 */
function handleJsonRequest(e) {
  try {
    const sheetUrl = e.parameter.sheetUrl;
    const gid = e.parameter.gid || "0";
    const csv = getData(sheetUrl, gid);
    if (typeof csv === "object" && csv.error) {
      return ContentService.createTextOutput(JSON.stringify(csv))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const rows = Utilities.parseCsv(csv);
    const headers = rows[0];
    const data = rows.slice(1).map(r => {
      const rowObj = {};
      headers.forEach((h, i) => rowObj[h] = r[i]);
      return rowObj;
    });

    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Fetches CSV data from a Google Sheet.
 * @param {string} sheetUrl Full Google Sheet URL.
 * @param {string} gid Sheet GID (tab id).
 * @return {string|Object} CSV or error object.
 */
function getData(sheetUrl, gid) {
  try {
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error("Invalid Google Sheet URL");

    const spreadsheetId = match[1];
    const g = gid && /^\d+$/.test(gid) ? gid : "0";
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${g}`;

    const response = UrlFetchApp.fetch(csvUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      throw new Error("Failed to fetch CSV: " + response.getContentText());
    }
    return response.getContentText();
  } catch (err) {
    return { error: err.message };
  }
}
