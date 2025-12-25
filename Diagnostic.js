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