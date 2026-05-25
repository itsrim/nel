/**
 * API Google Sheets pour Nel — à déployer comme Application Web.
 *
 * 1. Crée un Google Sheet avec un onglet "messages" et l’en-tête :
 *    conversationId | id | authorId | authorName | text | sentAt
 * 2. Extensions → Apps Script → coller ce fichier
 * 3. Remplace SPREADSHEET_ID par l’id de ton classeur
 * 4. Déployer → Nouvelle deployment → Application Web
 *    - Exécuter en tant que : Moi
 *    - Accès : Tout le monde
 * 5. Copie l’URL dans VITE_GOOGLE_SHEETS_API_URL
 */

const SPREADSHEET_ID = "REMPLACE_PAR_TON_SPREADSHEET_ID";

function jsonResponse_(payload, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
  if (statusCode) output.setResponseCode(statusCode);
  return output;
}

function getSheet_(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

function getHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach(function (header, i) {
    obj[header] = row[i] != null ? String(row[i]) : "";
  });
  return obj;
}

function findRowIndexById_(sheet, idColumn, id) {
  const headers = getHeaders_(sheet);
  const idIndex = headers.indexOf(idColumn);
  if (idIndex < 0) return -1;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(id)) return i + 2;
  }
  return -1;
}

function appendRow_(sheetName, row) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  if (headers.length === 0) throw new Error("Sheet has no headers");

  if (row.id) {
    const existing = findRowIndexById_(sheet, "id", row.id);
    if (existing > 0) return { ok: true, skipped: true };
  }

  const line = headers.map(function (header) {
    return row[header] != null ? row[header] : "";
  });
  sheet.appendRow(line);
  return { ok: true, skipped: false };
}

function updateRow_(sheetName, idColumn, id, patch) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  const rowIndex = findRowIndexById_(sheet, idColumn, id);
  if (rowIndex < 0) throw new Error("Row not found: " + id);

  headers.forEach(function (header, colIndex) {
    if (patch[header] != null) {
      sheet.getRange(rowIndex, colIndex + 1).setValue(patch[header]);
    }
  });

  return { ok: true };
}

function handleRequest_(body) {
  const action = body.action;
  const sheet = body.sheet || "messages";
  const idColumn = body.idColumn || "id";

  if (action === "post") {
    return appendRow_(sheet, body.row || {});
  }

  if (action === "batchPost") {
    const rows = body.rows || [];
    var results = [];
    rows.forEach(function (row) {
      results.push(appendRow_(sheet, row));
    });
    return { ok: true, results: results };
  }

  if (action === "put") {
    return updateRow_(sheet, idColumn, body.id, body.row || {});
  }

  throw new Error("Unknown action: " + action);
}

function doGet(e) {
  try {
    if (e.parameter.action) {
      const body = {
        action: e.parameter.action,
        sheet: e.parameter.sheet,
        idColumn: e.parameter.idColumn,
        id: e.parameter.id,
        row: e.parameter.row ? JSON.parse(e.parameter.row) : {},
      };
      return jsonResponse_(handleRequest_(body));
    }
    return jsonResponse_({ ok: true, service: "nel-sheets-api" });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) }, 400);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    return jsonResponse_(handleRequest_(body));
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) }, 400);
  }
}
