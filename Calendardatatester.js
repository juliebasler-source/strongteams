/**
 * Calendar Data Tester
 * 
 * Use this to test and debug calendar data extraction
 * WITHOUT creating any folders or files
 */

/**
 * Main test function - shows all Phase 1 events and their extracted data
 */
function testCalendarDataExtraction() {
  Logger.log('='.repeat(70));
  Logger.log('CALENDAR DATA EXTRACTION TEST');
  Logger.log('='.repeat(70));
  
  // Get calendar events
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, oneWeekFromNow);
  
  Logger.log(`\nFound ${events.length} events in the next 7 days\n`);
  
  // Check each event
  events.forEach((event, index) => {
    Logger.log('\n' + '─'.repeat(70));
    Logger.log(`EVENT ${index + 1}: ${event.getTitle()}`);
    Logger.log('─'.repeat(70));
    
    // Check if it's Phase 1
    const isPhase1 = checkIfPhase1(event);
    Logger.log(`Is Phase 1 Event: ${isPhase1 ? '✓ YES' : '✗ NO'}`);
    
    if (isPhase1) {
      // Show raw data
      showRawEventData(event);
      
      // Show extracted data
      Logger.log('\n' + '─'.repeat(70));
      Logger.log('EXTRACTED DATA:');
      Logger.log('─'.repeat(70));
      
      try {
        const data = extractCleanEventData(event);
        Logger.log(JSON.stringify(data, null, 2));
      } catch (error) {
        Logger.log(`❌ ERROR: ${error.message}`);
      }
    }
  });
  
  Logger.log('\n' + '='.repeat(70));
  Logger.log('TEST COMPLETE');
  Logger.log('='.repeat(70));
}

/**
 * Show detailed raw data from a single event
 */
function inspectSingleEvent() {
  Logger.log('='.repeat(70));
  Logger.log('INSPECT SINGLE EVENT - Detailed View');
  Logger.log('='.repeat(70));
  
  // Get events
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, oneWeekFromNow);
  
  // Find first Phase 1 event
  for (let event of events) {
    if (checkIfPhase1(event)) {
      Logger.log(`\n📅 EVENT: ${event.getTitle()}\n`);
      showRawEventData(event);
      
      Logger.log('\n' + '─'.repeat(70));
      Logger.log('CLEANED & EXTRACTED:');
      Logger.log('─'.repeat(70));
      
      const data = extractCleanEventData(event);
      
      Logger.log(`First Name: "${data.firstName}"`);
      Logger.log(`Last Name: "${data.lastName}"`);
      Logger.log(`Full Name: "${data.fullName}"`);
      Logger.log(`Email: "${data.email}"`);
      Logger.log(`Company: "${data.companyName}"`);
      Logger.log(`Phone: "${data.phoneNumber}"`);
      Logger.log(`Zoom Link: "${data.zoomLink}"`);
      Logger.log(`Date: "${data.formattedDate}"`);
      Logger.log(`Time: "${data.formattedTime}"`);
      
      return; // Stop after first one
    }
  }
  
  Logger.log('\n❌ No Phase 1 events found in next 7 days');
}

/**
 * Show raw event data exactly as it comes from calendar
 */
function showRawEventData(event) {
  Logger.log('\n📋 RAW EVENT DATA:');
  Logger.log('─'.repeat(70));
  
  const description = event.getDescription();
  const location = event.getLocation();
  
  Logger.log(`Title: ${event.getTitle()}`);
  Logger.log(`Start Time: ${event.getStartTime()}`);
  Logger.log(`Location: ${location}`);
  Logger.log(`\nDescription (first 500 chars):`);
  Logger.log(description.substring(0, 500));
  Logger.log(`\nDescription length: ${description.length} characters`);
  
  // Show if it has HTML
  if (description.includes('<')) {
    Logger.log('⚠️  Contains HTML tags');
  }
}

/**
 * Check if event is Phase 1
 */
function checkIfPhase1(event) {
  const description = event.getDescription() || '';
  return description.includes('60 Minute Phase 1 - Leader Only');
}

/**
 * Extract clean data from event (improved version)
 */
function extractCleanEventData(event) {
  let description = event.getDescription() || '';
  
  // Step 1: Strip HTML tags
  description = stripHtml(description);
  
  Logger.log('\n📝 CLEANED DESCRIPTION:');
  Logger.log('─'.repeat(70));
  Logger.log(description.substring(0, 500));
  Logger.log('─'.repeat(70));
  
  // Step 2: Extract fields
  const data = {
    eventId: event.getId(),
    eventTitle: event.getTitle(),
    startDate: event.getStartTime(),
    
    // Extract from cleaned description
    firstName: extractFieldClean(description, 'First name'),
    lastName: extractFieldClean(description, 'Last name'),
    email: extractFieldClean(description, 'Email'),
    phoneNumber: extractFieldClean(description, 'Phone number'),
    
    // Get Zoom link from Location field
    zoomLink: event.getLocation() || '',
    
    // Formatted date and time
    formattedDate: getFormattedDate(event.getStartTime()),
    formattedTime: getFormattedTime(event.getStartTime())
  };
  
  // Capitalize names
  data.firstName = capitalizeWord(data.firstName);
  data.lastName = capitalizeWord(data.lastName);
  data.fullName = `${data.firstName} ${data.lastName}`;
  
  // Get company name from email
  data.companyName = getCompanyFromEmail(data.email);
  
  return data;
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html) {
  if (!html) return '';
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Extract field value from description (improved version)
 */
function extractFieldClean(description, label) {
  // Try with colon first
  let regex = new RegExp(label + ':\\s*([^\\n\\r]+)', 'i');
  let match = description.match(regex);
  
  if (match) {
    return match[1].trim();
  }
  
  // Try without colon
  regex = new RegExp(label + '\\s+([^\\n\\r]+)', 'i');
  match = description.match(regex);
  
  return match ? match[1].trim() : '';
}

/**
 * Get company name from email
 */
function getCompanyFromEmail(email) {
  if (!email) return '';
  
  const domain = email.split('@')[1];
  if (!domain) return '';
  
  const companyPart = domain.split('.')[0];
  
  return companyPart.charAt(0).toUpperCase() + companyPart.slice(1).toLowerCase();
}

/**
 * Capitalize word
 */
function capitalizeWord(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Test HTML stripping specifically
 */
function testHtmlStripping() {
  const testCases = [
    '<p>First name: David</p>',
    'First name: David<br />Last name: Trudell',
    '<p>Email: test@example.com<br />Phone: 123456</p>',
    'Plain text with no HTML'
  ];
  
  Logger.log('=== HTML STRIPPING TEST ===\n');
  
  testCases.forEach((html, index) => {
    Logger.log(`Test ${index + 1}:`);
    Logger.log(`Input:  "${html}"`);
    Logger.log(`Output: "${stripHtml(html)}"`);
    Logger.log('');
  });
}

/**
 * Test field extraction with different formats
 */
function testFieldExtraction() {
  const testDescriptions = [
    'First name: David\nLast name: Trudell\nEmail: david@example.com',
    'First name:David\nLast name:Trudell',
    'First name David Last name Trudell',
    '<p>First name: David<br />Last name: Trudell</p>'
  ];
  
  Logger.log('=== FIELD EXTRACTION TEST ===\n');
  
  testDescriptions.forEach((desc, index) => {
    Logger.log(`Test ${index + 1}:`);
    Logger.log(`Description: "${desc}"`);
    
    const cleaned = stripHtml(desc);
    Logger.log(`Cleaned: "${cleaned}"`);
    
    const firstName = extractFieldClean(cleaned, 'First name');
    const lastName = extractFieldClean(cleaned, 'Last name');
    const email = extractFieldClean(cleaned, 'Email');
    
    Logger.log(`First Name: "${firstName}"`);
    Logger.log(`Last Name: "${lastName}"`);
    Logger.log(`Email: "${email}"`);
    Logger.log('');
  });
}

/**
 * Compare old vs new extraction
 */
function compareExtractionMethods() {
  Logger.log('=== COMPARING OLD vs NEW EXTRACTION ===\n');
  
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, oneWeekFromNow);
  
  for (let event of events) {
    if (checkIfPhase1(event)) {
      Logger.log(`Event: ${event.getTitle()}\n`);
      
      // OLD METHOD (from CalendarUtils)
      Logger.log('OLD METHOD (CalendarUtils):');
      try {
        const oldData = CalendarUtils.extractEventData(event);
        Logger.log(`  First Name: "${oldData.firstName}"`);
        Logger.log(`  Last Name: "${oldData.lastName}"`);
        Logger.log(`  Email: "${oldData.email}"`);
      } catch (e) {
        Logger.log(`  ERROR: ${e.message}`);
      }
      
      // NEW METHOD (with HTML stripping)
      Logger.log('\nNEW METHOD (with HTML cleaning):');
      try {
        const newData = extractCleanEventData(event);
        Logger.log(`  First Name: "${newData.firstName}"`);
        Logger.log(`  Last Name: "${newData.lastName}"`);
        Logger.log(`  Email: "${newData.email}"`);
      } catch (e) {
        Logger.log(`  ERROR: ${e.message}`);
      }
      
      return; // Stop after first event
    }
  }
}