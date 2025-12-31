/**
 * DataImport.gs
 * Handles importing and processing data from IDS Export files (TSV/CSV)
 */

/**
 * Extracts data from IDS Export TSV or CSV and populates the Strengths Wheel sheet
 */
function extractIDSExportData() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Strengths Wheel');
  
  if (!sheet) {
    ui.alert('Error', 'Please make sure you have a sheet named "Strengths Wheel".', ui.ButtonSet.OK);
    return;
  }
  
  // Get the folder containing this spreadsheet
  var spreadsheetFile = DriveApp.getFileById(ss.getId());
  var folders = spreadsheetFile.getParents();
  
  if (!folders.hasNext()) {
    ui.alert('Error', 'Unable to access the folder containing this spreadsheet.', ui.ButtonSet.OK);
    return;
  }
  
  var folder = folders.next();
  
  // Look for .tsv or .csv file in the same folder
  var allFiles = folder.getFiles();
  var dataFile = null;
  var fileType = null;
  
  while (allFiles.hasNext()) {
    var file = allFiles.next();
    var fileName = file.getName().toLowerCase();
    
    // Check if file has .tsv or .csv extension
    if (fileName.endsWith('.tsv')) {
      dataFile = file;
      fileType = 'tsv';
      break; // Found a TSV file, stop searching
    } else if (fileName.endsWith('.csv')) {
      dataFile = file;
      fileType = 'csv';
      break; // Found a CSV file, stop searching
    }
  }
  
  // If no data file found, show error message
  if (!dataFile) {
    ui.alert(
      'Data Missing', 
      'No TSV or CSV file found in this folder.\n\n' +
      'Please upload the IDS export file (.tsv or .csv) for the team to the same Google Drive folder as this spreadsheet.\n\n' +
      'Accepted file types: .tsv or .csv',
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Read the file content
  try {
    var fileContent = dataFile.getBlob().getDataAsString();
    
    // Show which file is being processed
    ss.toast('Processing file: ' + dataFile.getName(), 'Importing...', 3);
    
    // Process the data with the appropriate delimiter
    processDelimitedData(fileContent, fileType);
    
  } catch (error) {
    ui.alert('Error', 'Failed to read data file: ' + error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Processes the delimited data (TSV or CSV) and writes to Strengths Wheel sheet
 */
function processDelimitedData(fileContent, fileType) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Strengths Wheel');
  
  if (!sheet) {
    throw new Error('Strengths Wheel sheet not found');
  }
  
  // Determine delimiter based on file type
  var delimiter = fileType === 'csv' ? ',' : '\t';
  
  // Parse delimited data
  var lines = fileContent.split('\n');
  if (lines.length < 2) {
    throw new Error('Data file appears to be empty or invalid');
  }
  
  // Get headers from first line
  var headers = lines[0].split(delimiter);
  
  // Find column indices
  var firstNameIndex = headers.indexOf('FIRST NAME');
  var lastNameIndex = headers.indexOf('LAST NAME');
  var wheelPosIndex = headers.indexOf('WHEEL POSITION 1');
  var dNaturalIndex = headers.indexOf('D NATURAL (%)');
  var iNaturalIndex = headers.indexOf('I NATURAL (%)');
  var sNaturalIndex = headers.indexOf('S NATURAL (%)');
  var cNaturalIndex = headers.indexOf('C NATURAL (%)');
  var dAdaptedIndex = headers.indexOf('D ADAPTED (%)');
  var iAdaptedIndex = headers.indexOf('I ADAPTED (%)');
  var sAdaptedIndex = headers.indexOf('S ADAPTED (%)');
  var cAdaptedIndex = headers.indexOf('C ADAPTED (%)');
  
  if (firstNameIndex === -1 || lastNameIndex === -1 || wheelPosIndex === -1) {
    throw new Error('Required columns not found. Make sure your file has FIRST NAME, LAST NAME, and WHEEL POSITION 1 columns.');
  }
  
  if (dNaturalIndex === -1 || iNaturalIndex === -1 || sNaturalIndex === -1 || cNaturalIndex === -1) {
    throw new Error('Natural percentage columns not found. Make sure your file has D NATURAL (%), I NATURAL (%), S NATURAL (%), and C NATURAL (%) columns.');
  }
  
  if (dAdaptedIndex === -1 || iAdaptedIndex === -1 || sAdaptedIndex === -1 || cAdaptedIndex === -1) {
    throw new Error('Adapted percentage columns not found. Make sure your file has D ADAPTED (%), I ADAPTED (%), S ADAPTED (%), and C ADAPTED (%) columns.');
  }
  
  // Clear existing data (except headers)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 10).clearContent();
  }
  
  // Process data rows
  var outputData = [];
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    var columns = line.split(delimiter);
    
    var firstName = columns[firstNameIndex] || '';
    var lastName = columns[lastNameIndex] || '';
    var wheelPos = columns[wheelPosIndex] || '';
    var dNatural = columns[dNaturalIndex] || '';
    var iNatural = columns[iNaturalIndex] || '';
    var sNatural = columns[sNaturalIndex] || '';
    var cNatural = columns[cNaturalIndex] || '';
    var dAdapted = columns[dAdaptedIndex] || '';
    var iAdapted = columns[iAdaptedIndex] || '';
    var sAdapted = columns[sAdaptedIndex] || '';
    var cAdapted = columns[cAdaptedIndex] || '';
    
    // Skip if all values are empty
    if (!firstName && !lastName && !wheelPos) continue;
    
    // Combine first and last name
    var fullName = (firstName + ' ' + lastName).trim();
    
    if (fullName) {
      outputData.push([fullName, wheelPos, dNatural, iNatural, sNatural, cNatural, 
                       dAdapted, iAdapted, sAdapted, cAdapted]);
    }
  }
  
  // Write data to sheet
  if (outputData.length > 0) {
    sheet.getRange(2, 1, outputData.length, 10).setValues(outputData);
    
    // Format the data
    var dataRange = sheet.getRange(2, 1, outputData.length, 10);
    dataRange.setFontFamily('Arial');
    dataRange.setFontSize(10);
    
    SpreadsheetApp.getActiveSpreadsheet().toast(
      outputData.length + ' record(s) imported successfully from ' + fileType.toUpperCase() + ' file!', 
      'Success', 
      5
    );
  } else {
    throw new Error('No valid data found in file');
  }
}

/**
 * Legacy function name kept for backward compatibility
 * Processes TSV data by calling processDelimitedData
 */
function processTSVData(tsvData) {
  processDelimitedData(tsvData, 'tsv');
}