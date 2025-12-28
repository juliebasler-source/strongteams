/**
 * Strong Teams Automation - Build File Manager
 * 
 * @version 1.2.0
 * @phase Phase 1 Enhanced - IDS API Integration + Validation Checkpoint
 * @description Handle copying, renaming, and populating the Strong Teams Build File
 * @lastUpdated 2024-12-27
 * 
 * Responsibilities:
 * - Copy Build File template
 * - Rename to leader-specific format
 * - Populate Phase 1 Settings sheet (rows 2, 3, 7, 9)
 * - Generate and store IDS assessment response link (row 4) - ONE TIME ONLY!
 * - Store IDS login code in Phase 1 Settings (row 8)
 * - Copy IDS login code to Phase 2 Settings (row 8)
 * - Handle updates to existing files WITHOUT generating new links
 * - VALIDATE Phase 1 success before marking complete
 * 
 * CHANGELOG v1.2.0:
 * - Added validatePhase1Success() function - NEW!
 * - IDS link generation now throws errors (critical path)
 * - Validation ensures IDS login code exists before tracking
 */

const BuildFileManager = {
  
  /**
   * Validate Phase 1 completion before marking as processed
   * Ensures all critical fields exist in Build File
   * 
   * @param {File} buildFile - The Build File to validate
   * @param {Object} eventData - Event data for logging
   * @returns {Object} Validation result {success: boolean, missingFields: array}
   * @throws {Error} If validation fails (prevents tracking)
   */
  validatePhase1Success: function(buildFile, eventData) {
    Logger.log('\n[VALIDATION] Checking Phase 1 completion...');
    
    const missingFields = [];
    
    try {
      // Open the spreadsheet
      const ss = SpreadsheetApp.open(buildFile);
      
      // Check 1: Phase 1 Settings sheet exists
      const sheet = ss.getSheetByName(CONFIG.PHASE1.sheetName);
      if (!sheet) {
        missingFields.push('Phase 1 Settings sheet');
        Logger.log('  ✗ Phase 1 Settings sheet is MISSING');
      } else {
        Logger.log('  ✓ Phase 1 Settings sheet exists');
        
        // Check 2: IDS login code exists (Row 8) - MOST CRITICAL!
        const loginCode = sheet.getRange(CONFIG.IDS_API.phase1LoginCodeRow, 2).getValue();
        if (!loginCode || loginCode === '') {
          missingFields.push('IDS login code (Row 8)');
          Logger.log('  ✗ IDS login code is MISSING in Row 8');
        } else {
          Logger.log(`  ✓ IDS login code exists: ${loginCode}`);
        }
        
        // Check 3: Phase 1 data populated
        const date = sheet.getRange(CONFIG.PHASE1.rows.date, 2).getValue();
        const time = sheet.getRange(CONFIG.PHASE1.rows.time, 2).getValue();
        const name = sheet.getRange(CONFIG.PHASE1.rows.name, 2).getValue();
        const zoom = sheet.getRange(CONFIG.PHASE1.rows.zoomLink, 2).getValue();
        
        if (!date || date === '') missingFields.push('Phase 1 date (Row 2)');
        if (!time || time === '') missingFields.push('Phase 1 time (Row 3)');
        if (!name || name === '') missingFields.push('Leader name (Row 7)');
        if (!zoom || zoom === '') missingFields.push('Zoom link (Row 9)');
        
        if (date && time && name && zoom) {
          Logger.log('  ✓ Phase 1 data populated');
        } else {
          Logger.log('  ✗ Some Phase 1 data fields are missing');
        }
      }
      
      // Evaluation
      if (missingFields.length === 0) {
        Logger.log('\n[VALIDATION] ✓ ALL CRITICAL FIELDS VERIFIED - Phase 1 is complete');
        return {
          success: true,
          missingFields: []
        };
      } else {
        const errorMsg = `CRITICAL: ${missingFields.join(', ')} - cannot mark as complete`;
        Logger.log(`\n[VALIDATION] ✗ FAILED - ${errorMsg}`);
        
        // Log big warning
        Logger.log('\n' + '⚠'.repeat(35));
        Logger.log('VALIDATION FAILED - EVENT WILL RETRY ON NEXT TRIGGER');
        Logger.log('⚠'.repeat(35) + '\n');
        
        // Throw error to prevent tracking
        throw new Error(`Phase 1 validation failed: ${missingFields.join(', ')} missing`);
      }
      
    } catch (error) {
      // If error is our validation error, re-throw it
      if (error.message.includes('Phase 1 validation failed')) {
        throw error;
      }
      
      // Otherwise, log unexpected error
      Logger.log(`  ✗ ERROR during validation: ${error.message}`);
      throw new Error(`Validation error: ${error.message}`);
    }
  },
  
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
   * Generate and store IDS response link
   * Creates a unique assessment link for the leader via IDS API
   * Stores login code (always) and optionally stores full URL (configurable)
   * Also copies login code to Phase 2 Settings
   * 
   * IMPORTANT: This should ONLY be called for NEW files!
   * 
   * CRITICAL CHANGE v1.2.0: Now throws errors instead of catching them!
   * If IDS link generation fails, the entire process fails (as it should)
   */
  updateResponseLink: function(buildFile, eventData) {
    // NO TRY-CATCH! Let errors bubble up to fail validation
    Logger.log(`  → Generating IDS response link...`);
    
    // Generate link via IDS API (returns object with loginCode and responseLink)
    // If this fails, error will be thrown and caught by processPhase1Event
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
  },
  
  /**
   * Copy IDS login code from Phase 1 to Phase 2 Settings
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