/**
 * API Google Sheets pour Hlg — à déployer comme Application Web.
 *
 * 1. Crée un Google Sheet avec les onglets listés dans google-apps-script/README.md
 *    (ligne 1 = en-têtes ; copier depuis google-apps-script/csv-templates/*.csv)
 *
 *    viewer_settings (ligne 1) :
 *    userId,id,email,emailVerified,passwordHash,verificationToken,verificationExpiresAt,
 *    passwordResetToken,passwordResetExpiresAt,avatarUrl,displayName,isPro,...
 *
 * 2. Extensions → Apps Script → coller ce fichier
 * 3. Remplace SPREADSHEET_ID par l’id de ton classeur
 * 4. Déployer → Nouvelle deployment → Application Web
 *    - Exécuter en tant que : Moi
 *    - Accès : Tout le monde
 * 5. Copie l’URL dans VITE_GOOGLE_SHEETS_API_URL
 */

const SPREADSHEET_ID = "1ajGZueEgq-Y3ZsgohiSJXlrEPaYQSMbLDSgXzLWXkmM";

function jsonResponse_(payload) {
  // ContentService ne supporte pas setResponseCode (réservé à HtmlService).
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
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

  const values = sheet.getRange(2, 1, lastRow, headers.length).getValues();
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

  if (action === "spreadsheetStats") {
    return getSpreadsheetStats_();
  }

  if (action === "deleteMessages") {
    var beforeSentAt = body.beforeSentAt;
    if (beforeSentAt == null || beforeSentAt === "" || beforeSentAt === "0") {
      return deleteAllMessages_();
    }
    return deleteMessagesBefore_(Number(beforeSentAt));
  }

  throw new Error("Unknown action: " + action);
}

function parseSentAtMs_(val) {
  if (val == null || val === "") return null;
  if (val instanceof Date) return val.getTime();
  var n = Number(String(val).trim());
  if (!isNaN(n) && n > 0) return n;
  var d = new Date(String(val));
  if (!isNaN(d.getTime())) return d.getTime();
  return null;
}

function getSpreadsheetStats_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var file = DriveApp.getFileById(SPREADSHEET_ID);
  var bytes = file.getSize();
  var sheets = ss.getSheets();
  var sheetStats = [];
  var messageRows = 0;

  sheets.forEach(function (sh) {
    var rows = Math.max(0, sh.getLastRow() - 1);
    var name = sh.getName();
    if (name === "messages") messageRows = rows;
    sheetStats.push({ name: name, rows: rows });
  });

  return {
    ok: true,
    bytes: bytes,
    sheetCount: sheets.length,
    messageRows: messageRows,
    sheets: sheetStats,
  };
}

function deleteAllMessages_() {
  var sheet = getSheet_("messages");
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, deleted: 0, remaining: 0 };
  var count = lastRow - 1;
  sheet.deleteRows(2, count);
  return { ok: true, deleted: count, remaining: 0 };
}

function deleteMessagesBefore_(cutoffMs) {
  if (isNaN(cutoffMs) || cutoffMs <= 0) {
    throw new Error("Invalid beforeSentAt");
  }

  var sheet = getSheet_("messages");
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, deleted: 0, remaining: 0 };

  var headers = getHeaders_(sheet);
  var sentAtIndex = headers.indexOf("sentAt");
  if (sentAtIndex < 0) throw new Error("Column sentAt missing on messages sheet");

  var data = sheet.getRange(2, 1, lastRow, headers.length).getValues();
  var toDelete = [];
  for (var i = 0; i < data.length; i++) {
    var sentAt = parseSentAtMs_(data[i][sentAtIndex]);
    if (sentAt != null && sentAt < cutoffMs) {
      toDelete.push(i + 2);
    }
  }

  toDelete.sort(function (a, b) {
    return b - a;
  });
  toDelete.forEach(function (rowNum) {
    sheet.deleteRow(rowNum);
  });

  return {
    ok: true,
    deleted: toDelete.length,
    remaining: Math.max(0, sheet.getLastRow() - 1),
  };
}

function doGet(e) {
  try {
    if (e.parameter.action) {
      const body = {
        action: e.parameter.action,
        sheet: e.parameter.sheet,
        idColumn: e.parameter.idColumn,
        id: e.parameter.id,
        beforeSentAt: e.parameter.beforeSentAt,
        row: e.parameter.row ? JSON.parse(e.parameter.row) : {},
      };
      return jsonResponse_(handleRequest_(body));
    }
    return jsonResponse_({ ok: true, service: "hlg-sheets-api" });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    return jsonResponse_(handleRequest_(body));
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}
