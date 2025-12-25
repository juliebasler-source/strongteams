/**
 * Strong Teams Automation - Build File Manager
 * 
 * @version 1.1.5
 * @phase Phase 1 Enhanced - IDS API Integration
 * @description Handle copying, renaming, and populating the Strong Teams Build File
 * @lastUpdated 2024-12-24
 * 
 * Responsibilities:
 * - Copy Build File template
 * - Rename to leader-specific format
 * - Populate Phase 1 Settings sheet (rows 2, 3, 7, 9)
 * - Optionally generate and store IDS assessment response link (row 4) - ONE TIME ONLY!
 * - Store IDS login code in Phase 1 Settings (row 8)
 * - Copy IDS login code to Phase 2 Settings (row 8)
 * - Handle updates to existing files WITHOUT generating new links
 * 
 * CHANGELOG v1.1.5:
 * - Added CONFIG toggle for URL storage (storeFullUrlInRow4)
 * - Disabled automatic URL storage by default (Row 4 stays empty)
 * - Login code still stored and copied to Phase 2
 * - Easy rollback via config flag if needed
 * 
 * CHANGELOG v1.1.4:
 * - CRITICAL FIX: Only generate IDS link for NEW files, not updates
 * - Prevents duplicate link creation every 5 minutes
 * 
 * CHANGELOG v1.1.3:
 * - Added copyLoginCodeToPhase2() function
 * - Phase 1 automation now copies login code to Phase 2 Settings B8
 * 
 * CHANGELOG v1.1.1:
 * - Added login code storage in Row 8
 * 
 * CHANGELOG v1.1.0:
 * - Added IDS response link generation via updateResponseLink()
 * - Now calls IDSUtils to generate unique assessment links
 */

const BuildFileManager = {
  
  /**
   * Main function to handle Build File for a leader
   * Checks if file exists, updates it, or creates new one
   * CRITICAL: Only generates IDS link for NEW files (one and done!)
   */
  processLeaderBuildFile: function(eventData, leaderFolder) {
    const buildFileName = `${eventData.fullName} - Strong Teams Build File`;
    
    // Check if Build File already exists (for updates)
    let buildFile = FolderUtils.findFileInFolder(leaderFolder, buildFileName);
    
    if (buildFile) {
      // EXISTING FILE - Update Phase 1 data only (no new IDS link!)
      Logger.log(`  ✓ Found existing Build File: ${buildFileName}`);
      Logger.log(`  → Updating Phase 1 data (keeping existing IDS link)...`);
      this.updatePhase1Settings(buildFile, eventData);
      
      // DO NOT generate new IDS link! Link was created when file was first made
      
      return buildFile;
    }
    
    // NEW FILE - Create, populate, and generate IDS link (ONE TIME ONLY!)
    Logger.log(`  + Creating new Build File: ${buildFileName}`);
    buildFile = this.createNewBuildFile(buildFileName, leaderFolder);
    
    // Populate Phase 1 data
    this.updatePhase1Settings(buildFile, eventData);
    
    // Generate and store IDS response link (ONLY for new files!)
    this.updateResponseLink(buildFile, eventData);
    
    return buildFile;
  },
  
  /**
   * Create new Build File by copying template
   */
  createNewBuildFile: function(fileName, destinationFolder) {
    try {
      // Get template file
      const templateFile = DriveApp.getFileById(CONFIG.TEMPLATES.buildFile);
      Logger.log(`  → Copying template: ${templateFile.getName()}`);
      
      // Make a copy in the leader's folder
      const copiedFile = templateFile.makeCopy(fileName, destinationFolder);
      Logger.log(`  ✓ Build File created successfully`);
      
      return copiedFile;
      
    } catch (error) {
      Logger.log(`  ✗ ERROR creating Build File: ${error.message}`);
      throw new Error(`Failed to create Build File: ${error.message}`);
    }
  },
  
  /**
   * Update Phase 1 Settings sheet with event data
   */
  updatePhase1Settings: function(buildFile, eventData) {
    try {
      // Open the spreadsheet
      const ss = SpreadsheetApp.open(buildFile);
      
      // Get Phase 1 Settings sheet
      let sheet = ss.getSheetByName(CONFIG.PHASE1.sheetName);
      
      if (!sheet) {
        throw new Error(`Sheet "${CONFIG.PHASE1.sheetName}" not found in Build File`);
      }
      
      // Update each field in column B
      const rows = CONFIG.PHASE1.rows;
      
      sheet.getRange(rows.date, 2).setValue(eventData.formattedDate);
      sheet.getRange(rows.time, 2).setValue(eventData.formattedTime);
      sheet.getRange(rows.name, 2).setValue(eventData.fullName);
      sheet.getRange(rows.zoomLink, 2).setValue(eventData.zoomLink);
      
      Logger.log(`  ✓ Phase 1 Settings updated:`);
      Logger.log(`    - Date: ${eventData.formattedDate}`);
      Logger.log(`    - Time: ${eventData.formattedTime}`);
      Logger.log(`    - Leader: ${eventData.fullName}`);
      Logger.log(`    - Zoom: ${eventData.zoomLink}`);
      
      // Flush changes
      SpreadsheetApp.flush();
      
    } catch (error) {
      Logger.log(`  ✗ ERROR updating Phase 1 Settings: ${error.message}`);
      throw new Error(`Failed to update Phase 1 Settings: ${error.message}`);
    }
  },
  
  /**
   * Generate and store IDS response link (Modified in v1.1.5)
   * Creates a unique assessment link for the leader via IDS API
   * Stores login code (always) and optionally stores full URL (configurable)
   * Also copies login code to Phase 2 Settings
   * 
   * IMPORTANT: This should ONLY be called for NEW files!
   * 
   * NOTE: Full URL storage can be enabled/disabled via CONFIG.IDS_API.storeFullUrlInRow4
   */
  updateResponseLink: function(buildFile, eventData) {
    try {
      Logger.log(`  → Generating IDS response link...`);
      
      // Generate link via IDS API (returns object with loginCode and responseLink)
      const result = IDSUtils.generateResponseLink(eventData);
      
      // Open spreadsheet
      const ss = SpreadsheetApp.open(buildFile);
      const sheet = ss.getSheetByName(CONFIG.PHASE1.sheetName);
      
      if (!sheet) {
        throw new Error(`Sheet "${CONFIG.PHASE1.sheetName}" not found`);
      }
      
      // CONDITIONAL: Only store full URL if config says to (disabled by default in v1.1.5)
      if (CONFIG.IDS_API.storeFullUrlInRow4) {
        sheet.getRange(CONFIG.IDS_API.phase1LinkRow, 2).setValue(result.responseLink);
        Logger.log(`  ✓ Full URL stored in Row ${CONFIG.IDS_API.phase1LinkRow}`);
        Logger.log(`    - URL: ${result.responseLink}`);
      } else {
        Logger.log(`  ℹ Full URL storage disabled (Row ${CONFIG.IDS_API.phase1LinkRow} will remain empty)`);
        Logger.log(`    - To enable: Set CONFIG.IDS_API.storeFullUrlInRow4 = true`);
      }
      
      // ALWAYS store login code in Row 8 (Response Link)
      sheet.getRange(CONFIG.IDS_API.phase1LoginCodeRow, 2).setValue(result.loginCode);
      
      Logger.log(`  ✓ Login code stored in Build File`);
      Logger.log(`    - Row ${CONFIG.IDS_API.phase1LoginCodeRow}: ${result.loginCode}`);
      
      // Copy login code to Phase 2 Settings B8
      this.copyLoginCodeToPhase2(ss, result.loginCode);
      
      SpreadsheetApp.flush();
      
    } catch (error) {
      Logger.log(`  ✗ WARNING: Could not generate response link: ${error.message}`);
      Logger.log(`  → The Build File was still created successfully`);
      Logger.log(`  → You can manually create the response link if needed`);
      
      // Don't throw - we don't want to fail the entire process if link generation fails
      // The Build File is still valid, just missing the assessment link
    }
  },
  
  /**
   * Copy IDS login code from Phase 1 to Phase 2 Settings (NEW in v1.1.3)
   * The same login code is used for all phases of the program
   */
  copyLoginCodeToPhase2: function(spreadsheet, loginCode) {
    try {
      // Get Phase 2 Settings sheet
      const phase2Sheet = spreadsheet.getSheetByName(CONFIG.PHASE2.sheetName);
      
      if (!phase2Sheet) {
        Logger.log(`  ℹ Phase 2 Settings sheet not found - skipping copy`);
        return;
      }
      
      // Copy login code to Phase 2 Settings B8
      phase2Sheet.getRange(CONFIG.IDS_API.phase2LoginCodeRow, 2).setValue(loginCode);
      
      Logger.log(`  ✓ Login code copied to Phase 2 Settings B8`);
      Logger.log(`    - Login Code: ${loginCode}`);
      
    } catch (error) {
      Logger.log(`  ⚠ Could not copy login code to Phase 2: ${error.message}`);
      // Don't throw - this is not critical
    }
  },
  
  /**
   * Get Build File spreadsheet object (for future use)
   */
  getBuildFileSpreadsheet: function(buildFile) {
    return SpreadsheetApp.open(buildFile);
  },
  /**
 * Update Phase 2 Settings sheet with event data
 * @param {File} buildFile - The Build File to update
 * @param {Object} eventData - Event data with date, time, zoomLink
 * @since v1.1.0
 */
updatePhase2Settings: function(buildFile, eventData) {
  try {
    // Open the spreadsheet
    const ss = SpreadsheetApp.open(buildFile);
    
    // Get Phase 2 Settings sheet
    let sheet = ss.getSheetByName(CONFIG.PHASE2.sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${CONFIG.PHASE2.sheetName}" not found in Build File`);
    }
    
    // Update Phase 2 fields
    const rows = CONFIG.PHASE2.rows;
    
    sheet.getRange(rows.date, 2).setValue(eventData.formattedDate);
    sheet.getRange(rows.time, 2).setValue(eventData.formattedTime);
    sheet.getRange(rows.zoomLink, 2).setValue(eventData.zoomLink);
    
    Logger.log(`  ✓ Phase 2 Settings updated:`);
    Logger.log(`    - Date: ${eventData.formattedDate}`);
    Logger.log(`    - Time: ${eventData.formattedTime}`);
    Logger.log(`    - Zoom: ${eventData.zoomLink}`);
    
    // Copy login code from Phase 1 to Phase 2 (if it exists)
    try {
      const phase1Sheet = ss.getSheetByName(CONFIG.PHASE1.sheetName);
      if (phase1Sheet) {
        const loginCode = phase1Sheet.getRange(CONFIG.IDS_API.phase1LoginCodeRow, 2).getValue();
        if (loginCode) {
          sheet.getRange(CONFIG.IDS_API.phase2LoginCodeRow, 2).setValue(loginCode);
          Logger.log(`    - Login Code: ${loginCode} (copied from Phase 1)`);
        }
      }
    } catch (e) {
      Logger.log(`    ⚠ Could not copy login code: ${e.message}`);
    }
    
    // Flush changes
    SpreadsheetApp.flush();
    
  } catch (error) {
    Logger.log(`  ✗ ERROR updating Phase 2 Settings: ${error.message}`);
    throw new Error(`Failed to update Phase 2 Settings: ${error.message}`);
  }
}
};