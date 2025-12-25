/**
 * Strong Teams Automation - Backfill Phase 2 Events
 * 
 * @version 1.0.0
 * @description Process Phase 2 calendar events for Build Files that exist
 *              but weren't created by automation (no tracking records)
 * @lastUpdated 2024-12-25
 * 
 * USE CASE:
 * - Phase 1 happened before automation existed
 * - Build Files were created manually or by old process
 * - Phase 2 events are now on calendar
 * - This script finds those Build Files and updates Phase 2 Settings
 */

/**
 * DRY RUN - See what would be updated without making changes
 */
function backfillPhase2DryRun() {
  Logger.log('='.repeat(70));
  Logger.log('DRY RUN - BACKFILL PHASE 2 EVENTS');
  Logger.log('(No changes will be made)');
  Logger.log('='.repeat(70));
  Logger.log('');
  
  const results = scanPhase2Events(true); // true = dry run
  
  Logger.log('\n' + '='.repeat(70));
  Logger.log('DRY RUN SUMMARY');
  Logger.log('='.repeat(70));
  Logger.log(`Phase 2 events found: ${results.totalEvents}`);
  Logger.log(`Build Files found: ${results.foundBuildFiles}`);
  Logger.log(`Build Files NOT found: ${results.missingBuildFiles}`);
  Logger.log(`Would update: ${results.wouldUpdate}`);
  Logger.log(`Already tracked (skip): ${results.alreadyTracked}`);
  
  if (results.missing.length > 0) {
    Logger.log('\n⚠️ Missing Build Files (need Phase 1 first):');
    results.missing.forEach(m => {
      Logger.log(`   - ${m.leaderName} (${m.companyName})`);
    });
  }
  
  Logger.log('\n💡 Run backfillPhase2Events() to actually make these updates.');
  Logger.log('='.repeat(70));
}

/**
 * MAIN FUNCTION - Actually backfill Phase 2 events
 */
function backfillPhase2Events() {
  Logger.log('='.repeat(70));
  Logger.log('BACKFILL PHASE 2 EVENTS');
  Logger.log('='.repeat(70));
  Logger.log(`Started: ${new Date().toLocaleString()}`);
  Logger.log('');
  
  const results = scanPhase2Events(false); // false = actually do it
  
  Logger.log('\n' + '='.repeat(70));
  Logger.log('BACKFILL SUMMARY');
  Logger.log('='.repeat(70));
  Logger.log(`Phase 2 events processed: ${results.totalEvents}`);
  Logger.log(`Build Files updated: ${results.updated}`);
  Logger.log(`Build Files NOT found: ${results.missingBuildFiles}`);
  Logger.log(`Already tracked (skipped): ${results.alreadyTracked}`);
  Logger.log(`Errors: ${results.errors}`);
  
  if (results.missing.length > 0) {
    Logger.log('\n⚠️ Missing Build Files (need Phase 1 first):');
    results.missing.forEach(m => {
      Logger.log(`   - ${m.leaderName} (${m.companyName})`);
    });
  }
  
  Logger.log('='.repeat(70));
}

/**
 * Scan calendar for Phase 2 events and process them
 */
function scanPhase2Events(dryRun) {
  const results = {
    totalEvents: 0,
    foundBuildFiles: 0,
    missingBuildFiles: 0,
    wouldUpdate: 0,
    updated: 0,
    alreadyTracked: 0,
    errors: 0,
    missing: []
  };
  
  // Get all calendars
  const allEvents = [];
  
  // Primary calendar
  const primaryCalendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const lookAhead = new Date(now.getTime() + (CONFIG.CALENDAR.lookaheadHours * 60 * 60 * 1000));
  const lookBack = new Date(now.getTime() - (CONFIG.CALENDAR.lookbackHours * 60 * 60 * 1000));
  
  const primaryEvents = primaryCalendar.getEvents(lookBack, lookAhead);
  allEvents.push(...primaryEvents);
  Logger.log(`📅 Primary calendar: ${primaryEvents.length} events`);
  
  // Secondary calendars
  if (CONFIG.CALENDAR.secondaryCalendarIds && CONFIG.CALENDAR.secondaryCalendarIds.length > 0) {
    CONFIG.CALENDAR.secondaryCalendarIds.forEach((calId, index) => {
      try {
        const cal = CalendarApp.getCalendarById(calId);
        if (cal) {
          const events = cal.getEvents(lookBack, lookAhead);
          allEvents.push(...events);
          Logger.log(`📅 Secondary calendar #${index + 1}: ${events.length} events`);
        }
      } catch (e) {
        Logger.log(`⚠️ Could not access secondary calendar: ${calId}`);
      }
    });
  }
  
  Logger.log(`\n🔍 Scanning ${allEvents.length} total events for Phase 2...\n`);
  
  // Get tracking spreadsheet and load existing records
  let trackingSheet = null;
  let trackedEventIds = [];
  
  if (!dryRun) {
    const trackingSS = ProcessedEventsTracker.getTrackingSpreadsheet();
    trackingSheet = trackingSS.getSheetByName(CONFIG.PROCESSED_EVENTS.sheetName);
    
    // Load all tracked event IDs into array for quick lookup
    const trackingData = trackingSheet.getDataRange().getValues();
    trackedEventIds = trackingData.slice(1).map(row => row[0]); // Column A = Event ID
  }
  
  // Process each event
  allEvents.forEach(event => {
    const description = event.getDescription() || '';
    
    // Check if Phase 2 event
    const isPhase2 = CONFIG.PHASE2.identifiers.some(id => description.includes(id));
    
    if (!isPhase2) return;
    
    results.totalEvents++;
    const eventTitle = event.getTitle();
    Logger.log(`\n📋 Phase 2 Event: ${eventTitle}`);
    
    try {
      // Extract event data
      const eventData = CalendarUtils.extractEventData(event);
      Logger.log(`   Leader: ${eventData.fullName}`);
      Logger.log(`   Company: ${eventData.companyName}`);
      Logger.log(`   Date: ${eventData.formattedDate}`);
      
      // Check if already tracked
      if (!dryRun) {
        const eventId = event.getId();
        if (trackedEventIds.includes(eventId)) {
          Logger.log(`   ⏭️ Already tracked - skipping`);
          results.alreadyTracked++;
          return;
        }
      }
      
      // Search for existing Build File
      const buildFileResult = findBuildFileByLeaderName(eventData.fullName, eventData.companyName);
      
      if (!buildFileResult.found) {
        Logger.log(`   ❌ Build File NOT found`);
        results.missingBuildFiles++;
        results.missing.push({
          leaderName: eventData.fullName,
          companyName: eventData.companyName,
          eventDate: eventData.formattedDate
        });
        return;
      }
      
      results.foundBuildFiles++;
      Logger.log(`   ✓ Found Build File: ${buildFileResult.file.getName()}`);
      Logger.log(`   📁 In folder: ${buildFileResult.companyFolder}/${buildFileResult.leaderFolder}`);
      
      if (dryRun) {
        Logger.log(`   → Would update Phase 2 Settings`);
        results.wouldUpdate++;
      } else {
        // Actually update the Build File
        updatePhase2InBuildFile(buildFileResult.file, eventData);
        Logger.log(`   ✅ Updated Phase 2 Settings`);
        
        // Add tracking record directly to sheet
        const eventId = event.getId();
        const fingerprint = generateBackfillFingerprint(eventData);
        const now = new Date().toISOString();
        
        trackingSheet.appendRow([
          eventId,
          fingerprint,
          'Phase 2',
          eventData.fullName,
          eventData.companyName,
          event.getStartTime().toISOString(),
          now,
          now
        ]);
        Logger.log(`   ✅ Added tracking record`);
        
        results.updated++;
      }
      
    } catch (error) {
      Logger.log(`   ❌ Error: ${error.message}`);
      results.errors++;
    }
  });
  
  return results;
}

/**
 * Search for a Build File by leader name across all company folders
 */
function findBuildFileByLeaderName(leaderName, expectedCompany) {
  const strongTeamsFolder = DriveApp.getFolderById(CONFIG.STRONG_TEAMS_FOLDER_ID);
  const buildFileName = `${leaderName} - Strong Teams Build File`;
  
  // First, try the expected company folder
  if (expectedCompany) {
    const result = searchInCompanyFolder(strongTeamsFolder, expectedCompany, leaderName, buildFileName);
    if (result.found) return result;
  }
  
  // If not found, search all company folders
  const companyFolders = strongTeamsFolder.getFolders();
  
  while (companyFolders.hasNext()) {
    const companyFolder = companyFolders.next();
    const companyName = companyFolder.getName();
    
    // Skip system folders
    if (companyName.startsWith('_') || companyName === 'Templates' || companyName === 'Archive') {
      continue;
    }
    
    // Skip if we already checked this company
    if (companyName === expectedCompany) continue;
    
    const result = searchInCompanyFolder(strongTeamsFolder, companyName, leaderName, buildFileName);
    if (result.found) return result;
  }
  
  return { found: false };
}

/**
 * Search for Build File within a specific company folder
 */
function searchInCompanyFolder(strongTeamsFolder, companyName, leaderName, buildFileName) {
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
      leaderFolder: leaderName
    };
    
  } catch (e) {
    return { found: false };
  }
}

/**
 * Update Phase 2 Settings in a Build File
 */
function updatePhase2InBuildFile(buildFile, eventData) {
  const ss = SpreadsheetApp.open(buildFile);
  const sheet = ss.getSheetByName(CONFIG.PHASE2.sheetName);
  
  if (!sheet) {
    throw new Error(`Sheet "${CONFIG.PHASE2.sheetName}" not found in Build File`);
  }
  
  // Update Phase 2 fields
  const rows = CONFIG.PHASE2.rows;
  
  sheet.getRange(rows.date, 2).setValue(eventData.formattedDate);
  sheet.getRange(rows.time, 2).setValue(eventData.formattedTime);
  sheet.getRange(rows.zoomLink, 2).setValue(eventData.zoomLink);
  
  // Flush changes
  SpreadsheetApp.flush();
}

/**
 * UTILITY: List all Phase 2 events without processing
 */
function listPhase2Events() {
  Logger.log('='.repeat(70));
  Logger.log('LISTING ALL PHASE 2 EVENTS IN CALENDAR');
  Logger.log('='.repeat(70));
  
  const primaryCalendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const lookAhead = new Date(now.getTime() + (CONFIG.CALENDAR.lookaheadHours * 60 * 60 * 1000));
  const lookBack = new Date(now.getTime() - (CONFIG.CALENDAR.lookbackHours * 60 * 60 * 1000));
  
  const events = primaryCalendar.getEvents(lookBack, lookAhead);
  
  let phase2Count = 0;
  
  events.forEach((event, index) => {
    const description = event.getDescription() || '';
    const isPhase2 = CONFIG.PHASE2.identifiers.some(id => description.includes(id));
    
    if (isPhase2) {
      phase2Count++;
      Logger.log(`\n${phase2Count}. ${event.getTitle()}`);
      Logger.log(`   Date: ${event.getStartTime()}`);
      Logger.log(`   Event ID: ${event.getId()}`);
      
      try {
        const eventData = CalendarUtils.extractEventData(event);
        Logger.log(`   Leader: ${eventData.fullName}`);
        Logger.log(`   Company: ${eventData.companyName}`);
        Logger.log(`   Email: ${eventData.email}`);
      } catch (e) {
        Logger.log(`   ⚠️ Could not extract data: ${e.message}`);
      }
    }
  });
  
  Logger.log('\n' + '='.repeat(70));
  Logger.log(`Total Phase 2 events found: ${phase2Count}`);
  Logger.log('='.repeat(70));
}

/**
 * UTILITY: Search for a specific leader's Build File
 */
function findLeaderBuildFile(leaderName) {
  Logger.log(`\n🔍 Searching for Build File: "${leaderName} - Strong Teams Build File"\n`);
  
  const result = findBuildFileByLeaderName(leaderName, null);
  
  if (result.found) {
    Logger.log(`✅ FOUND!`);
    Logger.log(`   File: ${result.file.getName()}`);
    Logger.log(`   Location: ${result.companyFolder}/${result.leaderFolder}/`);
    Logger.log(`   URL: ${result.file.getUrl()}`);
  } else {
    Logger.log(`❌ NOT FOUND`);
    Logger.log(`\n   Possible reasons:`);
    Logger.log(`   1. Folder name doesn't match "${leaderName}"`);
    Logger.log(`   2. Build File has different naming convention`);
    Logger.log(`   3. Phase 1 was never completed for this leader`);
  }
}

// Quick test functions
function testFindMollieZaring() { findLeaderBuildFile('Mollie Zaring'); }
function testFindWestonLeake() { findLeaderBuildFile('Weston Leake'); }
function testFindTravisBarton() { findLeaderBuildFile('Travis Barton'); }

/**
 * Generate a fingerprint for backfill records
 */
function generateBackfillFingerprint(eventData) {
  const data = `${eventData.formattedDate}|${eventData.formattedTime}|${eventData.zoomLink}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'BF-' + Math.abs(hash).toString(16);
}
