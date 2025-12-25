/**
 * Strong Teams Automation - Main Orchestrator
 * 
 * @version 1.2.0
 * @phase Phase 1 Enhanced - Event Deduplication
 * @description Main entry point and orchestration for Phase 1 & Phase 2 automation
 * @lastUpdated 2024-12-25
 * 
 * This script is triggered by calendar changes and coordinates all automation modules
 * to process Phase 1 (Leader Coaching) and Phase 2 (Team Building) sessions.
 * 
 * CHANGELOG v1.2.0:
 * - Integrated ProcessedEventsTracker for event deduplication
 * - Events are now only processed once (unless details change)
 * - Supports 90-day lookahead without reprocessing
 * - Added tracking status to logs
 * 
 * CHANGELOG v1.1.0:
 * - Added Phase 2 event processing to onCalendarTrigger()
 * - Added processPhase2Event() function for Team Building sessions
 * - Added testPhase2Automation() test function
 */

/**
 * Main trigger function - called by calendar trigger
 * Processes all new/updated calendar events (Phase 1 and Phase 2)
 * Now includes deduplication to prevent reprocessing
 */
function onCalendarTrigger() {
  LoggerUtils.logStart();
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let alreadyProcessedCount = 0;
  
  try {
    // Get calendar events (now covering 90 days ahead)
    const events = CalendarUtils.getNewCalendarEvents();
    
    if (events.length === 0) {
      Logger.log('No calendar events found in time range');
      return;
    }
    
    Logger.log(`\n📊 Processing ${events.length} events from calendar(s)...\n`);
    
    // Process each event
    events.forEach(event => {
      try {
        // Check if this is a Phase 1 event
        if (CalendarUtils.isPhase1Event(event)) {
          // Check if already processed (deduplication)
          const trackingStatus = ProcessedEventsTracker.isEventProcessed(event);
          
          if (trackingStatus.processed) {
            Logger.log(`⏭️ Skipping (already processed): ${event.getTitle()}`);
            alreadyProcessedCount++;
            return;
          }
          
          // Process the Phase 1 event
          const eventData = processPhase1Event(event);
          
          // Mark as processed (with row index if updating existing record)
          ProcessedEventsTracker.markEventProcessed(
            event, 
            'Phase 1', 
            eventData,
            trackingStatus.needsUpdate ? trackingStatus.rowIndex : -1
          );
          
          successCount++;
          return;
        }
        
        // Check if this is a Phase 2 event
        if (CalendarUtils.isPhase2Event(event)) {
          // Check if already processed (deduplication)
          const trackingStatus = ProcessedEventsTracker.isEventProcessed(event);
          
          if (trackingStatus.processed) {
            Logger.log(`⏭️ Skipping (already processed): ${event.getTitle()}`);
            alreadyProcessedCount++;
            return;
          }
          
          // Process the Phase 2 event
          const eventData = processPhase2Event(event);
          
          // Mark as processed
          ProcessedEventsTracker.markEventProcessed(
            event, 
            'Phase 2', 
            eventData,
            trackingStatus.needsUpdate ? trackingStatus.rowIndex : -1
          );
          
          successCount++;
          return;
        }
        
        // Not a Phase 1 or Phase 2 event
        LoggerUtils.logSkipped(event, 'Not a Phase 1 or Phase 2 event');
        skippedCount++;
        
      } catch (error) {
        errorCount++;
        handleEventError(event, error);
      }
    });
    
  } catch (error) {
    Logger.log(`FATAL ERROR: ${error.message}`);
    Logger.log(error.stack);
    errorCount++;
  }
  
  // Enhanced summary with deduplication stats
  Logger.log('\n' + '='.repeat(70));
  Logger.log('PROCESSING SUMMARY');
  Logger.log('='.repeat(70));
  Logger.log(`✓ Newly processed: ${successCount}`);
  Logger.log(`⏭️ Already processed (skipped): ${alreadyProcessedCount}`);
  Logger.log(`⊘ Not Strong Teams events: ${skippedCount}`);
  Logger.log(`✗ Errors: ${errorCount}`);
  Logger.log('='.repeat(70));
  
  LoggerUtils.logEnd(successCount, errorCount, skippedCount);
}

/**
 * Process a single Phase 1 event
 * @returns {Object} eventData - The extracted event data (for tracking)
 */
function processPhase1Event(event) {
  // Defensive check: ensure event exists
  if (!event) {
    Logger.log('❌ ERROR: processPhase1Event() called without an event parameter');
    Logger.log('This function should not be run directly.');
    Logger.log('Please run testPhase1Automation() instead.');
    throw new Error('No event provided to processPhase1Event()');
  }
  
  Logger.log(`\n${'─'.repeat(70)}`);
  Logger.log(`Processing Phase 1: ${event.getTitle()}`);
  Logger.log('─'.repeat(70));
  
  let eventData = null;
  
  try {
    // Step 1: Extract event data
    Logger.log('\n[1/4] Extracting event data...');
    eventData = CalendarUtils.extractEventData(event);
    
    // Step 2: Create folder structure
    Logger.log('\n[2/4] Creating folder structure...');
    const folders = FolderUtils.createLeaderFolderStructure(eventData);
    
    // Step 3: Create/update Build File
    Logger.log('\n[3/4] Processing Build File...');
    const buildFile = BuildFileManager.processLeaderBuildFile(eventData, folders.leaderFolder);
    
    // Step 4: Send notification (if enabled)
    Logger.log('\n[4/4] Finalizing...');
    EmailUtils.sendSuccessEmail(eventData, buildFile);
    
    // Log success
    LoggerUtils.logSuccess(eventData, folders, buildFile);
    
    return eventData; // Return for tracking
    
  } catch (error) {
    throw error; // Re-throw to be caught by outer handler
  }
}

/**
 * Process a single Phase 2 event
 * Updates existing Build File with Phase 2 meeting details
 * @returns {Object} eventData - The extracted event data (for tracking)
 */
function processPhase2Event(event) {
  Logger.log(`\n${'─'.repeat(70)}`);
  Logger.log(`Processing Phase 2: ${event.getTitle()}`);
  Logger.log('─'.repeat(70));
  
  let eventData = null;
  
  try {
    // Step 1: Extract event data (same as Phase 1)
    Logger.log('\n[1/3] Extracting event data...');
    eventData = CalendarUtils.extractEventData(event);
    
    // Step 2: Find existing Build File
    Logger.log('\n[2/3] Finding existing Build File...');
    
    const strongTeamsFolder = DriveApp.getFolderById(CONFIG.STRONG_TEAMS_FOLDER_ID);
    
    // Find company folder
    const companyFolders = strongTeamsFolder.getFoldersByName(eventData.companyName);
    if (!companyFolders.hasNext()) {
      throw new Error(`Company folder not found: ${eventData.companyName}`);
    }
    const companyFolder = companyFolders.next();
    
    // Find leader folder
    const leaderFolders = companyFolder.getFoldersByName(eventData.fullName);
    if (!leaderFolders.hasNext()) {
      throw new Error(`Leader folder not found: ${eventData.fullName}`);
    }
    const leaderFolder = leaderFolders.next();
    
    // Find Build File
    const buildFileName = `${eventData.fullName} - Strong Teams Build File`;
    const buildFiles = leaderFolder.getFilesByName(buildFileName);
    if (!buildFiles.hasNext()) {
      throw new Error(`Build File not found: ${buildFileName}`);
    }
    const buildFile = buildFiles.next();
    
    Logger.log(`  ✓ Found Build File: ${buildFileName}`);
    
    // Step 3: Update Phase 2 Settings
    Logger.log('\n[3/3] Updating Phase 2 Settings...');
    BuildFileManager.updatePhase2Settings(buildFile, eventData);
    
    // Log success
    Logger.log('\n' + '═'.repeat(70));
    Logger.log('✓ SUCCESS - Phase 2 Update Complete');
    Logger.log('═'.repeat(70));
    Logger.log(`Leader: ${eventData.fullName}`);
    Logger.log(`Company: ${eventData.companyName}`);
    Logger.log(`Phase 2 Date: ${eventData.formattedDate}`);
    Logger.log(`Phase 2 Time: ${eventData.formattedTime}`);
    Logger.log(`Zoom Link: ${eventData.zoomLink}`);
    Logger.log(`Build File: ${buildFile.getUrl()}`);
    Logger.log('═'.repeat(70));
    
    return eventData; // Return for tracking
    
  } catch (error) {
    throw error; // Re-throw to be caught by outer handler
  }
}

/**
 * Handle errors for a specific event
 */
function handleEventError(event, error) {
  let eventData = null;
  
  try {
    // Try to extract data even on error (for logging)
    eventData = CalendarUtils.extractEventData(event);
  } catch (e) {
    // If we can't extract data, that's ok - we'll log without it
  }
  
  // Log error
  LoggerUtils.logError(event, eventData, error);
  
  // Send error email
  EmailUtils.sendErrorEmail(event, eventData, error);
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Manual test function - run this to test Phase 1 without calendar trigger
 * Simulates a Phase 1 calendar event
 */
function testPhase1Automation() {
  Logger.log('=== MANUAL TEST MODE - PHASE 1 ===\n');
  
  // Get your actual calendar
  const calendar = CalendarApp.getDefaultCalendar();
  
  // Get events from the next 7 days
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, oneWeekFromNow);
  
  Logger.log(`Found ${events.length} events in the next 7 days\n`);
  
  // List all events
  events.forEach((event, index) => {
    Logger.log(`${index + 1}. ${event.getTitle()}`);
    Logger.log(`   Date: ${event.getStartTime()}`);
    Logger.log(`   Description preview: ${event.getDescription().substring(0, 100)}...`);
    
    if (CalendarUtils.isPhase1Event(event)) {
      Logger.log(`   ✓ This is a Phase 1 event!`);
      Logger.log(`\nProcessing this event...\n`);
      
      try {
        const eventData = processPhase1Event(event);
        
        // Mark as processed
        ProcessedEventsTracker.markEventProcessed(event, 'Phase 1', eventData);
        
        Logger.log('\n✓ Test completed successfully!');
      } catch (error) {
        Logger.log(`\n✗ Test failed: ${error.message}`);
        Logger.log(error.stack);
      }
      
      return; // Stop after processing first Phase 1 event
    }
    Logger.log('');
  });
}

/**
 * Manual test function - run this to test Phase 2 without calendar trigger
 * 
 * @since v1.1.0
 */
function testPhase2Automation() {
  Logger.log('=== MANUAL TEST MODE - PHASE 2 ===\n');
  
  // Get your actual calendar
  const calendar = CalendarApp.getDefaultCalendar();
  
  // Get events from the next 7 days
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, oneWeekFromNow);
  
  Logger.log(`Found ${events.length} events in the next 7 days\n`);
  
  // List all events
  events.forEach((event, index) => {
    Logger.log(`${index + 1}. ${event.getTitle()}`);
    Logger.log(`   Date: ${event.getStartTime()}`);
    Logger.log(`   Description preview: ${event.getDescription().substring(0, 100)}...`);
    
    if (CalendarUtils.isPhase2Event(event)) {
      Logger.log(`   ✓ This is a Phase 2 event!`);
      Logger.log(`\nProcessing this event...\n`);
      
      try {
        const eventData = processPhase2Event(event);
        
        // Mark as processed
        ProcessedEventsTracker.markEventProcessed(event, 'Phase 2', eventData);
        
        Logger.log('\n✓ Test completed successfully!');
      } catch (error) {
        Logger.log(`\n✗ Test failed: ${error.message}`);
        Logger.log(error.stack);
      }
      
      return; // Stop after processing first Phase 2 event
    }
    Logger.log('');
  });
}

/**
 * Quick test with sample data (no actual calendar event needed)
 */
function testWithSampleData() {
  Logger.log('=== TESTING WITH SAMPLE DATA ===\n');
  
  // Create sample data structure
  const sampleData = {
    eventId: 'test_event_id',
    eventTitle: 'Phase 1 Coaching - April Welch',
    startDate: new Date(),
    firstName: 'April',
    lastName: 'Welch',
    email: 'aw@aprilwelch.com',
    fullName: 'April Welch',
    companyName: 'Aprilwelch',
    zoomLink: 'https://book.youcanbook.me/zoom/JTHO-ZFBK-BYRI',
    formattedDate: getFormattedDate(new Date()),
    formattedTime: getFormattedTime(new Date())
  };
  
  Logger.log('Sample data:');
  Logger.log(JSON.stringify(sampleData, null, 2));
  
  try {
    // Test folder creation
    Logger.log('\nTesting folder creation...');
    const folders = FolderUtils.createLeaderFolderStructure(sampleData);
    Logger.log(`✓ Folders created`);
    
    // Test Build File creation
    Logger.log('\nTesting Build File creation...');
    const buildFile = BuildFileManager.processLeaderBuildFile(sampleData, folders.leaderFolder);
    Logger.log(`✓ Build File created: ${buildFile.getUrl()}`);
    
    Logger.log('\n✓ All tests passed!');
    
  } catch (error) {
    Logger.log(`\n✗ Test failed: ${error.message}`);
    Logger.log(error.stack);
  }
}

/**
 * Test calendar data extraction only
 */
function testDataExtraction() {
  Logger.log('=== TESTING DATA EXTRACTION ===\n');
  
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, tomorrow);
  
  if (events.length === 0) {
    Logger.log('No events found. Create a test event first.');
    return;
  }
  
  events.forEach((event, index) => {
    Logger.log(`\n${index + 1}. ${event.getTitle()}`);
    Logger.log('─'.repeat(50));
    
    try {
      const data = CalendarUtils.extractEventData(event);
      Logger.log('Extracted data:');
      Logger.log(JSON.stringify(data, null, 2));
    } catch (error) {
      Logger.log(`Error extracting data: ${error.message}`);
    }
  });
}

// ============================================================================
// DIAGNOSTIC FUNCTIONS
// ============================================================================

/**
 * Comprehensive folder structure diagnostic
 */
function diagnoseFolderIssue() {
  Logger.log('='.repeat(70));
  Logger.log('FOLDER STRUCTURE DIAGNOSTIC');
  Logger.log('='.repeat(70));
  
  // Get the next few Phase 1 events
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const oneMonthAhead = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, oneMonthAhead);
  
  Logger.log(`\nFound ${events.length} events in next 30 days\n`);
  
  let phase1Count = 0;
  const leaderNames = [];
  const companyNames = [];
  
  events.forEach((event, index) => {
    if (CalendarUtils.isPhase1Event(event)) {
      phase1Count++;
      
      Logger.log('\n' + '─'.repeat(70));
      Logger.log(`PHASE 1 EVENT #${phase1Count}: ${event.getTitle()}`);
      Logger.log('─'.repeat(70));
      
      try {
        // Extract data
        const eventData = CalendarUtils.extractEventData(event);
        
        Logger.log(`📧 Email: ${eventData.email}`);
        Logger.log(`👤 Full Name: ${eventData.fullName}`);
        Logger.log(`   - First: ${eventData.firstName}`);
        Logger.log(`   - Last: ${eventData.lastName}`);
        Logger.log(`🏢 Company Name: ${eventData.companyName}`);
        Logger.log(`📅 Date: ${eventData.formattedDate}`);
        
        // Track for comparison
        leaderNames.push(eventData.fullName);
        companyNames.push(eventData.companyName);
        
        // Test folder creation (but don't actually run full automation)
        Logger.log(`\n🗂️  Testing folder structure...`);
        const folders = FolderUtils.createLeaderFolderStructure(eventData);
        
        Logger.log(`   ✓ Company Folder: ${folders.companyFolder.getName()}`);
        Logger.log(`   ✓ Leader Folder: ${folders.leaderFolder.getName()}`);
        Logger.log(`   📍 Leader Folder URL: ${folders.leaderFolder.getUrl()}`);
        
        // Check if Build File exists
        const buildFileName = `${eventData.fullName} - Strong Teams Build File`;
        const existingFile = FolderUtils.findFileInFolder(folders.leaderFolder, buildFileName);
        
        if (existingFile) {
          Logger.log(`   📄 Existing Build File found: ${existingFile.getUrl()}`);
        } else {
          Logger.log(`   📄 No Build File exists yet (would be created)`);
        }
        
      } catch (error) {
        Logger.log(`   ❌ ERROR: ${error.message}`);
      }
    }
  });
  
  // Summary analysis
  Logger.log('\n' + '='.repeat(70));
  Logger.log('SUMMARY ANALYSIS');
  Logger.log('='.repeat(70));
  Logger.log(`\nTotal Phase 1 events found: ${phase1Count}`);
  
  if (phase1Count > 0) {
    Logger.log(`\n👤 LEADER NAMES EXTRACTED:`);
    const uniqueLeaders = [...new Set(leaderNames)];
    uniqueLeaders.forEach((name, i) => {
      const count = leaderNames.filter(n => n === name).length;
      Logger.log(`   ${i + 1}. "${name}" (${count} event${count > 1 ? 's' : ''})`);
    });
    
    Logger.log(`\n🏢 COMPANY NAMES EXTRACTED:`);
    const uniqueCompanies = [...new Set(companyNames)];
    uniqueCompanies.forEach((name, i) => {
      const count = companyNames.filter(n => n === name).length;
      Logger.log(`   ${i + 1}. "${name}" (${count} event${count > 1 ? 's' : ''})`);
    });
    
    // Identify the problem
    Logger.log(`\n🔍 DIAGNOSIS:`);
    if (uniqueLeaders.length === 1 && phase1Count > 1) {
      Logger.log(`   ⚠️  PROBLEM FOUND: All ${phase1Count} leaders have the SAME NAME!`);
      Logger.log(`   → All events showing as: "${uniqueLeaders[0]}"`);
      Logger.log(`   → This means they all share ONE leader folder`);
      Logger.log(`   → FIX: Check CalendarUtils.extractEventData() name extraction`);
    } else if (uniqueCompanies.length === 1 && uniqueLeaders.length > 1) {
      Logger.log(`   ℹ️  All leaders from same company: "${uniqueCompanies[0]}"`);
      Logger.log(`   ✓ But each leader gets their own subfolder - this is CORRECT`);
    } else if (uniqueLeaders.length === phase1Count) {
      Logger.log(`   ✓ All leaders have UNIQUE names - folder structure should be correct`);
    } else {
      Logger.log(`   ℹ️  Mixed situation - some leaders may share names`);
    }
  } else {
    Logger.log(`\n⚠️  No Phase 1 events found. Create some test events to diagnose.`);
  }
  
  Logger.log('\n' + '='.repeat(70));
}

/**
 * Test multi-calendar access
 */
function testMultiCalendarAccess() {
  Logger.log('='.repeat(70));
  Logger.log('MULTI-CALENDAR ACCESS TEST');
  Logger.log('='.repeat(70));
  
  Logger.log('\n📅 Configured Calendars:');
  Logger.log(`   Primary: ${CONFIG.CALENDARS.primary || 'Default Calendar'}`);
  
  if (CONFIG.CALENDARS.secondary && CONFIG.CALENDARS.secondary.length > 0) {
    Logger.log(`   Secondary: ${CONFIG.CALENDARS.secondary.length} calendar(s)`);
    CONFIG.CALENDARS.secondary.forEach((calId, i) => {
      Logger.log(`      ${i + 1}. ${calId}`);
    });
  } else {
    Logger.log(`   Secondary: None configured`);
  }
  
  Logger.log('\n🔍 Fetching events...\n');
  
  const events = CalendarUtils.getNewCalendarEvents();
  
  Logger.log('\n' + '='.repeat(70));
  Logger.log('TEST COMPLETE');
  Logger.log('='.repeat(70));
}

/**
 * Diagnose Phase 2 Event Detection
 */
function diagnosePhase2Detection() {
  Logger.log('='.repeat(70));
  Logger.log('PHASE 2 EVENT DETECTION DIAGNOSTIC');
  Logger.log('='.repeat(70));
  
  // Get all events
  const events = CalendarUtils.getNewCalendarEvents();
  
  Logger.log(`\n📊 Total events found: ${events.length}\n`);
  
  let phase1Count = 0;
  let phase2Count = 0;
  let otherCount = 0;
  
  events.forEach((event, index) => {
    Logger.log(`\n${'─'.repeat(70)}`);
    Logger.log(`Event #${index + 1}: ${event.getTitle()}`);
    Logger.log(`Date: ${event.getStartTime()}`);
    Logger.log(`Location: ${event.getLocation() || '(none)'}`);
    
    // Get calendar name
    try {
      const calId = event.getOriginalCalendarId();
      const cal = CalendarApp.getCalendarById(calId);
      Logger.log(`Calendar: ${cal ? cal.getName() : 'Unknown'}`);
    } catch (e) {
      Logger.log(`Calendar: Could not determine`);
    }
    
    // Check description
    const desc = event.getDescription() || '';
    Logger.log(`\nDescription preview (first 200 chars):`);
    Logger.log(desc.substring(0, 200));
    
    // Test Phase 1
    const isP1 = CalendarUtils.isPhase1Event(event);
    Logger.log(`\n✓ Is Phase 1? ${isP1 ? 'YES ✓' : 'NO'}`);
    if (isP1) phase1Count++;
    
    // Test Phase 2
    const isP2 = CalendarUtils.isPhase2Event(event);
    Logger.log(`✓ Is Phase 2? ${isP2 ? 'YES ✓' : 'NO'}`);
    if (isP2) phase2Count++;
    
    if (!isP1 && !isP2) otherCount++;
    
    // If Phase 2, try to extract leader info
    if (isP2) {
      Logger.log(`\n🎯 PHASE 2 EVENT DETECTED!`);
      try {
        const data = CalendarUtils.extractEventData(event);
        Logger.log(`Leader: ${data.fullName}`);
        Logger.log(`Email: ${data.email}`);
        Logger.log(`Company: ${data.companyName}`);
        Logger.log(`Zoom Link: ${data.zoomLink}`);
        
        // Check if Build File exists
        Logger.log(`\n🔍 Checking for existing Build File...`);
        const strongTeamsFolder = DriveApp.getFolderById(CONFIG.STRONG_TEAMS_FOLDER_ID);
        const companyFolders = strongTeamsFolder.getFoldersByName(data.companyName);
        
        if (companyFolders.hasNext()) {
          const companyFolder = companyFolders.next();
          Logger.log(`✓ Found company folder: ${data.companyName}`);
          
          const leaderFolders = companyFolder.getFoldersByName(data.fullName);
          if (leaderFolders.hasNext()) {
            const leaderFolder = leaderFolders.next();
            Logger.log(`✓ Found leader folder: ${data.fullName}`);
            
            const buildFileName = `${data.fullName} - Strong Teams Build File`;
            const buildFiles = leaderFolder.getFilesByName(buildFileName);
            
            if (buildFiles.hasNext()) {
              const buildFile = buildFiles.next();
              Logger.log(`✓ Found Build File: ${buildFileName}`);
              Logger.log(`   URL: ${buildFile.getUrl()}`);
            } else {
              Logger.log(`✗ Build File NOT found: ${buildFileName}`);
            }
          } else {
            Logger.log(`✗ Leader folder NOT found: ${data.fullName}`);
          }
        } else {
          Logger.log(`✗ Company folder NOT found: ${data.companyName}`);
        }
        
      } catch (error) {
        Logger.log(`✗ ERROR extracting data: ${error.message}`);
      }
    }
  });
  
  Logger.log(`\n${'='.repeat(70)}`);
  Logger.log(`SUMMARY:`);
  Logger.log(`  Phase 1 events: ${phase1Count}`);
  Logger.log(`  Phase 2 events: ${phase2Count}`);
  Logger.log(`  Other events: ${otherCount}`);
  Logger.log('='.repeat(70));
}

/**
 * Test deduplication without processing
 * Shows which events would be processed vs skipped
 */
function testDeduplication() {
  Logger.log('='.repeat(70));
  Logger.log('DEDUPLICATION TEST');
  Logger.log('='.repeat(70));
  
  // Show tracking stats
  const stats = ProcessedEventsTracker.getStats();
  Logger.log(`\n📊 Tracking Stats:`);
  Logger.log(`   Total tracked events: ${stats.total}`);
  Logger.log(`   Phase 1: ${stats.phase1}`);
  Logger.log(`   Phase 2: ${stats.phase2}`);
  
  // Get calendar events
  const events = CalendarUtils.getNewCalendarEvents();
  
  let wouldProcess = 0;
  let wouldSkip = 0;
  let wouldUpdate = 0;
  
  Logger.log(`\n🔍 Checking ${events.length} events...\n`);
  
  events.forEach((event, index) => {
    const isP1 = CalendarUtils.isPhase1Event(event);
    const isP2 = CalendarUtils.isPhase2Event(event);
    
    if (!isP1 && !isP2) return; // Skip non-Strong Teams events
    
    const phase = isP1 ? 'Phase 1' : 'Phase 2';
    const status = ProcessedEventsTracker.isEventProcessed(event);
    
    if (status.processed) {
      Logger.log(`⏭️ SKIP: ${event.getTitle()} (${phase}) - Already processed`);
      wouldSkip++;
    } else if (status.needsUpdate) {
      Logger.log(`🔄 UPDATE: ${event.getTitle()} (${phase}) - Details changed`);
      wouldUpdate++;
    } else {
      Logger.log(`✅ PROCESS: ${event.getTitle()} (${phase}) - New event`);
      wouldProcess++;
    }
  });
  
  Logger.log(`\n${'='.repeat(70)}`);
  Logger.log(`SUMMARY:`);
  Logger.log(`   Would process (new): ${wouldProcess}`);
  Logger.log(`   Would update (changed): ${wouldUpdate}`);
  Logger.log(`   Would skip (no change): ${wouldSkip}`);
  Logger.log('='.repeat(70));
}