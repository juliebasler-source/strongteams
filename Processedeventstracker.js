/**
 * Strong Teams Automation - Processed Events Tracker
 * 
 * @version 1.0.0
 * @phase Phase 1 Enhanced - Event Deduplication
 * @description Track processed calendar events to prevent duplicate processing
 * @lastUpdated 2024-12-25
 * 
 * This module maintains a Google Sheet that tracks which calendar events
 * have already been processed. This enables:
 * - 90-day lookahead without reprocessing existing events
 * - Reprocessing when event details change (time, location, etc.)
 * - Automatic cleanup of old records
 * 
 * The tracking sheet stores:
 * - Event ID (unique identifier from Google Calendar)
 * - Event fingerprint (hash of key event details)
 * - Phase type (Phase 1 or Phase 2)
 * - Leader name
 * - Processed timestamp
 * - Event date
 */

const ProcessedEventsTracker = {
  
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
   * Create a new tracking spreadsheet
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
    
    // Add headers
    const headers = [
      'Event ID',
      'Fingerprint',
      'Phase',
      'Leader Name',
      'Company',
      'Event Date',
      'Processed At',
      'Last Updated'
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
      if (data[i][0] === eventId) {
        const storedFingerprint = data[i][1];
        
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
   * Mark an event as processed
   * @param {CalendarEvent} event - The calendar event
   * @param {string} phase - 'Phase 1' or 'Phase 2'
   * @param {Object} eventData - Extracted event data (for leader name, company)
   * @param {number} existingRowIndex - If updating existing record, the row index
   */
  markEventProcessed: function(event, phase, eventData, existingRowIndex = -1) {
    if (!CONFIG.PROCESSED_EVENTS.enabled) {
      return;
    }
    
    const ss = this.getTrackingSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
    
    const rowData = [
      event.getId(),
      this.generateFingerprint(event),
      phase,
      eventData.fullName || '',
      eventData.companyName || '',
      event.getStartTime().toISOString(),
      new Date().toISOString(),
      new Date().toISOString()
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
      const eventDateStr = data[i][5]; // Event Date column
      
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
      return { total: 0, phase1: 0, phase2: 0 };
    }
    
    const data = sheet.getDataRange().getValues();
    
    let phase1Count = 0;
    let phase2Count = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === 'Phase 1') phase1Count++;
      if (data[i][2] === 'Phase 2') phase2Count++;
    }
    
    return {
      total: data.length - 1, // Exclude header
      phase1: phase1Count,
      phase2: phase2Count,
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
      Logger.log(`\n   ${i}. ${data[i][3]} (${data[i][2]})`);
      Logger.log(`      Company: ${data[i][4]}`);
      Logger.log(`      Event Date: ${data[i][5]}`);
      Logger.log(`      Processed: ${data[i][6]}`);
    }
    
    Logger.log('\n' + '='.repeat(70));
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