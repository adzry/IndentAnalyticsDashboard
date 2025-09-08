/**
 * Elite Google Apps Script Backend
 * Provides secure data access + server-side filtering
 * Scopes: UrlFetchApp, Drive (readonly/file), Web App
 */

function doGet(e) {
  // If API mode requested (?format=json), return JSON instead of HTML
  if (e && e.parameter && e.parameter.format === "json") {
    var sheetUrl = e.parameter.sheetUrl;
    var gid = e.parameter.gid || "0";
    var query = {
      from: e.parameter.from,
      to: e.parameter.to,
      dept: e.parameter.dept ? [].concat(e.parameter.dept) : [],
      status: e.parameter.status ? [].concat(e.parameter.status) : [],
      drug: e.parameter.drug ? [].concat(e.parameter.drug) : [],
      indenter: e.parameter.indenter ? [].concat(e.parameter.indenter) : [],
      q: e.parameter.q
    };
    var data = getData(sheetUrl, gid, query);
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Otherwise return the web app HTML UI
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Indent vs Supply — Elite Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getData(sheetUrl, gid, query) {
  try {
    var match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error("Invalid Google Sheet URL");
    var spreadsheetId = match[1];
    var g = gid && /^\d+$/.test(gid) ? gid : "0";
    var csvUrl = "https://docs.google.com/spreadsheets/d/" +
                  spreadsheetId + "/gviz/tq?tqx=out:csv&gid=" + g;

    var response = UrlFetchApp.fetch(csvUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      throw new Error("Failed to fetch CSV: " + response.getContentText());
    }

    var rows = Utilities.parseCsv(response.getContentText());
    var headers = rows[0];
    var data = rows.slice(1).map(function(r) {
      var obj = {};
      headers.forEach(function(h,i){ obj[h] = r[i]; });
      return obj;
    });

    if (query) data = applyFilters_(data, query);
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

function applyFilters_(data, query) {
  return data.filter(function(r) {
    try {
      var dept = (r["Department"]||"").trim();
      var status = (r["Status"]||"").trim();
      var drug = (r["Item Name"]||"").trim();
      var indenter = (r["Indenter"]||"").trim();
      var indentDate = r["Indent Date"] ? new Date(r["Indent Date"]) : null;

      if (query.dept.length && query.dept.indexOf(dept) === -1) return false;
      if (query.status.length && query.status.indexOf(status) === -1) return false;
      if (query.drug.length && query.drug.indexOf(drug) === -1) return false;
      if (query.indenter.length && query.indenter.indexOf(indenter) === -1) return false;

      if (query.from || query.to) {
        if (!indentDate) return false;
        if (query.from && indentDate < new Date(query.from)) return false;
        if (query.to && indentDate > new Date(query.to)) return false;
      }

      if (query.q) {
        var q = query.q.toLowerCase();
        var combined = [dept, status, drug, indenter, r["Indent No"], r["Item Code"]].join(" ").toLowerCase();
        if (combined.indexOf(q) === -1) return false;
      }

      return true;
    } catch (err) { return false; }
  });
}

/**
 * Secure embedding call example
 */
function getEmbedding_(text) {
  var apiKey = PropertiesService.getScriptProperties().getProperty("OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing API key");
  var url = "https://api.openai.com/v1/embeddings";
  var payload = { model: "text-embedding-3-small", input: text };
  var options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  var res = UrlFetchApp.fetch(url, options);
  return JSON.parse(res.getContentText());
}
