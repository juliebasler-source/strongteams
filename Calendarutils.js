/**
 * Strong Teams Automation - Calendar Utilities
 * 
 * @version 1.2.0
 * @phase Phase 2 Added - Multi-Calendar Support
 * @description Parse and extract data from calendar events with HTML stripping
 * @lastUpdated 2024-12-24
 * 
 * Key features:
 * - HTML tag removal and entity decoding
 * - Smart field extraction with label detection
 * - Company name generation from email domains
 * - Clean data output for folder/file naming
 * - Phase 1 and Phase 2 event detection
 * - Multi-calendar monitoring support
 * 
 * CHANGELOG v1.2.0:
 * - Added multi-calendar support in getNewCalendarEvents()
 * - Now monitors default calendar + any secondary calendars in CONFIG.CALENDARS.secondary
 * - Enhanced logging to show which calendar events come from
 * 
 * CHANGELOG v1.1.0:
 * - Added isPhase2Event() function for Team Building session detection
 */

const CalendarUtils = {
  
  /**
   * Get new calendar events that might be Phase 1 or Phase 2 sessions
   * Checks default calendar AND any configured secondary calendars
   * 
   * @returns {CalendarEvent[]} Array of all events from all configured calendars
   * @since v1.2.0 - Now supports multiple calendars
   */
  getNewCalendarEvents: function() {
    const now = new Date();
    const lookbackTime = new Date(now.getTime() - (CONFIG.CALENDAR.lookbackHours * 60 * 60 * 1000));
    const lookaheadTime = new Date(now.getTime() + (CONFIG.CALENDAR.lookaheadHours * 60 * 60 * 1000));
    
    let allEvents = [];
    
    // Get events from PRIMARY calendar (default)
    try {
      const primaryCalendar = CalendarApp.getDefaultCalendar();
      const primaryEvents = primaryCalendar.getEvents(lookbackTime, lookaheadTime);
      allEvents = allEvents.concat(primaryEvents);
      Logger.log(`📅 PRIMARY calendar (${primaryCalendar.getName()}): Found ${primaryEvents.length} events`);
    } catch (error) {
      Logger.log(`⚠️ Could not access primary calendar: ${error.message}`);
    }
    
    // Get events from SECONDARY calendars (if configured)
    if (CONFIG.CALENDARS && CONFIG.CALENDARS.secondary && CONFIG.CALENDARS.secondary.length > 0) {
      Logger.log(`🔍 Checking ${CONFIG.CALENDARS.secondary.length} secondary calendar(s)...`);
      
      CONFIG.CALENDARS.secondary.forEach((calendarId, index) => {
        try {
          const secondaryCalendar = CalendarApp.getCalendarById(calendarId);
          
          if (!secondaryCalendar) {
            Logger.log(`⚠️ Secondary calendar #${index + 1} not found: ${calendarId}`);
            return;
          }
          
          const secondaryEvents = secondaryCalendar.getEvents(lookbackTime, lookaheadTime);
          allEvents = allEvents.concat(secondaryEvents);
          Logger.log(`📅 SECONDARY calendar #${index + 1} (${secondaryCalendar.getName()}): Found ${secondaryEvents.length} events`);
          
        } catch (error) {
          Logger.log(`⚠️ Could not access secondary calendar #${index + 1} (${calendarId}): ${error.message}`);
        }
      });
    } else {
      Logger.log(`ℹ️ No secondary calendars configured`);
    }
    
    Logger.log(`✅ Total events found across all calendars: ${allEvents.length}`);
    
    return allEvents;
  },
  
  /**
   * Check if event is a Phase 1 session based on notes
   * Looking for: "Appointment Type : 60 Minute Phase 1 - Leader Only"
   */
  isPhase1Event: function(event) {
    const description = event.getDescription() || '';
    
    // Check if description contains any Phase 1 identifier
    const isPhase1 = CONFIG.PHASE1.identifiers.some(identifier => 
      description.includes(identifier)
    );
    
    if (isPhase1) {
      Logger.log(`✓ Phase 1 event detected: ${event.getTitle()}`);
    }
    
    return isPhase1;
  },
  
  /**
   * Check if event is a Phase 2 session based on notes
   * Looking for: "Appointment Type : 90 Minute Phase 2 - Team Building"
   * 
   * @param {CalendarEvent} event - The calendar event to check
   * @returns {boolean} True if this is a Phase 2 event
   * @since v1.1.0
   */
  isPhase2Event: function(event) {
    const description = event.getDescription() || '';
    
    // Check if description contains any Phase 2 identifier
    const isPhase2 = CONFIG.PHASE2.identifiers.some(identifier => 
      description.includes(identifier)
    );
    
    if (isPhase2) {
      Logger.log(`✓ Phase 2 event detected: ${event.getTitle()}`);
    }
    
    return isPhase2;
  },
  
  /**
   * Extract all necessary data from calendar event
   * Returns object with: firstName, lastName, email, companyName, date, time, zoomLink, eventId
   */
  extractEventData: function(event) {
    let description = event.getDescription() || '';
    
    // CRITICAL: Strip HTML tags from description first
    description = this.stripHtml(description);
    
    // Extract data using regex patterns
    const data = {
      eventId: event.getId(),
      eventTitle: event.getTitle(),
      startDate: event.getStartTime(),
      
      // Extract from cleaned description
      firstName: this.extractField(description, 'First name:'),
      lastName: this.extractField(description, 'Last name:'),
      email: this.extractFirstEmail(description),
      phoneNumber: this.extractField(description, 'Phone number:'),
      
      // Get Zoom link from Location field
      zoomLink: event.getLocation() || '',
      
      // Formatted date and time
      formattedDate: getFormattedDate(event.getStartTime()),
      formattedTime: getFormattedTime(event.getStartTime())
    };
    
    // Capitalize names properly
    data.firstName = this.capitalizeWord(data.firstName);
    data.lastName = this.capitalizeWord(data.lastName);
    data.fullName = `${data.firstName} ${data.lastName}`;
    
    // Get company name from email domain
    data.companyName = this.getCompanyFromEmail(data.email);
    
    // Validate we have required data
    if (!data.firstName || !data.lastName || !data.email) {
      throw new Error('Missing required fields: firstName, lastName, or email');
    }
    
    Logger.log(`Extracted data for: ${data.fullName} (${data.email})`);
    
    return data;
  },
  
  /**
   * Strip HTML tags and decode HTML entities
   * CRITICAL: Converts ALL types of HTML breaks to actual newlines
   */
  stripHtml: function(html) {
    if (!html) return '';
    
    let text = html;
    
    // FIRST: Replace ALL variations of HTML breaks with newlines
    // Handle <br>, <br/>, <br />, <BR>, <BR/>, <BR />, and any spacing/case variations
    text = text.replace(/<br\s*\/?>/gi, '\n');         // <br>, <br/>, <br />, <BR>, etc.
    text = text.replace(/<\/\s*br\s*>/gi, '\n');       // </br>, </BR>
    
    // Handle paragraph and div endings
    text = text.replace(/<\/\s*p\s*>/gi, '\n\n');      // </p>, </P> - double newline for paragraphs
    text = text.replace(/<p[^>]*>/gi, '\n');            // <p>, <p class="...">, etc.
    text = text.replace(/<\/\s*div\s*>/gi, '\n');      // </div>, </DIV>
    text = text.replace(/<div[^>]*>/gi, '\n');          // <div>, <div class="...">, etc.
    
    // Handle list items
    text = text.replace(/<\/\s*li\s*>/gi, '\n');       // </li>
    text = text.replace(/<li[^>]*>/gi, '\n• ');         // <li> - add bullet
    
    // Handle headings
    text = text.replace(/<\/\s*h[1-6]\s*>/gi, '\n\n'); // </h1>, </h2>, etc.
    text = text.replace(/<h[1-6][^>]*>/gi, '\n');      // <h1>, <h2>, etc.
    
    // SECOND: Remove ALL remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');
    
    // THIRD: Decode HTML entities
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/&amp;/gi, '&');
    text = text.replace(/&lt;/gi, '<');
    text = text.replace(/&gt;/gi, '>');
    text = text.replace(/&quot;/gi, '"');
    text = text.replace(/&#39;/gi, "'");
    text = text.replace(/&apos;/gi, "'");
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    
    // FOURTH: Clean up whitespace but PRESERVE newlines
    text = text.replace(/[ \t]+/g, ' ');                // Multiple spaces/tabs to single space  
    text = text.replace(/ +\n/g, '\n');                 // Remove spaces before newlines
    text = text.replace(/\n +/g, '\n');                 // Remove spaces after newlines
    text = text.replace(/\n{3,}/g, '\n\n');             // Max 2 consecutive newlines
    
    // FIFTH: Trim and ensure we end with newline for last field
    text = text.trim();
    if (text && !text.endsWith('\n')) {
      text += '\n';
    }
    
    return text;
  },
  
  /**
   * Extract field value from description using label
   * Example: "First name: April" → returns "April"
   * CRITICAL: Stops at newline OR next field label
   */
  extractField: function(description, label) {
    // Remove colon from label for flexible matching
    const cleanLabel = label.replace(':', '').trim();
    
    // Pattern: "Label: Value" - captures until newline OR next label
    const regex = new RegExp(cleanLabel + '\\s*:\\s*([^\\n\\r]+)', 'i');
    const match = description.match(regex);
    
    if (!match || !match[1]) {
      return '';
    }
    
    let value = match[1].trim();
    
    // CRITICAL: Stop at next field label if found on same line
    // Common YouCanBookMe labels
    const labels = [
      'last name',
      'first name', 
      'phone number',
      'email',
      'additional email',
      'notes',
      'appointment type',
      'booking page',
      'duration',
      'booking reference',
      'location',
      'reschedule',
      'cancel',
      'ycbm link'
    ];
    
    // Find the earliest occurrence of any label in the value
    let earliestIndex = value.length;
    labels.forEach(nextLabel => {
      const regex = new RegExp('(' + nextLabel + ')\\s*:', 'i');
      const labelMatch = value.match(regex);
      if (labelMatch && labelMatch.index < earliestIndex) {
        earliestIndex = labelMatch.index;
      }
    });
    
    // Trim at that point
    if (earliestIndex < value.length) {
      value = value.substring(0, earliestIndex).trim();
    }
    
    return value;
  },
  
  /**
   * Extract first email address from description
   * Format: "Email: aw@aprilwelch.com"
   * CRITICAL: Extracts ONLY the email, not text after it
   */
  extractFirstEmail: function(description) {
    // Look for "Email:" field first using our robust extractField
    let emailField = this.extractField(description, 'Email:');
    
    // Extract just the email address from the field value
    if (emailField) {
      const emailMatch = emailField.match(/([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
      if (emailMatch) {
        return emailMatch[1];
      }
    }
    
    // Fallback: Search for any email pattern in entire description
    const emailRegex = /([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/;
    const match = description.match(emailRegex);
    return match ? match[1] : '';
  },
  
  /**
   * Get company name from email domain
   * Example: "aw@aprilwelch.com" → "Aprilwelch"
   */
  getCompanyFromEmail: function(email) {
    if (!email) return '';
    
    const domain = email.split('@')[1];
    return this.formatDomainAsCompanyName(domain);
  },
  
  /**
   * Format domain as company name
   * Examples:
   * "aprilwelch.com" → "Aprilwelch"
   * "statefarm.com" → "Statefarm"
   * "abc-consulting.com" → "Abc Consulting"
   */
  formatDomainAsCompanyName: function(domain) {
    if (!domain) return '';
    
    // Remove TLD (.com, .org, .edu, etc.)
    const companyPart = domain.split('.')[0];
    
    // Handle different separators and cases
    const formatted = companyPart
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → Camel Case
      .split(/[-_]/).join(' ')              // dashes/underscores → spaces
      .split(' ')
      .map(word => this.capitalizeWord(word))
      .join(' ');
    
    return formatted;
  },
  
  /**
   * Capitalize first letter of word, lowercase rest
   * "APRIL" → "April"
   * "welch" → "Welch"
   */
  capitalizeWord: function(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
};