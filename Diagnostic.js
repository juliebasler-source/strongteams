/**
 * Diagnostic - See exactly what's in the calendar description
 */
function diagnoseRawHTML() {
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const oneWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, oneWeek);
  
  // Find the David Trudell event (or first Phase 1)
  for (let event of events) {
    const desc = event.getDescription();
    if (desc && desc.includes('60 Minute Phase 1')) {
      
      Logger.log('='.repeat(70));
      Logger.log(`EVENT: ${event.getTitle()}`);
      Logger.log('='.repeat(70));
      
      // Show first 500 characters of RAW description
      Logger.log('\n=== RAW DESCRIPTION (first 500 chars) ===');
      Logger.log(desc.substring(0, 500));
      
      // Check for different types of breaks
      Logger.log('\n=== HTML TAG DETECTION ===');
      Logger.log(`Contains <br>: ${desc.includes('<br>')}`);
      Logger.log(`Contains <br/>: ${desc.includes('<br/>')}`);
      Logger.log(`Contains <br />: ${desc.includes('<br />')}`);
      Logger.log(`Contains <BR>: ${desc.includes('<BR>')}`);
      Logger.log(`Contains <p>: ${desc.includes('<p>')}`);
      Logger.log(`Contains </p>: ${desc.includes('</p>')}`);
      
      // Show what stripHtml produces
      Logger.log('\n=== AFTER STRIP HTML ===');
      const cleaned = CalendarUtils.stripHtml(desc);
      Logger.log(cleaned.substring(0, 500));
      
      // Count newlines in cleaned version
      const newlineCount = (cleaned.match(/\n/g) || []).length;
      Logger.log(`\n=== NEWLINE COUNT: ${newlineCount} ===`);
      
      // Show first 3 lines
      Logger.log('\n=== FIRST 3 LINES ===');
      const lines = cleaned.split('\n');
      lines.slice(0, 5).forEach((line, i) => {
        Logger.log(`Line ${i+1}: "${line}"`);
      });
      
      // Test extraction on this cleaned text
      Logger.log('\n=== TEST EXTRACTION ===');
      Logger.log(`First name: "${CalendarUtils.extractField(cleaned, 'First name:')}"`);
      Logger.log(`Last name: "${CalendarUtils.extractField(cleaned, 'Last name:')}"`);
      Logger.log(`Email: "${CalendarUtils.extractField(cleaned, 'Email:')}"`);
      
      break;
    }
  }
}
function debugTestCalendar() {
  Logger.log('='.repeat(70));
  Logger.log('DEBUG: TEST CALENDAR BOOKING - WHAT IS THAT 1 EVENT?');
  Logger.log('='.repeat(70));
  
  const calId = 'c_523c3c0415852db6460bb26baeb5fd65d00a5e0641ddf1548082cbe4f02dbe26@group.calendar.google.com';
  
  try {
    const cal = CalendarApp.getCalendarById(calId);
    
    if (!cal) {
      Logger.log('❌ Cannot access calendar');
      return;
    }
    
    Logger.log(`✅ Calendar: ${cal.getName()}`);
    Logger.log(`✅ Owner: ${cal.isOwnedByMe() ? 'ME (Julie)' : 'Someone else'}`);
    
    // Use the SAME time range as the automation
    const now = new Date();
    const lookbackTime = new Date(now.getTime() - (CONFIG.CALENDAR.lookbackHours * 60 * 60 * 1000));
    const lookaheadTime = new Date(now.getTime() + (CONFIG.CALENDAR.lookaheadHours * 60 * 60 * 1000));
    
    Logger.log(`\n📅 Searching from: ${lookbackTime.toLocaleString()}`);
    Logger.log(`📅 Searching to: ${lookaheadTime.toLocaleString()}`);
    Logger.log(`   (Lookback: ${CONFIG.CALENDAR.lookbackHours} hours)`);
    Logger.log(`   (Lookahead: ${CONFIG.CALENDAR.lookaheadHours} hours = ${CONFIG.CALENDAR.lookaheadHours/24} days)`);
    
    const events = cal.getEvents(lookbackTime, lookaheadTime);
    
    Logger.log(`\n✅ Found ${events.length} events\n`);
    
    if (events.length === 0) {
      Logger.log('⚠️ No events found in time range!');
      Logger.log('   This means all events are outside the search window.');
      return;
    }
    
    // Show ALL events with full details
    events.forEach((event, i) => {
      Logger.log('─'.repeat(70));
      Logger.log(`EVENT #${i + 1}:`);
      Logger.log('─'.repeat(70));
      Logger.log(`Title: ${event.getTitle()}`);
      Logger.log(`Date: ${event.getStartTime().toLocaleString()}`);
      Logger.log(`Event ID: ${event.getId()}`);
      Logger.log(`Location: ${event.getLocation() || '(none)'}`);
      
      const desc = event.getDescription() || '';
      Logger.log(`\nDescription (first 300 chars):`);
      Logger.log(desc.substring(0, 300));
      
      // Check if it's Phase 1
      const isP1 = CalendarUtils.isPhase1Event(event);
      Logger.log(`\n✓ Phase 1? ${isP1 ? '✅ YES' : '❌ NO'}`);
      
      // Check if it's Phase 2
      const isP2 = CalendarUtils.isPhase2Event(event);
      Logger.log(`✓ Phase 2? ${isP2 ? '✅ YES' : '❌ NO'}`);
      
      // Special check for Rodney
      if (event.getTitle().includes('Rodney')) {
        Logger.log(`\n🎯 THIS IS THE RODNEY EVENT!`);
      }
      
      Logger.log('');
    });
    
    // Summary
    Logger.log('='.repeat(70));
    Logger.log('SUMMARY:');
    Logger.log('='.repeat(70));
    
    const rodneyEvents = events.filter(e => e.getTitle().includes('Rodney'));
    const phase1Events = events.filter(e => CalendarUtils.isPhase1Event(e));
    
    Logger.log(`Total events: ${events.length}`);
    Logger.log(`Rodney events: ${rodneyEvents.length}`);
    Logger.log(`Phase 1 events: ${phase1Events.length}`);
    
    if (rodneyEvents.length === 0) {
      Logger.log(`\n⚠️ NO RODNEY EVENT FOUND!`);
      Logger.log(`   Possible reasons:`);
      Logger.log(`   1. Event was created after script last ran`);
      Logger.log(`   2. Event is outside time window`);
      Logger.log(`   3. Event title doesn't contain "Rodney"`);
    }
    
  } catch (error) {
    Logger.log(`❌ ERROR: ${error.message}`);
  }
}
// ============================================================================
// TRIGGER DIAGNOSTICS (Added Dec 27, 2024)
// ============================================================================

function testWhatGetNewCalendarEventsReturns() {
  Logger.log('='.repeat(80));
  Logger.log('WHAT DOES getNewCalendarEvents() RETURN?');
  Logger.log('='.repeat(80));
  Logger.log('');
  
  const events = CalendarUtils.getNewCalendarEvents();
  
  Logger.log(`Total events returned: ${events.length}\n`);
  
  events.forEach((event, index) => {
    const title = event.getTitle();
    const date = event.getStartTime();
    
    Logger.log(`${index + 1}. ${title}`);
    Logger.log(`   Date: ${date.toLocaleString()}`);
    
    if (title.includes('Rodney')) {
      Logger.log(`   🎯 RODNEY EVENT FOUND IN RESULTS!`);
    }
  });
  
  Logger.log('\n' + '─'.repeat(80));
  
  const rodneyCount = events.filter(e => e.getTitle().includes('Rodney')).length;
  
  if (rodneyCount === 0) {
    Logger.log('❌ PROBLEM: No Rodney events in results');
    Logger.log('   But we know the Rodney event exists and is accessible');
    Logger.log('   This means getNewCalendarEvents() is not returning it');
  } else {
    Logger.log(`✅ Found ${rodneyCount} Rodney event(s) in results`);
  }
  
  Logger.log('='.repeat(80));
}

function testTimeRange() {
  Logger.log('='.repeat(80));
  Logger.log('TIME RANGE DIAGNOSTIC');
  Logger.log('='.repeat(80));
  
  const now = new Date();
  const lookbackTime = new Date(now.getTime() - (CONFIG.CALENDAR.lookbackHours * 60 * 60 * 1000));
  const lookaheadTime = new Date(now.getTime() + (CONFIG.CALENDAR.lookaheadHours * 60 * 60 * 1000));
  
  Logger.log(`\nCurrent time: ${now.toLocaleString()}`);
  Logger.log(`\nSearch range:`);
  Logger.log(`   From: ${lookbackTime.toLocaleString()} (${CONFIG.CALENDAR.lookbackHours} hours ago)`);
  Logger.log(`   To:   ${lookaheadTime.toLocaleString()} (${CONFIG.CALENDAR.lookaheadHours} hours ahead)`);
  Logger.log(`   Span: ${CONFIG.CALENDAR.lookaheadHours / 24} days`);
  
  // Check Rodney event specifically
  Logger.log('\n' + '─'.repeat(80));
  Logger.log('RODNEY EVENT TIME CHECK:');
  Logger.log('─'.repeat(80));
  
  const calId = 'c_523c3c0415852db6460bb26baeb5fd65d00a5e0641ddf1548082cbe4f02dbe26@group.calendar.google.com';
  const cal = CalendarApp.getCalendarById(calId);
  
  // Get Rodney event
  const allEvents = cal.getEvents(lookbackTime, lookaheadTime);
  const rodneyEvents = allEvents.filter(e => e.getTitle().includes('Rodney'));
  
  if (rodneyEvents.length > 0) {
    rodneyEvents.forEach(event => {
      const eventTime = event.getStartTime();
      Logger.log(`\nRodney event: ${event.getTitle()}`);
      Logger.log(`   Event time: ${eventTime.toLocaleString()}`);
      Logger.log(`   Is in time range? ${eventTime >= lookbackTime && eventTime <= lookaheadTime ? '✅ YES' : '❌ NO'}`);
    });
  } else {
    Logger.log('\n❌ No Rodney events found in time range!');
  }
  
  Logger.log('\n' + '='.repeat(80));
}
/**
 * Full trigger simulation - shows what happens to EVERY event
 */
function diagnosticTriggerSimulation() {
  Logger.log('='.repeat(80));
  Logger.log('COMPREHENSIVE TRIGGER DIAGNOSTIC');
  Logger.log('Simulating exactly what onCalendarTrigger() does with detailed logging');
  Logger.log('='.repeat(80));
  Logger.log('');
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let alreadyProcessedCount = 0;
  
  try {
    // STEP 1: Get calendar events (exactly like the real trigger)
    Logger.log('STEP 1: Getting calendar events...');
    const events = CalendarUtils.getNewCalendarEvents();
    
    if (events.length === 0) {
      Logger.log('❌ No calendar events found');
      return;
    }
    
    Logger.log(`✅ Found ${events.length} total events\n`);
    
    // STEP 2: Log EVERY event before processing
    Logger.log('='.repeat(80));
    Logger.log('STEP 2: LISTING ALL EVENTS BEFORE PROCESSING');
    Logger.log('='.repeat(80));
    
    events.forEach((event, index) => {
      const title = event.getTitle();
      const date = event.getStartTime().toLocaleString();
      const eventId = event.getId();
      
      Logger.log(`\n[${index + 1}/${events.length}] ${title}`);
      Logger.log(`    Date: ${date}`);
      Logger.log(`    Event ID: ${eventId}`);
      
      // Quick phase check
      const isP1 = CalendarUtils.isPhase1Event(event);
      const isP2 = CalendarUtils.isPhase2Event(event);
      
      if (isP1) {
        Logger.log(`    🟢 Phase 1: YES`);
      } else if (isP2) {
        Logger.log(`    🔵 Phase 2: YES`);
      } else {
        Logger.log(`    ⚪ Other event (not Strong Teams)`);
      }
      
      if (title.includes('Rodney')) {
        Logger.log(`    🎯 THIS IS A RODNEY EVENT!`);
      }
    });
    
    // STEP 3: Process each event (exactly like real trigger)
    Logger.log('\n' + '='.repeat(80));
    Logger.log('STEP 3: PROCESSING EACH EVENT');
    Logger.log('='.repeat(80));
    Logger.log('');
    
    events.forEach((event, index) => {
      const title = event.getTitle();
      
      Logger.log(`\n${'─'.repeat(80)}`);
      Logger.log(`[${index + 1}/${events.length}] Processing: ${title}`);
      Logger.log('─'.repeat(80));
      
      try {
        // Check if Phase 1
        Logger.log('   Checking if Phase 1...');
        const isPhase1 = CalendarUtils.isPhase1Event(event);
        
        if (isPhase1) {
          Logger.log('   ✓ IS Phase 1');
          
          // Check if already processed
          Logger.log('   Checking tracking status...');
          const trackingStatus = ProcessedEventsTracker.isEventProcessed(event);
          
          Logger.log(`   Tracking result: ${JSON.stringify(trackingStatus)}`);
          
          if (trackingStatus.processed) {
            Logger.log(`   ⏭️ SKIPPING: Already processed`);
            alreadyProcessedCount++;
            return; // This is the forEach return, moves to next event
          }
          
          Logger.log('   ✅ NOT processed yet - would process now');
          Logger.log('   (Skipping actual processing in diagnostic mode)');
          successCount++;
          return;
        }
        
        Logger.log('   ✗ Not Phase 1');
        
        // Check if Phase 2
        Logger.log('   Checking if Phase 2...');
        const isPhase2 = CalendarUtils.isPhase2Event(event);
        
        if (isPhase2) {
          Logger.log('   ✓ IS Phase 2');
          
          // Check if already processed
          Logger.log('   Checking tracking status...');
          const trackingStatus = ProcessedEventsTracker.isEventProcessed(event);
          
          Logger.log(`   Tracking result: ${JSON.stringify(trackingStatus)}`);
          
          if (trackingStatus.processed) {
            Logger.log(`   ⏭️ SKIPPING: Already processed`);
            alreadyProcessedCount++;
            return;
          }
          
          Logger.log('   ✅ NOT processed yet - would process now');
          Logger.log('   (Skipping actual processing in diagnostic mode)');
          successCount++;
          return;
        }
        
        Logger.log('   ✗ Not Phase 2');
        Logger.log('   ⊘ SKIPPING: Not a Strong Teams event');
        skippedCount++;
        
      } catch (error) {
        Logger.log(`   ✗ ERROR: ${error.message}`);
        errorCount++;
      }
    });
    
  } catch (error) {
    Logger.log(`\nFATAL ERROR: ${error.message}`);
    Logger.log(error.stack);
    errorCount++;
  }
  
  // STEP 4: Summary
  Logger.log('\n' + '='.repeat(80));
  Logger.log('SUMMARY');
  Logger.log('='.repeat(80));
  Logger.log(`Total events found: ${events.length}`);
  Logger.log(`Would process (new): ${successCount}`);
  Logger.log(`Would skip (already processed): ${alreadyProcessedCount}`);
  Logger.log(`Would skip (not Strong Teams): ${skippedCount}`);
  Logger.log(`Errors: ${errorCount}`);
  Logger.log('='.repeat(80));
  
  // STEP 5: Specific Rodney check
  Logger.log('\n' + '='.repeat(80));
  Logger.log('RODNEY EVENT CHECK');
  Logger.log('='.repeat(80));
  
  const rodneyEvents = events.filter(e => e.getTitle().includes('Rodney'));
  
  if (rodneyEvents.length === 0) {
    Logger.log('❌ NO RODNEY EVENTS FOUND IN THE EVENT LIST');
    Logger.log('   This is the problem! The event is not being returned by CalendarUtils.getNewCalendarEvents()');
  } else {
    Logger.log(`✅ Found ${rodneyEvents.length} Rodney event(s):`);
    rodneyEvents.forEach((event, i) => {
      Logger.log(`\n   ${i + 1}. ${event.getTitle()}`);
      Logger.log(`      Date: ${event.getStartTime().toLocaleString()}`);
      Logger.log(`      Phase 1: ${CalendarUtils.isPhase1Event(event)}`);
      Logger.log(`      Phase 2: ${CalendarUtils.isPhase2Event(event)}`);
      
      const trackingStatus = ProcessedEventsTracker.isEventProcessed(event);
      Logger.log(`      Already processed: ${trackingStatus.processed}`);
    });
  }
  
  Logger.log('\n' + '='.repeat(80));
}
/**
 * Debug why Rodney's event isn't being processed
 * This will show EVERY step of the detection process
 */

function debugRodneyEvent() {
  Logger.log('='.repeat(70));
  Logger.log('DEBUGGING RODNEY EVENT DETECTION');
  Logger.log('='.repeat(70));
  
  // Get events from Test Calendar
  const testCalId = 'c_523c3c0415852db6460bb26baeb5fd65d00a5e0641ddf1548082cbe4f02dbe26@group.calendar.google.com';
  
  try {
    const testCal = CalendarApp.getCalendarById(testCalId);
    if (!testCal) {
      Logger.log('❌ Could not access Test Calendar!');
      return;
    }
    
    Logger.log(`✓ Test Calendar: ${testCal.getName()}`);
    
    const now = new Date();
    const future = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
    const events = testCal.getEvents(now, future);
    
    Logger.log(`✓ Found ${events.length} events in Test Calendar\n`);
    
    events.forEach((event, index) => {
      Logger.log('\n' + '─'.repeat(70));
      Logger.log(`EVENT #${index + 1}: ${event.getTitle()}`);
      Logger.log('─'.repeat(70));
      Logger.log(`Date: ${event.getStartTime()}`);
      Logger.log(`Event ID: ${event.getId()}`);
      
      const description = event.getDescription() || '';
      
      // Check Phase 1
      Logger.log('\n🔍 Checking Phase 1...');
      const isPhase1 = CONFIG.PHASE1.identifiers.some(id => {
        const found = description.includes(id);
        Logger.log(`  "${id}" → ${found ? 'FOUND ✓' : 'not found'}`);
        return found;
      });
      Logger.log(`Result: ${isPhase1 ? 'IS PHASE 1 ✓' : 'NOT Phase 1'}`);
      
      // Check Phase 2
      Logger.log('\n🔍 Checking Phase 2...');
      const isPhase2 = CONFIG.PHASE2.identifiers.some(id => {
        const found = description.includes(id);
        Logger.log(`  "${id}" → ${found ? 'FOUND ✓' : 'not found'}`);
        return found;
      });
      Logger.log(`Result: ${isPhase2 ? 'IS PHASE 2 ✓' : 'NOT Phase 2'}`);
      
      // If it's a Phase 2 event, try to process it
      if (isPhase2) {
        Logger.log('\n🎯 THIS IS A PHASE 2 EVENT!');
        
        // Check if tracked
        Logger.log('\n📋 Checking if already processed...');
        const trackingStatus = ProcessedEventsTracker.isEventProcessed(event);
        Logger.log(`  Processed: ${trackingStatus.processed}`);
        Logger.log(`  Needs Update: ${trackingStatus.needsUpdate}`);
        
        if (trackingStatus.processed) {
          Logger.log('  ⏭️ Would be SKIPPED (already processed)');
        } else {
          Logger.log('  ✅ Would be PROCESSED (not in tracker)');
          
          // Try to extract data
          Logger.log('\n📝 Attempting to extract data...');
          try {
            const eventData = CalendarUtils.extractEventData(event);
            Logger.log(`  ✓ Name: ${eventData.fullName}`);
            Logger.log(`  ✓ Email: ${eventData.email}`);
            Logger.log(`  ✓ Company: ${eventData.companyName}`);
            Logger.log(`  ✓ Zoom: ${eventData.zoomLink}`);
            
            // Check if Build File exists
            Logger.log('\n📁 Checking for Build File...');
            const strongTeamsFolder = DriveApp.getFolderById(CONFIG.STRONG_TEAMS_FOLDER_ID);
            
            const companyFolders = strongTeamsFolder.getFoldersByName(eventData.companyName);
            if (!companyFolders.hasNext()) {
              Logger.log(`  ❌ PROBLEM: Company folder NOT FOUND: ${eventData.companyName}`);
              Logger.log(`  → Phase 2 will FAIL with this error`);
              return;
            }
            
            const companyFolder = companyFolders.next();
            Logger.log(`  ✓ Company folder exists: ${eventData.companyName}`);
            
            const leaderFolders = companyFolder.getFoldersByName(eventData.fullName);
            if (!leaderFolders.hasNext()) {
              Logger.log(`  ❌ PROBLEM: Leader folder NOT FOUND: ${eventData.fullName}`);
              Logger.log(`  → Phase 2 will FAIL with this error`);
              return;
            }
            
            const leaderFolder = leaderFolders.next();
            Logger.log(`  ✓ Leader folder exists: ${eventData.fullName}`);
            
            const buildFileName = `${eventData.fullName} - Strong Teams Build File`;
            const buildFiles = leaderFolder.getFilesByName(buildFileName);
            
            if (!buildFiles.hasNext()) {
              Logger.log(`  ❌ PROBLEM: Build File NOT FOUND: ${buildFileName}`);
              Logger.log(`  → Phase 2 will FAIL with this error`);
              return;
            }
            
            const buildFile = buildFiles.next();
            Logger.log(`  ✓ Build File EXISTS!`);
            Logger.log(`  ✓ URL: ${buildFile.getUrl()}`);
            Logger.log('\n✅ THIS EVENT SHOULD PROCESS SUCCESSFULLY!');
            
          } catch (error) {
            Logger.log(`  ❌ ERROR extracting data: ${error.message}`);
            Logger.log(`  → Phase 2 will FAIL with this error`);
          }
        }
      }
    });
    
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
  }
  
  Logger.log('\n' + '='.repeat(70));
  Logger.log('DEBUG COMPLETE');
  Logger.log('='.repeat(70));
}