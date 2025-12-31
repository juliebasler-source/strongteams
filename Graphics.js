/**
 * Graphics.gs
 * Handles generation of Strengths Wheel and Strengths Charts (Natural & Movement)
 * Stores all SVG files in a "Graphics" subfolder
 */

/**
 * Helper function to get or create the Graphics subfolder
 */
function getOrCreateGraphicsFolder(parentFolder) {
  var graphicsFolderName = 'Graphics';
  var folders = parentFolder.getFoldersByName(graphicsFolderName);
  
  if (folders.hasNext()) {
    // Folder already exists
    return folders.next();
  } else {
    // Create the folder
    return parentFolder.createFolder(graphicsFolderName);
  }
}

/**
 * Show progress dialog with progress bar
 */
function showProgressDialog(title, message, current, total) {
  var html = HtmlService.createHtmlOutput(getProgressHtml(title, message, current, total))
    .setWidth(400)
    .setHeight(150);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Processing...');
}

/**
 * Update progress dialog
 */
function updateProgress(title, message, current, total) {
  showProgressDialog(title, message, current, total);
}

/**
 * Close progress dialog
 */
function closeProgressDialog() {
  var html = HtmlService.createHtmlOutput('<script>google.script.host.close();</script>')
    .setWidth(1)
    .setHeight(1);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Complete');
}

/**
 * Generate HTML for progress dialog
 */
function getProgressHtml(title, message, current, total) {
  var percentage = Math.round((current / total) * 100);
  
  var html = '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<base target="_top">' +
    '<style>' +
    'body {' +
    '  font-family: Arial, sans-serif;' +
    '  padding: 20px;' +
    '  margin: 0;' +
    '}' +
    'h3 {' +
    '  color: #3974BD;' +
    '  margin-top: 0;' +
    '  margin-bottom: 10px;' +
    '}' +
    '.message {' +
    '  margin-bottom: 15px;' +
    '  color: #666;' +
    '}' +
    '.progress-container {' +
    '  width: 100%;' +
    '  background-color: #f0f0f0;' +
    '  border-radius: 8px;' +
    '  overflow: hidden;' +
    '  height: 30px;' +
    '  margin-bottom: 10px;' +
    '}' +
    '.progress-bar {' +
    '  height: 100%;' +
    '  background: linear-gradient(90deg, #3974BD 0%, #5B9BD5 100%);' +
    '  width: ' + percentage + '%;' +
    '  transition: width 0.3s ease;' +
    '  display: flex;' +
    '  align-items: center;' +
    '  justify-content: center;' +
    '  color: white;' +
    '  font-weight: bold;' +
    '}' +
    '.progress-text {' +
    '  text-align: center;' +
    '  color: #666;' +
    '  font-size: 14px;' +
    '}' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<h3>' + title + '</h3>' +
    '<div class="message">' + message + '</div>' +
    '<div class="progress-container">' +
    '<div class="progress-bar">' + percentage + '%</div>' +
    '</div>' +
    '<div class="progress-text">' + current + ' of ' + total + ' completed</div>' +
    '</body>' +
    '</html>';
  
  return html;
}

/**
 * Test function to verify graphics generation is working
 * Run this first to ensure everything is properly configured
 */
function testGraphicsGeneration() {
  var ui = SpreadsheetApp.getUi();
  
  try {
    // Create a simple test SVG
    var testSvg = '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="200" height="200" fill="#3974BD"/>' +
      '<text x="100" y="100" font-family="Arial" font-size="20" fill="white" text-anchor="middle">TEST</text>' +
      '</svg>';
    
    ui.alert('Testing Graphics Generation', 'Creating test SVG file...', ui.ButtonSet.OK);
    
    // Create SVG blob
    var svgBlob = Utilities.newBlob(testSvg, 'image/svg+xml', 'test-graphics.svg');
    
    // Save test file to Graphics folder
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var spreadsheetFile = DriveApp.getFileById(ss.getId());
    var folders = spreadsheetFile.getParents();
    
    if (folders.hasNext()) {
      var parentFolder = folders.next();
      var graphicsFolder = getOrCreateGraphicsFolder(parentFolder);
      var testFile = DriveApp.createFile(svgBlob);
      graphicsFolder.addFile(testFile);
      DriveApp.getRootFolder().removeFile(testFile);
      
      ui.alert('Success!', 
        'Graphics generation is working correctly!\n\n' +
        'Test file created: test-graphics.svg\n' +
        'Location: Graphics subfolder\n\n' +
        'You can now use the main functions.', 
        ui.ButtonSet.OK);
    }
    
  } catch (error) {
    ui.alert('Graphics Generation Failed', 
      'Error: ' + error.toString() + '\n\n' +
      'Please verify:\n' +
      '1. You have edit access to this folder\n' +
      '2. Graphics folder can be created', 
      ui.ButtonSet.OK);
    Logger.log('Test failed: ' + error.toString());
  }
}

/**
 * Builds the Strengths Wheel URL, downloads the SVG, and saves it to Graphics subfolder
 */
function buildStrengthsWheelURL() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Strengths Wheel');
  
  if (!sheet) {
    ui.alert('Error', 'Please make sure you have a sheet named "Strengths Wheel" with naturalpos values in column B.', ui.ButtonSet.OK);
    return;
  }
  
  // Get leader name from Phase 1 Settings
  var phase1Sheet = ss.getSheetByName('Phase 1 Settings');
  var leaderName = '';
  if (phase1Sheet) {
    leaderName = phase1Sheet.getRange('B7').getValue();
    leaderName = leaderName ? leaderName.toString() : "";
  }
  
  if (!leaderName) {
    var response = ui.prompt('Leader Name Missing', 
                            'Enter the leader\'s name for the file:', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    leaderName = response.getResponseText();
    if (phase1Sheet) {
      phase1Sheet.getRange('B7').setValue(leaderName);
    }
  }
  
  var lastRow = sheet.getLastRow();
  var naturalPosValues = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  
  var positions = naturalPosValues
    .map(function(row) { return row[0]; })
    .filter(function(val) { return val !== "" && val !== null; });
  
  if (positions.length === 0) {
    ui.alert('Error', 'No wheel positions found in column B. Please extract data from IDS Export first.', ui.ButtonSet.OK);
    return;
  }
  
  var naturalPosString = positions.join(',');
  
  var url = "https://api.justrespond.com/api/v2/disc_wheel_graph.svg?naturalpos=" + 
            naturalPosString + 
            "&print-task-rings=false&mi-color-rings=false&print-disc-labels=false";
  
 
  
  try {
    // Show progress - Step 1: Downloading
    showProgressDialog('Creating Strengths Wheel', 'Downloading SVG from API...', 1, 2);
    
    // Download the SVG from the API
    var response = UrlFetchApp.fetch(url);
    var svgContent = response.getContentText();
    
    // Show progress - Step 2: Saving
    updateProgress('Creating Strengths Wheel', 'Saving to Graphics folder...', 2, 2);
    
    // Create SVG blob
    var svgBlob = Utilities.newBlob(svgContent, 'image/svg+xml', leaderName + ' - Phase 2 Team Strengths Wheel.svg');
    
    // Create the SVG file in Drive
    var file = DriveApp.createFile(svgBlob);
    
    // Get or create Graphics subfolder
    var spreadsheetFile = DriveApp.getFileById(ss.getId());
    var folders = spreadsheetFile.getParents();
    
    if (folders.hasNext()) {
      var parentFolder = folders.next();
      var graphicsFolder = getOrCreateGraphicsFolder(parentFolder);
      graphicsFolder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }
    
    // Close progress dialog
    closeProgressDialog();
    
    ss.toast('Strengths Wheel SVG file created and saved to Graphics folder: ' + leaderName + ' - Phase 2 Team Strengths Wheel.svg', 'Success', 5);
    
  } catch (error) {
    closeProgressDialog();
    ui.alert('Error', 'Failed to download Strengths Wheel: ' + error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Generates both Natural and Strengths Movement Charts for each team member
 */
function generateStrengthsCharts() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Strengths Wheel');
  
  if (!sheet) {
    ui.alert('Error', 'Please make sure you have a sheet named "Strengths Wheel".', ui.ButtonSet.OK);
    return;
  }
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('Error', 'No data found. Please extract data from IDS Export first.', ui.ButtonSet.OK);
    return;
  }
  
  // Get all data (Name and all percentages)
  var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  
  // Filter out empty rows
  data = data.filter(function(row) {
    return row[0] !== "" && row[0] !== null;
  });
  
  if (data.length === 0) {
    ui.alert('Error', 'No valid data found. Please extract data from IDS Export first.', ui.ButtonSet.OK);
    return;
  }
  
  // Get the Graphics subfolder
  var spreadsheetFile = DriveApp.getFileById(ss.getId());
  var folders = spreadsheetFile.getParents();
  var graphicsFolder;
  
  if (folders.hasNext()) {
    var parentFolder = folders.next();
    graphicsFolder = getOrCreateGraphicsFolder(parentFolder);
  } else {
    graphicsFolder = DriveApp.getRootFolder();
  }
  
  ss.toast('Generating Strengths Charts for ' + data.length + ' team member(s)...', 'Processing', 3);
  
  // Show initial progress dialog
  var totalCharts = data.length * 2; // 2 charts per person (Natural + Movement)
  showProgressDialog('Generating Strengths Charts', 'Preparing to process ' + data.length + ' team member(s)...', 0, totalCharts);
  
  var successCount = 0;
  var skipCount = 0;
  var errorCount = 0;
  var errors = [];
  
  // Generate charts for each person
  for (var i = 0; i < data.length; i++) {
    var name = data[i][0];
    var dNatural = data[i][2];
    var iNatural = data[i][3];
    var sNatural = data[i][4];
    var cNatural = data[i][5];
    var dAdapted = data[i][6];
    var iAdapted = data[i][7];
    var sAdapted = data[i][8];
    var cAdapted = data[i][9];
    
    // Check for missing data
    var missingNatural = !dNatural || !iNatural || !sNatural || !cNatural;
    var missingAdapted = !dAdapted || !iAdapted || !sAdapted || !cAdapted;
    
    if (missingNatural || missingAdapted) {
      var missingFields = [];
      if (missingNatural) missingFields.push('Natural percentages');
      if (missingAdapted) missingFields.push('Adapted percentages');
      
      var response = ui.alert(
        'Missing Data for ' + name,
        'Missing: ' + missingFields.join(', ') + '\n\nWhat would you like to do?',
        ui.ButtonSet.YES_NO_CANCEL
      );
      
      if (response == ui.Button.YES) {
        // User wants to enter data manually - for now we'll skip
        // (Manual entry would require a more complex HTML dialog)
        ui.alert('Manual Entry', 'Please update the data in the spreadsheet and run this function again.', ui.ButtonSet.OK);
        skipCount++;
        updateProgress('Generating Strengths Charts', 'Skipped: ' + name + ' (missing data)', successCount, totalCharts);
        continue;
      } else if (response == ui.Button.NO) {
        // Skip this person
        skipCount++;
        updateProgress('Generating Strengths Charts', 'Skipped: ' + name, successCount, totalCharts);
        continue;
      } else {
        // Cancel entire operation
        closeProgressDialog();
        ui.alert('Operation Cancelled', 'Chart generation cancelled by user.', ui.ButtonSet.OK);
        return;
      }
    }
    
    try {
      // Generate Natural Strengths Chart
      var naturalChartSvg = generateChartSvg(name, dNatural, iNatural, sNatural, cNatural, 
                                             dAdapted, iAdapted, sAdapted, cAdapted, false);
      var naturalFileName = name + ' - Natural Strengths Chart.svg';
      var naturalBlob = Utilities.newBlob(naturalChartSvg, 'image/svg+xml', naturalFileName);
      var naturalFile = DriveApp.createFile(naturalBlob);
      graphicsFolder.addFile(naturalFile);
      DriveApp.getRootFolder().removeFile(naturalFile);
      
      successCount++; // Count Natural chart
      updateProgress('Generating Strengths Charts', 'Processing: ' + name + ' (Natural Chart)', successCount, totalCharts);
      
      // Generate Strengths Movement Chart
      var movementChartSvg = generateChartSvg(name, dNatural, iNatural, sNatural, cNatural, 
                                              dAdapted, iAdapted, sAdapted, cAdapted, true);
      var movementFileName = name + ' - Strengths Movement Chart.svg';
      var movementBlob = Utilities.newBlob(movementChartSvg, 'image/svg+xml', movementFileName);
      var movementFile = DriveApp.createFile(movementBlob);
      graphicsFolder.addFile(movementFile);
      DriveApp.getRootFolder().removeFile(movementFile);
      
      successCount++; // Count Movement chart
      updateProgress('Generating Strengths Charts', 'Completed: ' + name + ' (2 charts)', successCount, totalCharts);
      
    } catch (error) {
      errors.push(name + ': ' + error.toString());
      errorCount++;
      updateProgress('Generating Strengths Charts', 'Error processing: ' + name, successCount, totalCharts);
    }
  }
  
  // Close progress dialog
  closeProgressDialog();
  
  // Show results
  var message = 'Successfully generated ' + successCount + ' chart(s)';
  if (skipCount > 0) {
    message += '\nSkipped: ' + skipCount + ' person(s)';
  }
  if (errorCount > 0) {
    message += '\n\nFailed: ' + errorCount + ' person(s)';
    if (errors.length > 0 && errors.length <= 5) {
      message += '\n\nErrors:\n' + errors.join('\n');
    }
  }
  
  ui.alert('Strengths Charts Generated', message, ui.ButtonSet.OK);
  
  if (successCount > 0) {
    ss.toast('Generated ' + successCount + ' Strengths Chart SVG file(s) in the Graphics folder', 'Success', 5);
  }
}

/**
 * Helper function to generate a chart SVG with the name added
 */
function generateChartSvg(name, dNatural, iNatural, sNatural, cNatural, 
                          dAdapted, iAdapted, sAdapted, cAdapted, printAdapted) {
  // Build the API URL
  var baseUrl = 'https://api.justrespond.com/api/v2/mi_chart_v2.svg';
  var params = [
    'center-labels=Problem+Solving%2CProcessing+Information%2CManaging+Change%2CFacing+Risk',
    'filled-bg=true',
    'print-adapted=' + (printAdapted ? 'true' : 'false'),
    'neutral-label=neutral',
    'natural-scores=' + dNatural + '%2C' + iNatural + '%2C' + sNatural + '%2C' + cNatural,
    'adapted-scores=' + dAdapted + '%2C' + iAdapted + '%2C' + sAdapted + '%2C' + cAdapted,
    'right-labels=Take+Charge%2COptimistic%2CPredictable%2CStructured',
    'text-color=black',
    'legend-labels=Natural+Strengths%2CStrengths+Movement',
    'left-labels=Reflective%2CRealistic%2CDynamic%2CPioneering'
  ];
  
  var chartUrl = baseUrl + '?' + params.join('&');
  
  // Fetch the SVG from the API
  var response = UrlFetchApp.fetch(chartUrl);
  var svgContent = response.getContentText();
  
  // Modify the SVG to add the name
  var modifiedSvg = addNameToSvg(svgContent, name);
  
  return modifiedSvg;
}

/**
 * Helper function to add a name on the same line as the legend, right-justified
 */
function addNameToSvg(svgContent, name) {
  // Parse the SVG to find its dimensions
  var widthMatch = svgContent.match(/width="(\d+)"/);
  var heightMatch = svgContent.match(/height="(\d+)"/);
  
  if (!widthMatch || !heightMatch) {
    // If we can't find dimensions, return original
    return svgContent;
  }
  
  var originalWidth = parseInt(widthMatch[1]);
  var originalHeight = parseInt(heightMatch[1]);
  
  // Position name on the same line as legend (bottom of chart)
  // Legend typically appears at bottom, so we'll position slightly above the very bottom
  var textX = originalWidth - 20; // 20 pixels from right edge
  var textY = originalHeight - 20; // 20 pixels from bottom
  
  // Create the text element (right-justified with text-anchor="end")
  var textElement = '<text x="' + textX + '" y="' + textY + '" ' +
                   'font-family="Arial" font-size="32" font-weight="bold" ' +
                   'fill="#3974BD" text-anchor="end">' + 
                   escapeXml(name) + '</text>';
  
  // Add the text element before the closing </svg> tag
  // No need to modify height since we're not adding space below
  svgContent = svgContent.replace('</svg>', textElement + '\n</svg>');
  
  return svgContent;
}

/**
 * Helper function to escape XML special characters
 */
function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}