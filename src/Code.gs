/**
 * Elite Google Apps Script Backend
 * Serves Index.html, proxies Google Sheet CSV, and applies server-side filters
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
 * Handle JSON requests with filters applied server-side.
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

    // Parse CSV
    const rows = Utilities.parseCsv(csv);
    const headers = rows[0];
    let data = rows.slice(1).map(r => {
      const rowObj = {};
      headers.forEach((h, i) => rowObj[h] = r[i]);
      return rowObj;
    });

    // === Apply filters from query params ===
    const from = e.parameter.from ? new Date(e.parameter.from) : null;
    const to = e.parameter.to ? new Date(e.parameter.to) : null;
    const statuses = e.parameter.status ? [].concat(e.parameter.status) : [];
    const depts = e.parameter.dept ? [].concat(e.parameter.dept) : [];
    const meds = e.parameter.drug ? [].concat(e.parameter.drug) : [];
    const indenters = e.parameter.indenter ? [].concat(e.parameter.indenter) : [];
    const q = e.parameter.q ? e.parameter.q.toLowerCase() : "";

    data = data.filter(r => {
      try {
        // Normalize
        const d = r["Indent Date"] ? new Date(r["Indent Date"]) : null;
        const status = (r["Status"] || "").trim();
        const dept = (r["Department"] || "").trim();
        const med = (r["Item Name"] || "").trim();
        const ind = (r["Indenter"] || "").trim();
        const textBlob = `${med} ${dept} ${status} ${ind}`.toLowerCase();

        // Date filters
        if (from && (!d || d < from)) return false;
        if (to && (!d || d > to)) return false;

        // Multi-select filters
        if (statuses.length && !statuses.includes(status)) return false;
        if (depts.length && !depts.includes(dept)) return false;
        if (meds.length && !meds.includes(med)) return false;
        if (indenters.length && !indenters.includes(ind)) return false;

        // Search query
        if (q && !textBlob.includes(q)) return false;

        return true;
      } catch (err) {
        return false;
      }
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
 * Fetch CSV from Google Sheet.
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
