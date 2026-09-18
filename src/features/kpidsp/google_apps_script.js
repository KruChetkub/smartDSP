/**
 * Unified Google Apps Script for Health KPI & SDGs Tracking
 * Features: Multi-sheet support, Dynamic column mapping, Auto-sequencing
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheetName = payload.sheetName || "SDGs";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) throw "Sheet not found: " + sheetName;

    // --- CASE 1: Bulk Import (Array) ---
    if (Array.isArray(payload)) {
      if (payload.length === 0) throw "Empty data array";
      
      var startRow = sheet.getLastRow() + 1;
      var rowsToInsert = payload.map(function(data, index) {
        var autoOrder = (startRow - 1) + index;
        
        // This mapping is specifically for SDGs sheet (initial set)
        return [
          data.category || '',
          data.orderNo || autoOrder,
          data.subTarget || '',
          data.indicatorName || '',
          data.target2030 || '',
          data.unit || '',
          data.currentPerformance || '',
          data.agency || '',
          data.year || '',
          data.note || '',
          new Date() // Timestamp
        ];
      });
      
      sheet.getRange(startRow, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
      return createJsonResponse({ result: 'success', status: 'Bulk import successful', rows: rowsToInsert.length });
    } 

    // --- CASE 2: Single Row Entry (Object) ---
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var rowData = [];
    
    // Auto-order calculation if B=ลำดับ
    var autoOrder = sheet.getLastRow(); 

    for (var i = 0; i < headers.length; i++) {
      var header = headers[i].trim();
      
      if (header === "Timestamp" || header === "ลงวันที่") {
        rowData.push(new Date());
      } else if (header === "ลำดับ" && !payload.orderNo) {
        rowData.push(autoOrder); // Auto number
      } else {
        // --- COMPREHENSIVE MAPPING TABLE ---
        var value = payload[header] || payload[header.toLowerCase()] || '';
        
        // SDGs System Mappings
        if (header === "หมวดหมู่ตัวชี้วัดหลัก") value = payload.category || value;
        if (header === "ลำดับ") value = payload.orderNo || autoOrder || value;
        if (header === "เป้าหมายย่อยที่") value = payload.subTarget || value;
        if (header === "ชื่อตัวชี้วัด") value = payload.indicatorName || value;
        if (header === "เป้าหมาย SDG ปี 2573") value = payload.target2030 || value;
        if (header === "หน่วยวัด") value = payload.unit || value;
        if (header === "ผลการดำเนินงานปัจจุบัน (68)" || header === "ผลการดำเนินงานปัจจุบัน") value = payload.currentPerformance || payload.performance || value;
        if (header === "หน่วยงานที่รับผิดชอบ") value = payload.agency || value;
        if (header === "ปีที่รายงาน") value = payload.year || value;
        if (header === "หมายเหตุ") value = payload.note || value;

        // Health KPI System Mappings
        if (header === "ชื่อตัวชี้วัดย่อย") value = payload.subIndicatorName || value;
        if (header === "เขตฯ" || header === "เขต") value = payload.region || value;
        if (header === "A") value = payload.A || value;
        if (header === "B") value = payload.B || value;
        if (header === "ผลงาน" || header === "ผลการดำเนินงาน") value = payload.performance || payload.currentPerformance || value;
        if (header === "เป้าหมาย Q1") value = payload.targetQ1 || value;
        if (header === "เป้าหมาย Q2") value = payload.targetQ2 || value;
        if (header === "เป้าหมาย Q3") value = payload.targetQ3 || value;
        if (header === "เป้าหมาย Q4") value = payload.targetQ4 || value;
        
        rowData.push(value);
      }
    }
    
    sheet.appendRow(rowData);
    return createJsonResponse({ result: 'success', row: sheet.getLastRow() });

  } catch (error) {
    return createJsonResponse({ result: 'error', message: error.toString() });
  }
}

function doGet(e) {
  try {
    var sheetName = e.parameter.sheet || "SDGs";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return createJsonResponse({ error: 'Sheet "' + sheetName + '" not found' });

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createJsonResponse([]);

    var headers = data[0];
    var result = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      var hasValue = false;
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        if (!key) continue;
        obj[key] = row[j];
        if (row[j] !== "" && row[j] !== null) hasValue = true;
      }
      if (hasValue) result.push(obj);
    }

    return createJsonResponse(result);

  } catch (error) {
    return createJsonResponse({ error: error.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
