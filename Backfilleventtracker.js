/**
 * Strong Teams Automation - Backfill Event Tracker
 * 
 * @version 1.0.0
 * @description One-time script to populate email + file IDs for existing tracker records
 * @lastUpdated 2024-12-28
 * 
 * PURPOSE:
 * When upgrading to v2.0.0 (email-based lookup), existing Event Tracker records
 * don't have email, Build File ID, or Folder ID populated. This script:
 * 
 * 1. Scans existing Phase 1 records in Event Tracker
 * 2. Finds the corresponding Build File via folder search
 * 3. Extracts email from Build File (if stored) or uses name-based matching
 * 4. Populates the new columns: Leader Email, Build File ID, Leader Folder ID
 * 
 * RUN ONCE after upgrading to v2.0.0
 */

/**
 * DRY RUN - See what would be backfilled without making changes
 */
function backfillEventTrackerDryRun() {
  Logger.log('='.repeat(70));
  Logger.log('DRY RUN - BACKFILL EVENT TRACKER');
  Logger.log('(No changes will be made)');
  Logger.log('='.repeat(70));
  Logger.log('');
  
  const results = scanAndBackfill(true); // true = dry run
  
  logBackfillSummary(results, true);
}

/**
 * MAIN FUNCTION - Actually backfill the Event Tracker
 */
function backfillEventTrackerMetadata() {
  Logger.log('='.repeat(70));
  Logger.log('BACKFILL EVENT TRACKER - Adding Email & File IDs');
  Logger.log('='.repeat(70));
  Logger.log(`Started: ${new Date().toLocaleString()}`);
  Logger.log('');
  
  // First, ensure new columns exist
  Logger.log('Step 1: Checking for new columns...');
  ProcessedEventsTracker.migrateAddNewColumns();
  
  Logger.log('\nStep 2: Scanning and backfilling records...\n');
  const results = scanAndBackfill(false); // false = actually do it
  
  logBackfillSummary(results, false);
}

/**
 * Scan Event Tracker and backfill missing data
 * @param {boolean} dryRun - If true, don't make changes
 * @returns {Object} Results summary
 */
function scanAndBackfill(dryRun) {
  const results = {
    totalRecords: 0,
    phase1Records: 0,
    alreadyComplete: 0,
    updated: 0,
    notFound: 0,
    errors: 0,
    details: []
  };
  
  const ss = ProcessedEventsTracker.getTrackingSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
  
  if (!sheet) {
    Logger.log('⚠️ Tracking sheet not found');
    return results;
  }
  
  const data = sheet.getDataRange().getValues();
  results.totalRecords = data.length - 1; // Exclude header
  
  Logger.log(`Found ${results.totalRecords} total records\n`);
  
  // Column indices
  const COL = ProcessedEventsTracker.COLUMNS;
  
  // Process each row (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const phase = row[COL.PHASE];
    const leaderName = row[COL.LEADER_NAME];
    const company = row[COL.COMPANY];
    const existingEmail = row[COL.LEADER_EMAIL];
    const existingFileId = row[COL.BUILD_FILE_ID];
    
    // Only process Phase 1 records (they have Build Files)
    if (phase !== 'Phase 1') {
      continue;
    }
    
    results.phase1Records++;
    
    Logger.log(`\n${'─'.repeat(60)}`);
    Logger.log(`Record ${i}: ${leaderName} (${company})`);
    Logger.log('─'.repeat(60));
    
    // Check if already has data
    if (existingEmail && existingFileId) {
      Logger.log(`   ✓ Already complete - skipping`);
      results.alreadyComplete++;
      continue;
    }
    
    // Find Build File via folder search
    try {
      const buildFileResult = findBuildFileForBackfill(leaderName, company);
      
      if (!buildFileResult.found) {
        Logger.log(`   ✗ Build File NOT found`);
        results.notFound++;
        results.details.push({
          leaderName: leaderName,
          company: company,
          status: 'not_found'
        });
        continue;
      }
      
      Logger.log(`   ✓ Found Build File: ${buildFileResult.file.getName()}`);
      Logger.log(`   📁 Location: ${buildFileResult.companyFolder}/${buildFileResult.leaderFolder}`);
      
      // Extract email from Build File
      let email = '';
      try {
        email = extractEmailFromBuildFile(buildFileResult.file);
        Logger.log(`   📧 Email extracted: ${email || '(not found in file)'}`);
      } catch (e) {
        Logger.log(`   ⚠️ Could not extract email: ${e.message}`);
      }
      
      // Get IDs
      const buildFileId = buildFileResult.file.getId();
      const leaderFolderId = buildFileResult.leaderFolderId;
      
      Logger.log(`   📄 Build File ID: ${buildFileId}`);
      Logger.log(`   📁 Folder ID: ${leaderFolderId}`);
      
      if (dryRun) {
        Logger.log(`   → Would update row ${i + 1}`);
        results.updated++;
      } else {
        // Actually update the row
        const rowNum = i + 1; // 1-based for sheet
        
        // Update new columns (I, J, K = columns 9, 10, 11)
        sheet.getRange(rowNum, 9).setValue(email);           // Leader Email
        sheet.getRange(rowNum, 10).setValue(buildFileId);    // Build File ID
        sheet.getRange(rowNum, 11).setValue(leaderFolderId); // Leader Folder ID
        
        Logger.log(`   ✅ Updated row ${rowNum}`);
        results.updated++;
      }
      
      results.details.push({
        leaderName: leaderName,
        company: company,
        email: email,
        status: 'updated'
      });
      
    } catch (error) {
      Logger.log(`   ✗ Error: ${error.message}`);
      results.errors++;
      results.details.push({
        leaderName: leaderName,
        company: company,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Find Build File by leader name and company
 * @param {string} leaderName - Full name of leader
 * @param {string} company - Company name
 * @returns {Object} { found, file, companyFolder, leaderFolder, leaderFolderId }
 */
function findBuildFileForBackfill(leaderName, company) {
  const strongTeamsFolder = DriveApp.getFolderById(CONFIG.STRONG_TEAMS_FOLDER_ID);
  const buildFileName = `${leaderName} - Strong Teams Build File`;
  
  // Try expected company folder first
  if (company) {
    const result = searchCompanyForBuildFile(strongTeamsFolder, company, leaderName, buildFileName);
    if (result.found) return result;
  }
  
  // If not found, search all company folders
  const companyFolders = strongTeamsFolder.getFolders();
  
  while (companyFolders.hasNext()) {
    const companyFolder = companyFolders.next();
    const companyName = companyFolder.getName();
    
    // Skip if already checked or system folder
    if (companyName === company) continue;
    if (companyName.startsWith('_')) continue;
    if (companyName === 'Templates' || companyName === 'Archive') continue;
    
    const result = searchCompanyForBuildFile(strongTeamsFolder, companyName, leaderName, buildFileName);
    if (result.found) return result;
  }
  
  return { found: false };
}

/**
 * Search within a company folder for a Build File
 */
function searchCompanyForBuildFile(strongTeamsFolder, companyName, leaderName, buildFileName) {
  try {
    const companyFolders = strongTeamsFolder.getFoldersByName(companyName);
    if (!companyFolders.hasNext()) return { found: false };
    
    const companyFolder = companyFolders.next();
    
    // Look for leader folder
    const leaderFolders = companyFolder.getFoldersByName(leaderName);
    if (!leaderFolders.hasNext()) return { found: false };
    
    const leaderFolder = leaderFolders.next();
    
    // Look for Build File
    const buildFiles = leaderFolder.getFilesByName(buildFileName);
    if (!buildFiles.hasNext()) return { found: false };
    
    return {
      found: true,
      file: buildFiles.next(),
      companyFolder: companyName,
      leaderFolder: leaderName,
      leaderFolderId: leaderFolder.getId()
    };
    
  } catch (e) {
    return { found: false };
  }
}

/**
 * Extract email from Build File's Phase 1 Settings sheet
 * @param {File} buildFile - The Build File
 * @returns {string} Email address or empty string
 */
function extractEmailFromBuildFile(buildFile) {
  const ss = SpreadsheetApp.open(buildFile);
  const sheet = ss.getSheetByName(CONFIG.PHASE1.sheetName);
  
  if (!sheet) {
    return '';
  }
  
  // Check if there's an email row configured
  // Looking for common email row locations
  const possibleRows = [5, 6, 10, 11, 12]; // Adjust based on your template
  
  for (const row of possibleRows) {
    const label = sheet.getRange(row, 1).getValue().toString().toLowerCase();
    if (label.includes('email')) {
      const email = sheet.getRange(row, 2).getValue().toString().trim();
      if (email && email.includes('@')) {
        return email;
      }
    }
  }
  
  // Also check for email in row 4 or other common spots
  // Scan first 15 rows for email
  for (let row = 1; row <= 15; row++) {
    const cellB = sheet.getRange(row, 2).getValue().toString().trim();
    if (cellB && cellB.includes('@') && !cellB.includes('zoom') && !cellB.includes('http')) {
      return cellB;
    }
  }
  
  return '';
}

/**
 * Log backfill summary
 */
function logBackfillSummary(results, dryRun) {
  Logger.log('\n' + '='.repeat(70));
  Logger.log(dryRun ? 'DRY RUN SUMMARY' : 'BACKFILL SUMMARY');
  Logger.log('='.repeat(70));
  Logger.log(`Total records in tracker: ${results.totalRecords}`);
  Logger.log(`Phase 1 records: ${results.phase1Records}`);
  Logger.log(`Already complete: ${results.alreadyComplete}`);
  Logger.log(`${dryRun ? 'Would update' : 'Updated'}: ${results.updated}`);
  Logger.log(`Build File not found: ${results.notFound}`);
  Logger.log(`Errors: ${results.errors}`);
  
  if (results.notFound > 0) {
    Logger.log('\n⚠️ Records where Build File was not found:');
    results.details
      .filter(d => d.status === 'not_found')
      .forEach(d => Logger.log(`   - ${d.leaderName} (${d.company})`));
  }
  
  if (results.errors > 0) {
    Logger.log('\n❌ Records with errors:');
    results.details
      .filter(d => d.status === 'error')
      .forEach(d => Logger.log(`   - ${d.leaderName}: ${d.error}`));
  }
  
  if (dryRun) {
    Logger.log('\n💡 Run backfillEventTrackerMetadata() to actually make these updates.');
  } else {
    Logger.log('\n✓ Backfill complete!');
    Logger.log('Phase 2 events can now use email-based lookup.');
  }
  
  Logger.log('='.repeat(70));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * View current state of Event Tracker columns
 */
function viewEventTrackerColumns() {
  Logger.log('='.repeat(70));
  Logger.log('EVENT TRACKER COLUMN STATUS');
  Logger.log('='.repeat(70));
  
  const ss = ProcessedEventsTracker.getTrackingSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
  
  if (!sheet) {
    Logger.log('⚠️ Tracking sheet not found');
    return;
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const lastRow = sheet.getLastRow();
  
  Logger.log(`\n📊 Sheet: ${sheet.getName()}`);
  Logger.log(`   Rows: ${lastRow - 1} records (excluding header)`);
  Logger.log(`   Columns: ${headers.length}`);
  
  Logger.log('\n📋 Column Headers:');
  headers.forEach((header, index) => {
    Logger.log(`   ${String.fromCharCode(65 + index)}: ${header}`);
  });
  
  // Check for new columns
  const hasEmail = headers.includes('Leader Email');
  const hasFileId = headers.includes('Build File ID');
  const hasFolderId = headers.includes('Leader Folder ID');
  
  Logger.log('\n📋 New Column Status:');
  Logger.log(`   Leader Email: ${hasEmail ? '✓ Present' : '✗ Missing'}`);
  Logger.log(`   Build File ID: ${hasFileId ? '✓ Present' : '✗ Missing'}`);
  Logger.log(`   Leader Folder ID: ${hasFolderId ? '✓ Present' : '✗ Missing'}`);
  
  if (!hasEmail || !hasFileId || !hasFolderId) {
    Logger.log('\n⚠️ Some columns are missing!');
    Logger.log('   Run: migrateEventTracker() to add them');
  }
  
  // Count populated new columns
  if (hasEmail && lastRow > 1) {
    const emailCol = headers.indexOf('Leader Email') + 1;
    const fileIdCol = headers.indexOf('Build File ID') + 1;
    
    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    
    let withEmail = 0;
    let withFileId = 0;
    
    data.forEach(row => {
      if (row[emailCol - 1]) withEmail++;
      if (row[fileIdCol - 1]) withFileId++;
    });
    
    Logger.log('\n📊 Data Population:');
    Logger.log(`   Records with Email: ${withEmail}/${data.length}`);
    Logger.log(`   Records with File ID: ${withFileId}/${data.length}`);
    
    if (withEmail < data.length) {
      Logger.log('\n💡 Run backfillEventTrackerDryRun() to see what needs updating');
    }
  }
  
  Logger.log('\n' + '='.repeat(70));
}

/**
 * Test extracting email from a specific Build File
 */
function testEmailExtraction() {
  Logger.log('='.repeat(70));
  Logger.log('TEST EMAIL EXTRACTION FROM BUILD FILE');
  Logger.log('='.repeat(70));
  
  // Get first Phase 1 record from tracker
  const ss = ProcessedEventsTracker.getTrackingSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    Logger.log('⚠️ No records in tracker');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Find first Phase 1 record
  for (let i = 1; i < data.length; i++) {
    if (data[i][ProcessedEventsTracker.COLUMNS.PHASE] === 'Phase 1') {
      const leaderName = data[i][ProcessedEventsTracker.COLUMNS.LEADER_NAME];
      const company = data[i][ProcessedEventsTracker.COLUMNS.COMPANY];
      
      Logger.log(`\nTesting with: ${leaderName} (${company})`);
      
      const result = findBuildFileForBackfill(leaderName, company);
      
      if (result.found) {
        Logger.log(`✓ Found Build File: ${result.file.getName()}`);
        
        const email = extractEmailFromBuildFile(result.file);
        Logger.log(`📧 Extracted email: ${email || '(not found)'}`);
        
        // Show Build File structure
        Logger.log('\n📄 Build File Phase 1 Settings:');
        const buildSS = SpreadsheetApp.open(result.file);
        const phase1Sheet = buildSS.getSheetByName(CONFIG.PHASE1.sheetName);
        
        if (phase1Sheet) {
          for (let row = 1; row <= 15; row++) {
            const label = phase1Sheet.getRange(row, 1).getValue();
            const value = phase1Sheet.getRange(row, 2).getValue();
            if (label || value) {
              Logger.log(`   Row ${row}: "${label}" | "${value}"`);
            }
          }
        }
      } else {
        Logger.log(`✗ Build File not found`);
      }
      
      break; // Just test first one
    }
  }
  
  Logger.log('\n' + '='.repeat(70));
}

/**
 * Quick verification after backfill
 */
function verifyBackfill() {
  Logger.log('='.repeat(70));
  Logger.log('VERIFYING BACKFILL RESULTS');
  Logger.log('='.repeat(70));
  
  const stats = ProcessedEventsTracker.getStats();
  
  Logger.log(`\n📊 Event Tracker Statistics:`);
  Logger.log(`   Total records: ${stats.total}`);
  Logger.log(`   Phase 1: ${stats.phase1}`);
  Logger.log(`   Phase 2: ${stats.phase2}`);
  Logger.log(`   With Email: ${stats.withEmail}`);
  Logger.log(`   With File ID: ${stats.withFileId}`);
  
  const phase1Percentage = stats.phase1 > 0 
    ? Math.round((stats.withFileId / stats.phase1) * 100) 
    : 0;
  
  Logger.log(`\n📈 Phase 1 Coverage: ${phase1Percentage}%`);
  
  if (phase1Percentage === 100) {
    Logger.log(`   ✓ All Phase 1 records have file IDs!`);
    Logger.log(`   ✓ Email-based Phase 2 lookup is ready!`);
  } else if (phase1Percentage > 0) {
    Logger.log(`   ⚠️ Some Phase 1 records are missing file IDs`);
    Logger.log(`   Run backfillEventTrackerDryRun() to see details`);
  } else {
    Logger.log(`   ✗ No Phase 1 records have file IDs yet`);
    Logger.log(`   Run backfillEventTrackerMetadata() to populate`);
  }
  
  Logger.log(`\n📎 Spreadsheet: ${stats.spreadsheetUrl}`);
  Logger.log('='.repeat(70));
}