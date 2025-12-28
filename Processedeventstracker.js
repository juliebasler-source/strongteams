/**
 * Strong Teams Automation - Processed Events Tracker
 * 
 * @version 2.0.0
 * @phase Phase 2 Enhanced - Email-Based Lookup
 * @description Track processed calendar events with email-based Build File lookup
 * @lastUpdated 2024-12-28
 * 
 * CHANGELOG v2.0.0:
 * - Added Leader Email column for Phase 2 lookup
 * - Added Build File ID column for direct file access
 * - Added Leader Folder ID column for fallback/metadata
 * - Added findByEmail() function for fast Phase 2 lookups
 * - Updated markEventProcessed() to store new metadata
 * 
 * Column Structure:
 * A: Event ID
 * B: Fingerprint
 * C: Phase
 * D: Leader Name
 * E: Company
 * F: Event Date
 * G: Processed At
 * H: Last Updated
 * I: Leader Email      <- NEW in v2.0.0
 * J: Build File ID     <- NEW in v2.0.0
 * K: Leader Folder ID  <- NEW in v2.0.0
 */

const ProcessedEventsTracker = {
  
  // Column indices (0-based for arrays, 1-based for sheets)
  COLUMNS: {
    EVENT_ID: 0,
    FINGERPRINT: 1,
    PHASE: 2,
    LEADER_NAME: 3,
    COMPANY: 4,
    EVENT_DATE: 5,
    PROCESSED_AT: 6,
    LAST_UPDATED: 7,
    LEADER_EMAIL: 8,      // NEW
    BUILD_FILE_ID: 9,     // NEW
    LEADER_FOLDER_ID: 10  // NEW
  },
  
  /**
   * Get or create the tracking spreadsheet
   * @returns {Spreadsheet} The tracking spreadsheet
   */
  getTrackingSpreadsheet: function() {
    // If we have a configured spreadsheet ID, use it
    if (CONFIG.PROCESSED_EVENTS.spreadsheetId) {
      try {
        return SpreadsheetApp.openById(CONFIG.PROCESSED_EVENTS.spreadsheetId);
      } catch (error) {
        Logger.log(`⚠️ Could not open configured tracking spreadsheet: ${error.message}`);
        Logger.log(`   Creating new tracking spreadsheet...`);
      }
    }
    
    // Look for existing tracking spreadsheet in Strong Teams folder
    const folder = DriveApp.getFolderById(CONFIG.STRONG_TEAMS_FOLDER_ID);
    const files = folder.getFilesByName('Strong Teams - Event Tracker');
    
    if (files.hasNext()) {
      const file = files.next();
      Logger.log(`📋 Found existing tracking spreadsheet`);
      return SpreadsheetApp.open(file);
    }
    
    // Create new tracking spreadsheet
    Logger.log(`📋 Creating new tracking spreadsheet...`);
    return this.createTrackingSpreadsheet(folder);
  },
  
  /**
   * Create a new tracking spreadsheet with all columns including new ones
   * @param {Folder} folder - The folder to create the spreadsheet in
   * @returns {Spreadsheet} The new tracking spreadsheet
   */
  createTrackingSpreadsheet: function(folder) {
    // Create spreadsheet
    const ss = SpreadsheetApp.create('Strong Teams - Event Tracker');
    
    // Move to Strong Teams folder
    const file = DriveApp.getFileById(ss.getId());
    file.moveTo(folder);
    
    // Set up the sheet
    const sheet = ss.getActiveSheet();
    sheet.setName(CONFIG.PROCESSED_EVENTS.sheetName);
    
    // Add headers (including NEW columns)
    const headers = [
      'Event ID',
      'Fingerprint',
      'Phase',
      'Leader Name',
      'Company',
      'Event Date',
      'Processed At',
      'Last Updated',
      'Leader Email',      // NEW
      'Build File ID',     // NEW
      'Leader Folder ID'   // NEW
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#4285f4');
    sheet.getRange(1, 1, 1, headers.length).setFontColor('#ffffff');
    
    // Freeze header row
    sheet.setFrozenRows(1);
    
    // Set column widths
    sheet.setColumnWidth(1, 250);  // Event ID
    sheet.setColumnWidth(2, 150);  // Fingerprint
    sheet.setColumnWidth(3, 80);   // Phase
    sheet.setColumnWidth(4, 150);  // Leader Name
    sheet.setColumnWidth(5, 120);  // Company
    sheet.setColumnWidth(6, 120);  // Event Date
    sheet.setColumnWidth(7, 150);  // Processed At
    sheet.setColumnWidth(8, 150);  // Last Updated
    sheet.setColumnWidth(9, 200);  // Leader Email (NEW)
    sheet.setColumnWidth(10, 300); // Build File ID (NEW)
    sheet.setColumnWidth(11, 300); // Leader Folder ID (NEW)
    
    Logger.log(`✓ Created tracking spreadsheet: ${ss.getUrl()}`);
    Logger.log(`⚠️ IMPORTANT: Copy this spreadsheet ID to CONFIG.PROCESSED_EVENTS.spreadsheetId:`);
    Logger.log(`   ${ss.getId()}`);
    
    return ss;
  },
  
  /**
   * Generate a fingerprint for an event based on key details
   * This allows us to detect when event details have changed
   * @param {CalendarEvent} event - The calendar event
   * @returns {string} A fingerprint hash
   */
  generateFingerprint: function(event) {
    const details = [
      event.getStartTime().toISOString(),
      event.getEndTime().toISOString(),
      event.getLocation() || '',
      // Include first 100 chars of description to detect major changes
      (event.getDescription() || '').substring(0, 100)
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < details.length; i++) {
      const char = details.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  },
  
  /**
   * Check if an event has already been processed
   * @param {CalendarEvent} event - The calendar event to check
   * @returns {Object} { processed: boolean, needsUpdate: boolean, rowIndex: number }
   */
  isEventProcessed: function(event) {
    if (!CONFIG.PROCESSED_EVENTS.enabled) {
      return { processed: false, needsUpdate: false, rowIndex: -1 };
    }
    
    const eventId = event.getId();
    const currentFingerprint = this.generateFingerprint(event);
    
    const ss = this.getTrackingSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
    
    if (!sheet) {
      Logger.log(`⚠️ Tracking sheet not found, creating...`);
      return { processed: false, needsUpdate: false, rowIndex: -1 };
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Skip header row, search for event ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][this.COLUMNS.EVENT_ID] === eventId) {
        const storedFingerprint = data[i][this.COLUMNS.FINGERPRINT];
        
        if (storedFingerprint === currentFingerprint) {
          // Event exists and hasn't changed
          return { processed: true, needsUpdate: false, rowIndex: i + 1 };
        } else {
          // Event exists but details have changed - needs reprocessing
          Logger.log(`🔄 Event details changed, will reprocess: ${event.getTitle()}`);
          return { processed: false, needsUpdate: true, rowIndex: i + 1 };
        }
      }
    }
    
    // Event not found - needs processing
    return { processed: false, needsUpdate: false, rowIndex: -1 };
  },
  
  /**
   * Mark an event as processed (UPDATED in v2.0.0)
   * Now stores email, Build File ID, and Folder ID for Phase 2 lookup
   * 
   * @param {CalendarEvent} event - The calendar event
   * @param {string} phase - 'Phase 1' or 'Phase 2'
   * @param {Object} eventData - Extracted event data
   * @param {string} eventData.fullName - Leader's full name
   * @param {string} eventData.companyName - Company name
   * @param {string} eventData.email - Leader's email (for lookup)
   * @param {string} [eventData.buildFileId] - Build File ID (Phase 1 only)
   * @param {string} [eventData.leaderFolderId] - Leader Folder ID (Phase 1 only)
   * @param {number} existingRowIndex - If updating existing record, the row index
   */
  markEventProcessed: function(event, phase, eventData, existingRowIndex = -1) {
    if (!CONFIG.PROCESSED_EVENTS.enabled) {
      return;
    }
    
    const ss = this.getTrackingSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
    
    const rowData = [
      event.getId(),                          // A: Event ID
      this.generateFingerprint(event),        // B: Fingerprint
      phase,                                  // C: Phase
      eventData.fullName || '',               // D: Leader Name
      eventData.companyName || '',            // E: Company
      event.getStartTime().toISOString(),     // F: Event Date
      new Date().toISOString(),               // G: Processed At
      new Date().toISOString(),               // H: Last Updated
      eventData.email || '',                  // I: Leader Email (NEW)
      eventData.buildFileId || '',            // J: Build File ID (NEW)
      eventData.leaderFolderId || ''          // K: Leader Folder ID (NEW)
    ];
    
    if (existingRowIndex > 0) {
      // Update existing row
      sheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
      Logger.log(`📝 Updated tracking record for: ${eventData.fullName}`);
    } else {
      // Add new row
      sheet.appendRow(rowData);
      Logger.log(`📝 Added tracking record for: ${eventData.fullName}`);
    }
    
    // Log metadata storage for Phase 1
    if (phase === 'Phase 1' && eventData.buildFileId) {
      Logger.log(`   📧 Email stored: ${eventData.email}`);
      Logger.log(`   📄 Build File ID stored: ${eventData.buildFileId}`);
      Logger.log(`   📁 Folder ID stored: ${eventData.leaderFolderId}`);
    }
  },
  
  /**
   * Find Build File by leader email (v2.0.1 - handles duplicates)
   * Used by Phase 2 processing for fast lookup
   * 
   * @param {string} email - Leader's email address
   * @param {string} leaderName - Optional: Leader's full name for disambiguation
   * @returns {Object|null} { buildFileId, leaderFolderId, leaderName, company } or null
   */
  findByEmail: function(email, leaderName) {
    if (!email) {
      Logger.log(`⚠️ findByEmail called with empty email`);
      return null;
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = leaderName ? leaderName.toLowerCase().trim() : null;
    
    Logger.log(`🔍 Searching Event Tracker for email: ${normalizedEmail}`);
    
    const ss = this.getTrackingSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
    
    if (!sheet) {
      Logger.log(`⚠️ Tracking sheet not found`);
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    
    // STEP 1: Collect ALL matches for this email
    const matches = [];
    
    for (let i = 1; i < data.length; i++) {
      const rowEmail = (data[i][this.COLUMNS.LEADER_EMAIL] || '').toLowerCase().trim();
      
      if (rowEmail === normalizedEmail) {
        const buildFileId = data[i][this.COLUMNS.BUILD_FILE_ID];
        
        // Only consider rows that have a Build File ID
        if (buildFileId) {
          matches.push({
            rowIndex: i,
            buildFileId: buildFileId,
            leaderFolderId: data[i][this.COLUMNS.LEADER_FOLDER_ID],
            leaderName: data[i][this.COLUMNS.LEADER_NAME],
            company: data[i][this.COLUMNS.COMPANY]
          });
        }
      }
    }
    
    // STEP 2: Handle results based on match count
    if (matches.length === 0) {
      Logger.log(`✗ No matches found for email: ${normalizedEmail}`);
      return null;
    }
    
    if (matches.length === 1) {
      // Single match - return it
      Logger.log(`✓ Found single match for ${normalizedEmail}: ${matches[0].leaderName}`);
      return matches[0];
    }
    
    // STEP 3: Multiple matches - try to narrow down by name
    Logger.log(`⚠️ Found ${matches.length} matches for email: ${normalizedEmail}`);
    matches.forEach((m, idx) => {
      Logger.log(`   ${idx + 1}. ${m.leaderName} (${m.company})`);
    });
    
    if (normalizedName) {
      // Filter by name (case-insensitive)
      const nameMatches = matches.filter(m => 
        m.leaderName.toLowerCase().trim() === normalizedName
      );
      
      if (nameMatches.length === 1) {
        Logger.log(`✓ Narrowed to single match by name: ${nameMatches[0].leaderName}`);
        return nameMatches[0];
      }
      
      if (nameMatches.length > 1) {
        Logger.log(`⚠️ Still ${nameMatches.length} matches after name filter - returning first`);
        return nameMatches[0];
      }
      
      // Name didn't match any - log warning and return first email match
      Logger.log(`⚠️ Name "${leaderName}" didn't match any records. Email matches found but name mismatch.`);
      Logger.log(`   Returning first email match: ${matches[0].leaderName}`);
      return matches[0];
    }
    
    // No name provided - return first match with warning
    Logger.log(`⚠️ Multiple email matches, no name provided - returning first: ${matches[0].leaderName}`);
    return matches[0];
  },
  
  /**
   * Get Build File directly by ID with error handling
   * @param {string} fileId - Google Drive file ID
   * @returns {File|null} The file object or null if not found
   */
  getBuildFileById: function(fileId) {
    if (!fileId) {
      return null;
    }
    
    try {
      const file = DriveApp.getFileById(fileId);
      Logger.log(`✓ Retrieved Build File: ${file.getName()}`);
      return file;
    } catch (error) {
      Logger.log(`⚠️ Could not retrieve Build File by ID: ${error.message}`);
      Logger.log(`   File ID: ${fileId}`);
      Logger.log(`   File may have been deleted or moved`);
      return null;
    }
  },
  
  /**
   * Clean up old records beyond retention period
   * Should be run periodically (e.g., weekly)
   */
  cleanupOldRecords: function() {
    Logger.log('🧹 Cleaning up old tracking records...');
    
    const ss = this.getTrackingSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
    
    if (!sheet) {
      Logger.log('⚠️ Tracking sheet not found');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.PROCESSED_EVENTS.retentionDays);
    
    let deletedCount = 0;
    
    // Go backwards to avoid index shifting issues
    for (let i = data.length - 1; i >= 1; i--) {
      const eventDateStr = data[i][this.COLUMNS.EVENT_DATE];
      
      if (eventDateStr) {
        const eventDate = new Date(eventDateStr);
        
        if (eventDate < cutoffDate) {
          sheet.deleteRow(i + 1);
          deletedCount++;
        }
      }
    }
    
    Logger.log(`✓ Cleaned up ${deletedCount} old records`);
  },
  
  /**
   * Get tracking statistics
   * @returns {Object} Statistics about tracked events
   */
  getStats: function() {
    const ss = this.getTrackingSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
    
    if (!sheet) {
      return { total: 0, phase1: 0, phase2: 0, withEmail: 0, withFileId: 0 };
    }
    
    const data = sheet.getDataRange().getValues();
    
    let phase1Count = 0;
    let phase2Count = 0;
    let withEmailCount = 0;
    let withFileIdCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][this.COLUMNS.PHASE] === 'Phase 1') phase1Count++;
      if (data[i][this.COLUMNS.PHASE] === 'Phase 2') phase2Count++;
      if (data[i][this.COLUMNS.LEADER_EMAIL]) withEmailCount++;
      if (data[i][this.COLUMNS.BUILD_FILE_ID]) withFileIdCount++;
    }
    
    return {
      total: data.length - 1, // Exclude header
      phase1: phase1Count,
      phase2: phase2Count,
      withEmail: withEmailCount,
      withFileId: withFileIdCount,
      spreadsheetUrl: ss.getUrl()
    };
  },
  
  /**
   * View all tracked events (for debugging)
   */
  viewTrackedEvents: function() {
    Logger.log('='.repeat(70));
    Logger.log('TRACKED EVENTS');
    Logger.log('='.repeat(70));
    
    const stats = this.getStats();
    Logger.log(`\n📊 Statistics:`);
    Logger.log(`   Total tracked: ${stats.total}`);
    Logger.log(`   Phase 1: ${stats.phase1}`);
    Logger.log(`   Phase 2: ${stats.phase2}`);
    Logger.log(`   With Email: ${stats.withEmail}`);
    Logger.log(`   With File ID: ${stats.withFileId}`);
    Logger.log(`   Spreadsheet: ${stats.spreadsheetUrl}`);
    
    const ss = this.getTrackingSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
    
    if (!sheet || sheet.getLastRow() <= 1) {
      Logger.log('\n   No events tracked yet.');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    
    Logger.log(`\n📋 Recent Events (last 10):`);
    
    const startRow = Math.max(1, data.length - 10);
    for (let i = startRow; i < data.length; i++) {
      Logger.log(`\n   ${i}. ${data[i][this.COLUMNS.LEADER_NAME]} (${data[i][this.COLUMNS.PHASE]})`);
      Logger.log(`      Company: ${data[i][this.COLUMNS.COMPANY]}`);
      Logger.log(`      Email: ${data[i][this.COLUMNS.LEADER_EMAIL] || '(not stored)'}`);
      Logger.log(`      Build File ID: ${data[i][this.COLUMNS.BUILD_FILE_ID] ? 'Yes' : 'No'}`);
      Logger.log(`      Event Date: ${data[i][this.COLUMNS.EVENT_DATE]}`);
    }
    
    Logger.log('\n' + '='.repeat(70));
  },
  
  /**
   * Add new columns to existing tracker spreadsheet (MIGRATION HELPER)
   * Run this once if you have an existing tracker without the new columns
   */
  migrateAddNewColumns: function() {
    Logger.log('='.repeat(70));
    Logger.log('MIGRATING EVENT TRACKER - Adding New Columns');
    Logger.log('='.repeat(70));
    
    const ss = this.getTrackingSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
    
    if (!sheet) {
      Logger.log('⚠️ Tracking sheet not found');
      return;
    }
    
    // Check current column count
    const lastCol = sheet.getLastColumn();
    Logger.log(`Current columns: ${lastCol}`);
    
    if (lastCol >= 11) {
      Logger.log('✓ Already has 11+ columns - migration not needed');
      return;
    }
    
    // Add headers for new columns
    const newHeaders = ['Leader Email', 'Build File ID', 'Leader Folder ID'];
    const startCol = lastCol + 1;
    
    for (let i = 0; i < newHeaders.length; i++) {
      const col = startCol + i;
      sheet.getRange(1, col).setValue(newHeaders[i]);
      sheet.getRange(1, col).setFontWeight('bold');
      sheet.getRange(1, col).setBackground('#4285f4');
      sheet.getRange(1, col).setFontColor('#ffffff');
    }
    
    // Set column widths
    sheet.setColumnWidth(9, 200);  // Leader Email
    sheet.setColumnWidth(10, 300); // Build File ID
    sheet.setColumnWidth(11, 300); // Leader Folder ID
    
    Logger.log(`✓ Added ${newHeaders.length} new columns`);
    Logger.log('✓ Migration complete');
    Logger.log('\nNext step: Run backfillEventTrackerMetadata() to populate existing records');
    Logger.log('='.repeat(70));
  }
};

// ============================================================================
// UTILITY FUNCTIONS (can be run directly from Apps Script)
// ============================================================================

/**
 * View tracking stats - run this to see what's being tracked
 */
function viewEventTrackingStats() {
  ProcessedEventsTracker.viewTrackedEvents();
}

/**
 * Clean up old tracking records - run this periodically
 */
function cleanupEventTracking() {
  ProcessedEventsTracker.cleanupOldRecords();
}

/**
 * Migrate existing tracker to add new columns
 * Run this ONCE if you have an existing tracker spreadsheet
 */
function migrateEventTracker() {
  ProcessedEventsTracker.migrateAddNewColumns();
}

/**
 * Reset tracking - WARNING: This will cause all events to be reprocessed!
 */
function resetEventTracking() {
  Logger.log('⚠️ WARNING: This will delete all tracking records!');
  Logger.log('All events in the 90-day window will be reprocessed on next trigger.');
  
  const ss = ProcessedEventsTracker.getTrackingSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
  
  if (sheet && sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
    Logger.log('✓ All tracking records deleted');
  } else {
    Logger.log('ℹ️ No records to delete');
  }
}

/**
 * Test email lookup function
 */
function testEmailLookup() {
  const testEmail = 'test@example.com'; // Change this to a real email in your tracker
  
  Logger.log('='.repeat(70));
  Logger.log('TESTING EMAIL LOOKUP');
  Logger.log('='.repeat(70));
  Logger.log(`Searching for: ${testEmail}`);
  
  const result = ProcessedEventsTracker.findByEmail(testEmail);
  
  if (result) {
    Logger.log('\n✓ FOUND:');
    Logger.log(`   Leader: ${result.leaderName}`);
    Logger.log(`   Company: ${result.company}`);
    Logger.log(`   Build File ID: ${result.buildFileId}`);
    Logger.log(`   Folder ID: ${result.leaderFolderId}`);
    
    // Try to get the file
    const file = ProcessedEventsTracker.getBuildFileById(result.buildFileId);
    if (file) {
      Logger.log(`   File URL: ${file.getUrl()}`);
    }
  } else {
    Logger.log('\n✗ NOT FOUND');
  }
  
  Logger.log('='.repeat(70));
}