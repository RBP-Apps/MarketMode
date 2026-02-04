function doGet(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("Script is active. Access it via the Web App URL.")
      .setMimeType(ContentService.MimeType.TEXT);
  }
  try {
    var params = e.parameter;
    
    if (params.sheet && params.action === 'fetch') {
      return fetchSheetData(params.sheet);
    } else if (params.sheet) {
      return fetchSheetData(params.sheet);
    }
    
    return ContentService.createTextOutput("Google Apps Script is running.")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    console.error("Error in doGet:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function fetchSheetData(sheetName) {
  try {
    var ss = SpreadsheetApp.openById("1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4");
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var range = sheet.getDataRange();
    var values = range.getValues();
    var displayValues = range.getDisplayValues();
    
    console.log("Fetching data from sheet: " + sheetName);
    
    var result = {
      table: {
        cols: [],
        rows: values.map(function(row, rowIndex) {
          return {
            c: row.map(function(cell, colIndex) {
              return {
                v: cell,
                f: displayValues[rowIndex][colIndex]
              };
            })
          };
        })
      }
    };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Function to format timestamp as DD/MM/YYYY hh:mm:ss string format
function formatTimestamp(date) {
  if (!date) date = new Date();
  
  try {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    
    if (date instanceof Date && !isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    }
  } catch (error) {
    console.error("Error formatting timestamp:", error);
  }
  
  // Return current date as string if error occurs
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Function to get next enquiry number
function getNextEnquiryNumber(sheetName) {
  try {
    var ss = SpreadsheetApp.openById("1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4");
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return "EN-001"; // Default if sheet doesn't exist
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return "EN-001"; // Start from EN-001 if no data rows
    }
    
    // Find the highest enquiry number from column B
    var maxNumber = 0;
    for (var i = 2; i <= lastRow; i++) {
      var enquiryNum = sheet.getRange(i, 2).getValue().toString();
      var match = enquiryNum.match(/EN-(\d+)/);
      if (match) {
        var num = parseInt(match[1]);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    // Generate next enquiry number
    var nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return "EN-" + nextNumber;
  } catch (error) {
    console.error("Error getting next enquiry number:", error);
    return "EN-001";
  }
}

function doPost(e) {
  try {
    console.log("Received POST request with parameters:", JSON.stringify(e.parameter));
    var params = e.parameter;
    
    if (params.action === 'uploadFile') {
      var base64Data = params.base64Data;
      var fileName = params.fileName;
      var mimeType = params.mimeType;
      var folderId = params.folderId;
      
      if (!base64Data || !fileName || !mimeType || !folderId) {
        throw new Error("Missing required parameters for file upload");
      }
      
      var result = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileUrl: result.fileUrl,
        fileId: result.fileId,
        fileName: fileName
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (params.action === 'updateTaskData') {
      return updateTaskData(params);
    }
    
    if (params.action === 'updateSalesData') {
      return updateSalesData(params);
    }
    
    if (params.action === 'syncCSVFormat') {
      return syncCSVFormat(params);
    }
    
    if (params.action === 'deleteRow') {
      return deleteRow(params);
    }
    
    var sheetName = params.sheetName;
    var action = params.action || 'insert';
    if (action === 'add') action = 'insert';
    
    var ss = SpreadsheetApp.openById("1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4");
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    if (action === 'insert') {
      var rowData;
      try {
        rowData = JSON.parse(params.rowData);
        console.log("Parsed row data:", JSON.stringify(rowData));
      } catch (parseError) {
        console.error("Error parsing rowData:", parseError);
        throw new Error("Invalid rowData format: " + parseError.message);
      }
      
      console.log("Processing single row insert for FMS sheet");
      console.log("Original row data:", JSON.stringify(rowData));
      
      if (!Array.isArray(rowData) || rowData.length === 0) {
        throw new Error("Invalid or empty row data array");
      }
      
      // For FMS sheet, handle enquiry number generation
      if (sheetName === "FMS") {
        var enquiryNumber = getNextEnquiryNumber(sheetName);
        rowData[1] = enquiryNumber; // Set enquiry number in column B (index 1)
        console.log("Generated enquiry number:", enquiryNumber);
      }
      
      console.log("Final row data for submission:", JSON.stringify(rowData));
      
      // Append the row to the sheet
      sheet.appendRow(rowData);
      
      var lastRow = sheet.getLastRow();
      console.log("Data inserted at row:", lastRow);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Data submitted successfully",
        rowCount: sheet.getLastRow(),
        insertedAt: lastRow,
        enquiryNumber: sheetName === "FMS" ? rowData[1] : null,
        sheetName: sheetName
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === 'update') {
      var rowIndex = parseInt(params.rowIndex);
      var rowData = JSON.parse(params.rowData);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index for update: " + rowIndex);
      }
      
      console.log("Updating row " + rowIndex + " with data:", JSON.stringify(rowData));
      
      // FIXED: Allow empty strings to clear cells
      for (var i = 0; i < rowData.length; i++) {
        // Check if value exists (not null or undefined) - empty strings ARE allowed
        if (rowData[i] !== null && rowData[i] !== undefined) {
          var cell = sheet.getRange(rowIndex, i + 1);
          
          // Set cell value directly without forcing leading quote text prefix
          cell.setValue(rowData[i]);
          
          console.log("Updated cell at row " + rowIndex + ", column " + (i + 1) + " with value: '" + rowData[i] + "'");
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Row updated successfully",
        rowIndex: rowIndex
      })).setMimeType(ContentService.MimeType.JSON);
    }
    else {
      throw new Error("Unknown action: " + action);
    }
  } catch (error) {
    console.error("Error in doPost:", error.message, error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to process request: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function deleteRow(params) {
  try {
    var sheetName = params.sheetName;
    var rowIndex = parseInt(params.rowIndex);
    
    if (isNaN(rowIndex) || rowIndex < 2) {
      throw new Error("Invalid row index for delete: " + rowIndex);
    }
    
    var ss = SpreadsheetApp.openById("1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4");
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    console.log("Deleting row " + rowIndex + " from sheet " + sheetName);
    
    // Delete the entire row
    sheet.deleteRow(rowIndex);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Row deleted successfully",
      deletedRow: rowIndex
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("Error deleting row:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateTaskData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);
    
    console.log("Processing task data update for sheet:", sheetName);
    console.log("Row data array:", JSON.stringify(rowDataArray));
    
    var ss = SpreadsheetApp.openById("1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4");
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var updateResults = [];
    
    rowDataArray.forEach(function(taskData, index) {
      console.log("Processing task " + (index + 1) + ":", JSON.stringify(taskData));
      
      var rowIndex = parseInt(taskData.rowIndex);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + taskData.rowIndex + " (must be >= 2)");
      }
      
      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      console.log("Verifying Task ID at row " + rowIndex + ", Column B:");
      console.log("  Current Task ID: '" + currentTaskId + "'");
      console.log("  Expected Task ID: '" + taskData.taskId + "'");
      
      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        console.error("TASK ID MISMATCH DETECTED!");
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) {
          console.log("Found correct row for Task ID " + taskData.taskId + " at row " + correctRow);
          rowIndex = correctRow;
        } else {
          throw new Error("Task ID mismatch and could not find correct row for Task ID: " + taskData.taskId);
        }
      } else {
        console.log("Task ID verification successful - proceeding with update");
      }
      
      var rowUpdates = {
        rowIndex: rowIndex,
        taskId: taskData.taskId,
        updates: []
      };
      
      if (taskData.actualDate) {
        console.log("Updating Column K (Actual) at row " + rowIndex + " with: " + taskData.actualDate);
        var actualCell = sheet.getRange(rowIndex, 11);
        actualCell.setValue(formatTimestamp(new Date(taskData.actualDate)));
        rowUpdates.updates.push("Column K (Actual): " + taskData.actualDate);
      }
      
      if (taskData.status) {
        console.log("Updating Column M (Status) at row " + rowIndex + " with: " + taskData.status);
        sheet.getRange(rowIndex, 13).setValue(taskData.status);
        rowUpdates.updates.push("Column M (Status): " + taskData.status);
      }
      
      if (taskData.remarks) {
        console.log("Updating Column N (Remarks) at row " + rowIndex + " with: " + taskData.remarks);
        sheet.getRange(rowIndex, 14).setValue(taskData.remarks);
        rowUpdates.updates.push("Column N (Remarks): " + taskData.remarks);
      }
      
      if (taskData.imageUrl) {
        console.log("Updating Column O (Image) at row " + rowIndex + " with: " + taskData.imageUrl);
        sheet.getRange(rowIndex, 15).setValue(taskData.imageUrl);
        rowUpdates.updates.push("Column O (Image): " + taskData.imageUrl);
      }
      
      updateResults.push(rowUpdates);
      console.log("Successfully updated row " + rowIndex + " for Task ID " + taskData.taskId);
    });
    
    console.log("Task data update completed successfully");
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Task data updated successfully",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("Error updating task data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to update task data: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateSalesData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);
    
    console.log("Processing sales data update (marking as done) for sheet:", sheetName);
    console.log("Row data array:", JSON.stringify(rowDataArray));
    
    var ss = SpreadsheetApp.openById("1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4");
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var updateResults = [];
    
    rowDataArray.forEach(function(taskData, index) {
      console.log("Processing history task " + (index + 1) + " for marking as done:", JSON.stringify(taskData));
      
      var rowIndex = parseInt(taskData.rowIndex);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + taskData.rowIndex);
      }
      
      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      console.log("Verifying Task ID for history item at row " + rowIndex + ":");
      console.log("  Current Task ID: '" + currentTaskId + "'");
      console.log("  Expected Task ID: '" + taskData.taskId + "'");
      
      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) {
          console.log("Found correct row for Task ID " + taskData.taskId + " at row " + correctRow);
          rowIndex = correctRow;
        } else {
          throw new Error("Task ID mismatch for: " + taskData.taskId);
        }
      }
      
      if (taskData.doneStatus) {
        console.log("Marking Task ID " + taskData.taskId + " as " + taskData.doneStatus + " at row " + rowIndex);
        sheet.getRange(rowIndex, 13).setValue(taskData.doneStatus);
      }
      
      updateResults.push({
        rowIndex: rowIndex,
        taskId: taskData.taskId,
        status: taskData.doneStatus
      });
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Sales data updated successfully",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("Error updating sales data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to update sales data: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function findRowByTaskId(sheet, taskId) {
  try {
    var lastRow = sheet.getLastRow();
    console.log("Searching for Task ID '" + taskId + "' in " + lastRow + " rows");
    
    for (var i = 2; i <= lastRow; i++) {
      var cellValue = sheet.getRange(i, 2).getValue();
      if (cellValue && cellValue.toString().trim() === taskId.toString().trim()) {
        console.log("Found Task ID '" + taskId + "' at row " + i);
        return i;
      }
    }
    
    console.log("Task ID '" + taskId + "' not found in any row");
    return -1;
  } catch (error) {
    console.error("Error searching for Task ID:", error);
    return -1;
  }
}

function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    console.log("Uploading file to Google Drive:");
    console.log("  File name: " + fileName);
    console.log("  MIME type: " + mimeType);
    console.log("  Folder ID: " + folderId);
    
    var fileData = base64Data;
    if (base64Data.indexOf('base64,') !== -1) {
      fileData = base64Data.split('base64,')[1];
    }
    
    var decoded = Utilities.base64Decode(fileData);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);
    
    // Set file sharing permissions to make it publicly viewable
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Get the file ID
    var fileId = file.getId();
    
    // Create proper Google Drive URL for viewing images
    var fileUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
    
    console.log("File uploaded successfully:");
    console.log("  File ID: " + fileId);
    console.log("  File URL: " + fileUrl);
    
    return {
      fileId: fileId,
      fileUrl: fileUrl,
      fileName: fileName
    };
  } catch (error) {
    console.error("Error uploading file: " + error.toString());
    throw new Error("Failed to upload file: " + error.toString());
  }
}

function syncCSVFormat(params) {
  try {
    console.log("============ syncCSVFormat START ============");
    
    var sheetName = params.sheetName || 'Weekly_Performance_Logs';
    var dateRangeStart = params.dateRangeStart || '';
    var dateRangeEnd = params.dateRangeEnd || '';
    
    // Parse data
    var data;
    try {
      data = JSON.parse(params.data);
      console.log("Parsed data length:", data.length);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "JSON Parse Error: " + parseError.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (!data || data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No data provided"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Open spreadsheet
    var ss = SpreadsheetApp.openById("1Kp9eEqtQfesdie6l7XEuTZne6Md8_P8qzKfGFcHhpL4");
    var sheet = ss.getSheetByName(sheetName);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log("Creating new sheet:", sheetName);
      sheet = ss.insertSheet(sheetName);
    }
    
    var timestamp = formatTimestamp(new Date());
    
    // Get current last row
    var lastRow = sheet.getLastRow();
    
    // Calculate starting row with 4-row gap if sheet has existing data
    var startRow;
    if (lastRow === 0) {
      startRow = 1; // Start from row 1 if sheet is empty
    } else {
      startRow = lastRow + 5; // 4 blank rows gap (lastRow + 1 + 4 = lastRow + 5)
    }
    
    console.log("Current last row:", lastRow);
    console.log("Starting at row:", startRow);
    
    // ===== HEADERS - Exact format matching the CSV =====
    var headers = [
      "Serial No",
      "Inverter ID", 
      "Beneficiary Name",
      "Capacity (kW)",
      "Total Energy (" + dateRangeStart + " to " + dateRangeEnd + ") (kWh)",
      "Avg Daily Energy (kWh)",
      "Specific Yield (kWh/kW)",
      "Days in Range",
      "Lifetime Generation (kWh)"
    ];
    
    // Write header row
    var headerRange = sheet.getRange(startRow, 1, 1, 9);
    headerRange.setValues([headers]);
    
    // Format header row - Professional blue background with white text
    headerRange.setBackground("#2563EB");  // Blue background
    headerRange.setFontColor("#FFFFFF");   // White text
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    headerRange.setWrap(true);
    
    // Set header row height for wrapped text
    sheet.setRowHeight(startRow, 40);
    
    // Add borders to header
    headerRange.setBorder(true, true, true, true, true, true, "#1E40AF", SpreadsheetApp.BorderStyle.SOLID);
    
    // Move to data rows
    var dataStartRow = startRow + 1;
    
    // ===== BUILD DATA ROWS =====
    var allRows = [];
    
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      
      var row = [
        item.serialNo || "",
        item.inverterId || "",
        item.beneficiaryName || "",
        parseFloat(item.capacity) || 0,
        parseFloat(item.totalKwh) || 0,
        parseFloat(item.avgDailyKwh) || 0,
        parseFloat(item.specYield) || 0,
        parseInt(item.daysInRange) || 8,
        parseFloat(item.lifetimeGeneration) || 0
      ];
      
      allRows.push(row);
    }
    
    console.log("Total data rows prepared:", allRows.length);
    
    // ===== WRITE ALL DATA ROWS =====
    if (allRows.length > 0) {
      var dataRange = sheet.getRange(dataStartRow, 1, allRows.length, 9);
      dataRange.setValues(allRows);
      
      // Format data rows - IMPORTANT: Set explicit dark font color
      dataRange.setFontColor("#111827");  // Dark gray/black text - VISIBLE!
      dataRange.setHorizontalAlignment("center");
      dataRange.setVerticalAlignment("middle");
      dataRange.setFontSize(10);
      
      // Add borders to all data cells
      dataRange.setBorder(true, true, true, true, true, true, "#D1D5DB", SpreadsheetApp.BorderStyle.SOLID);
      
      // Alternate row colors for better readability
      for (var j = 0; j < allRows.length; j++) {
        var rowNum = dataStartRow + j;
        var bgColor = (j % 2 === 0) ? "#F9FAFB" : "#FFFFFF";  // Light gray / White
        sheet.getRange(rowNum, 1, 1, 9).setBackground(bgColor);
      }
      
      // Format number columns with proper decimal places
      // Column D (Capacity) - 0 decimals for whole numbers
      sheet.getRange(dataStartRow, 4, allRows.length, 1).setNumberFormat("0");
      
      // Column E (Total Energy) - 1 decimal
      sheet.getRange(dataStartRow, 5, allRows.length, 1).setNumberFormat("0.0");
      
      // Column F (Avg Daily) - 2 decimals  
      sheet.getRange(dataStartRow, 6, allRows.length, 1).setNumberFormat("0.00");
      
      // Column G (Specific Yield) - 3 decimals
      sheet.getRange(dataStartRow, 7, allRows.length, 1).setNumberFormat("0.000");
      
      // Column H (Days) - 0 decimals
      sheet.getRange(dataStartRow, 8, allRows.length, 1).setNumberFormat("0");
      
      // Column I (Lifetime Gen) - 1 decimal
      sheet.getRange(dataStartRow, 9, allRows.length, 1).setNumberFormat("0.0");
    }
    
    // ===== SET COLUMN WIDTHS =====
    sheet.setColumnWidth(1, 70);   // Serial No
    sheet.setColumnWidth(2, 120);  // Inverter ID
    sheet.setColumnWidth(3, 280);  // Beneficiary Name
    sheet.setColumnWidth(4, 100);  // Capacity
    sheet.setColumnWidth(5, 280);  // Total Energy (with date range)
    sheet.setColumnWidth(6, 140);  // Avg Daily
    sheet.setColumnWidth(7, 140);  // Specific Yield
    sheet.setColumnWidth(8, 100);  // Days in Range
    sheet.setColumnWidth(9, 180);  // Lifetime Generation
    
    // ===== ADD SYNC INFO ROW (optional - small footer) =====
    var footerRow = dataStartRow + allRows.length + 1;
    var syncInfo = "Synced: " + timestamp + " | Records: " + allRows.length;
    sheet.getRange(footerRow, 1).setValue(syncInfo);
    sheet.getRange(footerRow, 1, 1, 9).merge();
    sheet.getRange(footerRow, 1).setFontColor("#6B7280");
    sheet.getRange(footerRow, 1).setFontSize(9);
    sheet.getRange(footerRow, 1).setFontStyle("italic");
    
    var finalRowCount = sheet.getLastRow();
    console.log("Final row count:", finalRowCount);
    console.log("============ syncCSVFormat END ============");
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Data synced successfully!",
      newRows: allRows.length,
      updatedRows: 0,
      totalRows: finalRowCount,
      timestamp: timestamp,
      debug: {
        headerRow: startRow,
        dataStartRow: dataStartRow,
        rowsWritten: allRows.length
      }
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("============ syncCSVFormat ERROR ============");
    console.error("Error:", error.toString());
    console.error("Stack:", error.stack);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Sync failed: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

function doOptions(e) {
  var response = ContentService.createTextOutput('');
  return setCorsHeaders(response);
}
