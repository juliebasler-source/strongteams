/**
 * Strong Teams Automation - Main Orchestrator
 * 
 * @version 2.2.0
 * @phase Phase 2 Enhanced - Email-Based Lookup + Add-on Support
 * @description Main entry point and orchestration for Phase 1 & Phase 2 automation
 * @lastUpdated 2024-12-31
 * 
 * CHANGELOG v2.2.0:
 * - Converted to Workspace Add-on for global availability
 * - Added onHomepage, onFileScopeGranted, createAddonCard functions
 * 
 * CHANGELOG v2.1.0:
 * - Added onOpen() menu with "Create Interview Link" option
 * 
 * CHANGELOG v2.0.0:
 * - Phase 1 now stores email + file IDs in Event Tracker
 * - Phase 2 uses email lookup for fast Build File retrieval
 * - Added fallback to folder search if email lookup fails
 * - Improved error handling and logging
 * 
 * CHANGELOG v1.2.0:
 * - Integrated ProcessedEventsTracker for event deduplication
 * - Events are now only processed once (unless details change)
 * - Supports 90-day lookahead without reprocessing
 */

// ============================================================================
// MENU SETUP & ADD-ON TRIGGERS
// ============================================================================

/**
 * Menu setup - runs when spreadsheet opens
 * Creates the Strong Teams menu with available tools
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Strong Teams')
    .addItem('Create Interview Link', 'createInterviewLink')
    .addToUi();
}

/**
 * Add-on homepage trigger - shows card when add-on opened
 */
function onHomepage(e) {
  return createAddonCard();
}

/**
 * Add-on file scope granted trigger
 */
function onFileScopeGranted(e) {
  return createAddonCard();
}

/**
 * Creates the add-on sidebar card
 */
function createAddonCard() {
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Strong Teams Tools'))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText('Tools for Strong Teams Build Files'))
        .addWidget(
          CardService.newTextButton()
            .setText('Create Interview Link')
            .setOnClickAction(CardService.newAction().setFunctionName('createInterviewLinkFromAddon'))
        )
    )
    .build();
  return card;
}

/**
 * Create Interview Link - called from Add-on card
 */
function createInterviewLinkFromAddon(e) {
  createInterviewLink();
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('Interview Link created!'))
    .build();
}

// ============================================================================
// CALENDAR TRIGGER
// ============================================================================

/**
 * Main trigger function - called by calendar trigger
 * Processes all new/updated calendar events (Phase 1 and Phase 2)
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
          const result = processPhase1Event(event);
          
          // Mark as processed with metadata for Phase 2 lookup
          ProcessedEventsTracker.markEventProcessed(
            event, 
            'Phase 1', 
            {
              fullName: result.eventData.fullName,
              companyName: result.eventData.companyName,
              email: result.eventData.email,
              buildFileId: result.buildFileId,
              leaderFolderId: result.leaderFolderId
            },
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
          
          // Process the Phase 2 event (now uses email lookup!)
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
 * Process a single Phase 1 event (UPDATED in v2.0.0)
 * Now returns metadata for storage in Event Tracker
 * 
 * @param {CalendarEvent} event - The calendar event
 * @returns {Object} { eventData, buildFileId, leaderFolderId }
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
  let buildFile = null;
  let folders = null;
  
  try {
    // Step 1: Extract event data
    Logger.log('\n[1/4] Extracting event data...');
    eventData = CalendarUtils.extractEventData(event);
    
    // Step 2: Create folder structure
    Logger.log('\n[2/4] Creating folder structure...');
    folders = FolderUtils.createLeaderFolderStructure(eventData);
    
    // Step 3: Create/update Build File
    Logger.log('\n[3/4] Processing Build File...');
    buildFile = BuildFileManager.processLeaderBuildFile(eventData, folders.leaderFolder);
    
    // Step 4: Send notification (if enabled)
    Logger.log('\n[4/4] Finalizing...');
    EmailUtils.sendSuccessEmail(eventData, buildFile);
    
    // Log success
    LoggerUtils.logSuccess(eventData, folders, buildFile);
    
    // Return metadata for Event Tracker storage
    return {
      eventData: eventData,
      buildFileId: buildFile.getId(),
      leaderFolderId: folders.leaderFolder.getId()
    };
    
  } catch (error) {
    throw error; // Re-throw to be caught by outer handler
  }
}

/**
 * Process a single Phase 2 event (UPDATED in v2.0.0)
 * Now uses email-based lookup from Event Tracker
 * Falls back to folder search if email lookup fails
 * 
 * @param {CalendarEvent} event - The calendar event
 * @returns {Object} eventData - The extracted event data (for tracking)
 */
function processPhase2Event(event) {
  Logger.log(`\n${'─'.repeat(70)}`);
  Logger.log(`Processing Phase 2: ${event.getTitle()}`);
  Logger.log('─'.repeat(70));
  
  let eventData = null;
  let buildFile = null;
  
  try {
    // Step 1: Extract event data
    Logger.log('\n[1/3] Extracting event data...');
    eventData = CalendarUtils.extractEventData(event);
    Logger.log(`   Leader: ${eventData.fullName}`);
    Logger.log(`   Email: ${eventData.email}`);
    Logger.log(`   Company: ${eventData.companyName}`);
    
    // Step 2: Find Build File using email lookup (NEW in v2.0.0)
    Logger.log('\n[2/3] Finding Build File...');
    
    // Try email lookup first (fast path)
    const trackerResult = ProcessedEventsTracker.findByEmail(eventData.email, eventData.fullName);
    
    if (trackerResult && trackerResult.buildFileId) {
      // Found in tracker - get file directly by ID
      Logger.log(`   ✓ Found in Event Tracker via email lookup`);
      buildFile = ProcessedEventsTracker.getBuildFileById(trackerResult.buildFileId);
      
      if (!buildFile) {
        Logger.log(`   ⚠️ File ID found but file doesn't exist - falling back to folder search`);
      }
    }
    
    // Fallback: Search by folder structure if email lookup failed
    if (!buildFile) {
      Logger.log(`   → Email lookup failed, trying folder search...`);
      buildFile = findBuildFileByFolderSearch(eventData);
    }
    
    // If still not found, throw error
    if (!buildFile) {
      throw new Error(`Build File not found for ${eventData.fullName} (${eventData.email}). Phase 1 may not have been completed yet.`);
    }
    
    Logger.log(`   ✓ Found Build File: ${buildFile.getName()}`);
    
    // Step 3: Update Phase 2 Settings
    Logger.log('\n[3/3] Updating Phase 2 Settings...');
    BuildFileManager.updatePhase2Settings(buildFile, eventData);
    
    // Log success
    Logger.log('\n' + '═'.repeat(70));
    Logger.log('✓ SUCCESS - Phase 2 Update Complete');
    Logger.log('═'.repeat(70));
    Logger.log(`Leader: ${eventData.fullName}`);
    Logger.log(`Email: ${eventData.email}`);
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
 * Fallback function: Find Build File by searching folder structure
 * Used when email lookup fails (old records, deleted tracker entries, etc.)
 * 
 * @param {Object} eventData - Event data with fullName and companyName
 * @returns {File|null} The Build File or null if not found
 */
function findBuildFileByFolderSearch(eventData) {
  Logger.log(`   🔍 Searching folders for: ${eventData.fullName}`);
  
  try {
    const strongTeamsFolder = DriveApp.getFolderById(CONFIG.STRONG_TEAMS_FOLDER_ID);
    
    // Find company folder
    const companyFolders = strongTeamsFolder.getFoldersByName(eventData.companyName);
    if (!companyFolders.hasNext()) {
      Logger.log(`   ✗ Company folder not found: ${eventData.companyName}`);
      return null;
    }
    const companyFolder = companyFolders.next();
    Logger.log(`   ✓ Found company folder: ${eventData.companyName}`);
    
    // Find leader folder
    const leaderFolders = companyFolder.getFoldersByName(eventData.fullName);
    if (!leaderFolders.hasNext()) {
      Logger.log(`   ✗ Leader folder not found: ${eventData.fullName}`);
      return null;
    }
    const leaderFolder = leaderFolders.next();
    Logger.log(`   ✓ Found leader folder: ${eventData.fullName}`);
    
    // Find Build File
    const buildFileName = `${eventData.fullName} - Strong Teams Build File`;
    const buildFiles = leaderFolder.getFilesByName(buildFileName);
    if (!buildFiles.hasNext()) {
      Logger.log(`   ✗ Build File not found: ${buildFileName}`);
      return null;
    }
    
    const buildFile = buildFiles.next();
    Logger.log(`   ✓ Found Build File via folder search`);
    
    return buildFile;
    
  } catch (error) {
    Logger.log(`   ✗ Folder search error: ${error.message}`);
    return null;
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
 * Tests the new metadata storage for Phase 2 lookup
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
        const result = processPhase1Event(event);
        
        // Mark as processed with full metadata
        ProcessedEventsTracker.markEventProcessed(event, 'Phase 1', {
          fullName: result.eventData.fullName,
          companyName: result.eventData.companyName,
          email: result.eventData.email,
          buildFileId: result.buildFileId,
          leaderFolderId: result.leaderFolderId
        });
        
        Logger.log('\n✓ Test completed successfully!');
        Logger.log('\n📧 Stored for Phase 2 lookup:');
        Logger.log(`   Email: ${result.eventData.email}`);
        Logger.log(`   Build File ID: ${result.buildFileId}`);
        Logger.log(`   Folder ID: ${result.leaderFolderId}`);
        
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
 * Manual test function - run this to test Phase 2 with email lookup
 */
function testPhase2Automation() {
  Logger.log('=== MANUAL TEST MODE - PHASE 2 (Email Lookup) ===\n');
  
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
      Logger.log(`\nProcessing this event (using email lookup)...\n`);
      
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
 * Test email lookup without processing
 * Use this to verify the lookup works before running full Phase 2
 */
function testPhase2EmailLookup() {
  Logger.log('=== TESTING PHASE 2 EMAIL LOOKUP ===\n');
  
  // Get calendar events
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, oneWeekFromNow);
  
  let phase2Count = 0;
  
  events.forEach((event) => {
    if (!CalendarUtils.isPhase2Event(event)) return;
    
    phase2Count++;
    Logger.log(`\n${'─'.repeat(60)}`);
    Logger.log(`Phase 2 Event: ${event.getTitle()}`);
    Logger.log('─'.repeat(60));
    
    try {
      // Extract event data
      const eventData = CalendarUtils.extractEventData(event);
      Logger.log(`Leader: ${eventData.fullName}`);
      Logger.log(`Email: ${eventData.email}`);
      Logger.log(`Company: ${eventData.companyName}`);
      
      // Try email lookup
      Logger.log(`\n🔍 Searching Event Tracker by email...`);
      const result = ProcessedEventsTracker.findByEmail(eventData.email);
      
      if (result) {
        Logger.log(`✓ FOUND in Event Tracker!`);
        Logger.log(`   Stored Name: ${result.leaderName}`);
        Logger.log(`   Stored Company: ${result.company}`);
        Logger.log(`   Build File ID: ${result.buildFileId}`);
        
        // Try to get the file
        const file = ProcessedEventsTracker.getBuildFileById(result.buildFileId);
        if (file) {
          Logger.log(`   File URL: ${file.getUrl()}`);
          Logger.log(`   ✓ Ready for Phase 2 processing!`);
        } else {
          Logger.log(`   ⚠️ File ID exists but file not accessible`);
        }
      } else {
        Logger.log(`✗ NOT FOUND in Event Tracker`);
        Logger.log(`   Will fall back to folder search during processing`);
        
        // Test folder search
        Logger.log(`\n🔍 Testing folder search fallback...`);
        const buildFile = findBuildFileByFolderSearch(eventData);
        if (buildFile) {
          Logger.log(`   ✓ Found via folder search: ${buildFile.getName()}`);
        } else {
          Logger.log(`   ✗ Not found via folder search either`);
          Logger.log(`   ⚠️ Phase 1 may not have been completed for this leader`);
        }
      }
      
    } catch (error) {
      Logger.log(`✗ Error: ${error.message}`);
    }
  });
  
  Logger.log(`\n${'='.repeat(60)}`);
  Logger.log(`Total Phase 2 events checked: ${phase2Count}`);
  Logger.log('='.repeat(60));
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
    
    // Test email lookup storage
    Logger.log('\nTesting Event Tracker storage...');
    Logger.log(`   Email: ${sampleData.email}`);
    Logger.log(`   Build File ID: ${buildFile.getId()}`);
    Logger.log(`   Folder ID: ${folders.leaderFolder.getId()}`);
    
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
  Logger.log(`   With Email: ${stats.withEmail}`);
  Logger.log(`   With File ID: ${stats.withFileId}`);
  
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