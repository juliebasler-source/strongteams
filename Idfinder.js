/**
 * ID Finder Utilities - Helper functions to find Google Drive IDs
 * Run these functions to get the IDs you need for Config.gs
 */

/**
 * Find your Strong Teams folder
 */
function findStrongTeamsFolder() {
  Logger.log('=== FINDING STRONG TEAMS FOLDER ===\n');
  
  const folders = DriveApp.searchFolders('title contains "Strong Teams"');
  
  if (!folders.hasNext()) {
    Logger.log('❌ No folders found with "Strong Teams" in the name');
    Logger.log('\nOptions:');
    Logger.log('1. Create a folder called "Strong Teams" in Google Drive');
    Logger.log('2. Or modify the search term in this function');
    return;
  }
  
  Logger.log('Found folders:\n');
  
  while (folders.hasNext()) {
    const folder = folders.next();
    Logger.log(`📁 ${folder.getName()}`);
    Logger.log(`   ID: ${folder.getId()}`);
    Logger.log(`   URL: ${folder.getUrl()}`);
    Logger.log('');
  }
  
  Logger.log('\nCopy the ID above and paste it into Config.gs:');
  Logger.log('STRONG_TEAMS_FOLDER_ID: "PASTE_ID_HERE"');
}

/**
 * Find template files
 */
function findTemplateFiles() {
  Logger.log('=== FINDING TEMPLATE FILES ===\n');
  
  const searchTerms = ['Strong Teams Build', 'Build File Template'];
  
  searchTerms.forEach(term => {
    Logger.log(`Searching for: "${term}"`);
    Logger.log('─'.repeat(50));
    
    const files = DriveApp.searchFiles(`title contains "${term}"`);
    
    if (!files.hasNext()) {
      Logger.log(`No files found\n`);
      return;
    }
    
    while (files.hasNext()) {
      const file = files.next();
      Logger.log(`📄 ${file.getName()}`);
      Logger.log(`   ID: ${file.getId()}`);
      Logger.log(`   URL: ${file.getUrl()}`);
      Logger.log('');
    }
  });
  
  Logger.log('\nYour Build File Template ID is already in Config.gs:');
  Logger.log('buildFile: "1HGa3SH8VE8xLEdmrLxOUPxF8qjF6AU33FY3lf6Z31wY"');
}

/**
 * Test if an ID is valid
 */
function testFolderID(id) {
  Logger.log(`Testing Folder ID: ${id}\n`);
  
  try {
    const folder = DriveApp.getFolderById(id);
    Logger.log(`✅ Valid folder ID!`);
    Logger.log(`   Name: ${folder.getName()}`);
    Logger.log(`   URL: ${folder.getUrl()}`);
    return true;
  } catch (e) {
    Logger.log(`❌ Invalid folder ID`);
    Logger.log(`   Error: ${e.message}`);
    return false;
  }
}

/**
 * Test if file ID is valid
 */
function testFileID(id) {
  Logger.log(`Testing File ID: ${id}\n`);
  
  try {
    const file = DriveApp.getFileById(id);
    Logger.log(`✅ Valid file ID!`);
    Logger.log(`   Name: ${file.getName()}`);
    Logger.log(`   URL: ${file.getUrl()}`);
    return true;
  } catch (e) {
    Logger.log(`❌ Invalid file ID`);
    Logger.log(`   Error: ${e.message}`);
    return false;
  }
}

/**
 * Test your Build File template ID
 */
function testBuildFileTemplate() {
  const templateID = '1HGa3SH8VE8xLEdmrLxOUPxF8qjF6AU33FY3lf6Z31wY';
  
  Logger.log('=== TESTING BUILD FILE TEMPLATE ===\n');
  Logger.log(`Template ID: ${templateID}\n`);
  
  try {
    const file = DriveApp.getFileById(templateID);
    Logger.log(`✅ Template found!`);
    Logger.log(`   Name: ${file.getName()}`);
    Logger.log(`   URL: ${file.getUrl()}\n`);
    
    // Try to open as spreadsheet
    const ss = SpreadsheetApp.open(file);
    const sheets = ss.getSheets();
    
    Logger.log(`   Sheets in template:`);
    sheets.forEach(sheet => {
      Logger.log(`   - ${sheet.getName()}`);
    });
    
    // Check for Phase 1 Settings sheet
    const phase1Sheet = ss.getSheetByName('Phase 1 Settings');
    if (phase1Sheet) {
      Logger.log(`\n✅ "Phase 1 Settings" sheet found!`);
      
      // Show first few rows
      Logger.log(`\n   Current values in Phase 1 Settings:`);
      for (let i = 1; i <= 10; i++) {
        const labelCell = phase1Sheet.getRange(i, 1).getValue();
        const valueCell = phase1Sheet.getRange(i, 2).getValue();
        if (labelCell || valueCell) {
          Logger.log(`   Row ${i}: "${labelCell}" | "${valueCell}"`);
        }
      }
    } else {
      Logger.log(`\n⚠️  WARNING: "Phase 1 Settings" sheet not found!`);
      Logger.log(`   Available sheets: ${sheets.map(s => s.getName()).join(', ')}`);
    }
    
  } catch (e) {
    Logger.log(`❌ Error: ${e.message}`);
  }
}

/**
 * Create ID reference sheet for easy tracking
 */
function createIDReferenceSheet() {
  const ss = SpreadsheetApp.create('🔑 Strong Teams - ID Reference');
  const sheet = ss.getActiveSheet();
  sheet.setName('Configuration IDs');
  
  // Headers
  sheet.getRange('A1:C1').setValues([['Type', 'Name', 'ID / Value']]);
  sheet.getRange('A1:C1').setFontWeight('bold');
  sheet.getRange('A1:C1').setBackground('#1a73e8');
  sheet.getRange('A1:C1').setFontColor('#ffffff');
  
  // Data rows
  const data = [
    ['', '', ''],
    ['Folder', 'Strong Teams (Main Folder)', 'PASTE_YOUR_FOLDER_ID_HERE'],
    ['', '', ''],
    ['Template', 'Strong Teams Build File', '1HGa3SH8VE8xLEdmrLxOUPxF8qjF6AU33FY3lf6Z31wY'],
    ['', '', ''],
    ['Email', 'Admin Email (for notifications)', 'YOUR_EMAIL@DOMAIN.COM'],
    ['', '', ''],
    ['Calendar', 'Primary Calendar ID', CalendarApp.getDefaultCalendar().getId()],
  ];
  
  sheet.getRange(2, 1, data.length, 3).setValues(data);
  
  // Formatting
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 300);
  sheet.setColumnWidth(3, 450);
  
  sheet.getRange('A2:C2').setBackground('#e8f0fe');
  sheet.getRange('A4:C4').setBackground('#e8f0fe');
  sheet.getRange('A6:C6').setBackground('#e8f0fe');
  sheet.getRange('A8:C8').setBackground('#e8f0fe');
  
  // Instructions
  sheet.getRange('A11').setValue('INSTRUCTIONS:');
  sheet.getRange('A11').setFontWeight('bold');
  sheet.getRange('A12').setValue('1. Find your Strong Teams folder ID by running: findStrongTeamsFolder()');
  sheet.getRange('A13').setValue('2. Paste the folder ID in row 3 above');
  sheet.getRange('A14').setValue('3. Update your admin email in row 7');
  sheet.getRange('A15').setValue('4. Copy all IDs to Config.gs in your Apps Script project');
  
  Logger.log(`✅ ID Reference Sheet created!`);
  Logger.log(`Open it here: ${ss.getUrl()}`);
  Logger.log(`\nFill in the missing IDs, then copy them to Config.gs`);
  
  return ss;
}

/**
 * Complete setup check - verifies all IDs are configured
 */
function checkSetupComplete() {
  Logger.log('=== SETUP VERIFICATION ===\n');
  
  let allGood = true;
  
  // Check folder ID
  Logger.log('1. Checking Strong Teams folder ID...');
  if (CONFIG.STRONG_TEAMS_FOLDER_ID === 'YOUR_STRONG_TEAMS_FOLDER_ID_HERE') {
    Logger.log('   ❌ Not configured yet');
    Logger.log('   → Run: findStrongTeamsFolder()');
    allGood = false;
  } else {
    try {
      const folder = DriveApp.getFolderById(CONFIG.STRONG_TEAMS_FOLDER_ID);
      Logger.log(`   ✅ Valid: ${folder.getName()}`);
    } catch (e) {
      Logger.log(`   ❌ Invalid ID: ${e.message}`);
      allGood = false;
    }
  }
  
  // Check template ID
  Logger.log('\n2. Checking Build File template ID...');
  try {
    const file = DriveApp.getFileById(CONFIG.TEMPLATES.buildFile);
    Logger.log(`   ✅ Valid: ${file.getName()}`);
  } catch (e) {
    Logger.log(`   ❌ Invalid ID: ${e.message}`);
    allGood = false;
  }
  
  // Check email
  Logger.log('\n3. Checking admin email...');
  if (CONFIG.EMAIL.adminEmail === 'YOUR_EMAIL@DOMAIN.COM') {
    Logger.log('   ❌ Not configured yet');
    allGood = false;
  } else {
    Logger.log(`   ✅ Set to: ${CONFIG.EMAIL.adminEmail}`);
  }
  
  // Summary
  Logger.log('\n' + '='.repeat(50));
  if (allGood) {
    Logger.log('✅ ALL CHECKS PASSED - Ready to use!');
    Logger.log('\nNext step: Set up calendar trigger');
    Logger.log('Instructions in the README');
  } else {
    Logger.log('❌ SETUP INCOMPLETE - Fix issues above');
    Logger.log('\nRun the suggested functions to get missing IDs');
  }
  Logger.log('='.repeat(50));
}