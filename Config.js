/**
 * Strong Teams Automation - Configuration
 * 
 * @version 1.2.0
 * @phase Phase 1 Enhanced - Event Deduplication
 * @description Centralized configuration for all automation settings
 * @lastUpdated 2024-12-25
 * 
 * IMPORTANT: Update adminEmail with your email address
 * 
 * CHANGELOG v1.2.0:
 * - Extended lookaheadHours to 2160 (90 days) for far-future event capture
 * - Added PROCESSED_EVENTS section for deduplication tracking
 * - Events now processed once and tracked to prevent duplicates
 * 
 * CHANGELOG v1.1.4:
 * - Added CALENDARS section to support multiple calendar monitoring
 * - Added test/secondary calendar support
 * - Primary calendar (default) + secondary calendars now monitored automatically
 * 
 * CHANGELOG v1.1.3:
 * - Added phase2LoginCodeRow to copy login code to Phase 2 Settings B8
 * 
 * CHANGELOG v1.1.1:
 * - Added phase1LoginCodeRow (Row 8) to store IDS login code
 * 
 * CHANGELOG v1.1.0:
 * - Added IDS_API configuration section for response link generation
 * - Added Phase 2 configuration for future Team Building automation
 */

const CONFIG = {
  // ========================================
  // FEATURE TOGGLES
  // ========================================
  createFolders: true,
  copyBuildFile: true,
  populateData: true,
  sendEmailNotifications: true,
  
  // ========================================
  // FOLDER IDs
  // ========================================
  STRONG_TEAMS_FOLDER_ID: '1qC82Iw9DbZiK-gYgB4fpMwAChpVJOc3T',
  
  // ========================================
  // TEMPLATE FILE IDs
  // ========================================
  TEMPLATES: {
    buildFile: '1HGa3SH8VE8xLEdmrLxOUPxF8qjF6AU33FY3lf6Z31wY'
  },
  
  // ========================================
  // CALENDAR IDs
  // ========================================
  CALENDARS: {
    // Primary calendar (your main calendar)
    // null = use default Google Calendar
    primary: null,
    
    // Secondary calendars (test calendars, backup calendars, etc.)
    // Add as many calendar IDs as needed - all will be monitored!
    secondary: [
      'c_523c3c0415852db6460bb26baeb5fd65d00a5e0641ddf1548082cbe4f02dbe26@group.calendar.google.com'  // Test Calendar
      // Add more calendar IDs here if needed:
      // 'another-calendar@group.calendar.google.com',
      // 'third-calendar@group.calendar.google.com'
    ]
  },
  
  // ========================================
  // PROCESSED EVENTS TRACKING (NEW in v1.2.0)
  // ========================================
  PROCESSED_EVENTS: {
    // Spreadsheet ID for tracking processed events
    // Leave null to auto-create on first run
    spreadsheetId: null,
    
    // Sheet name within the tracking spreadsheet
    sheetName: 'Processed Events',
    
    // How long to keep records (in days) - events older than this are cleaned up
    retentionDays: 120,
    
    // Enable/disable tracking (set to false to process all events every time)
    enabled: true
  },
  
  // ========================================
  // PHASE 1 SETTINGS
  // ========================================
  PHASE1: {
    // Sheet name in Build File where Phase 1 data goes
    sheetName: 'Phase 1 Settings',
    
    // Row numbers for each field (Column A = labels, Column B = data)
    rows: {
      date: 2,      // Row 2: Phase 1 Date
      time: 3,      // Row 3: Phase 1 Time
      name: 7,      // Row 7: Leader Name (NOT row 4 - that's Assessment Link)
      zoomLink: 9   // Row 9: Phase 1 Zoom Link (NOT row 5 - that has a formula)
    },
    
    // Keywords to identify Phase 1 events
    identifiers: [
      '60 Minute Phase 1 - Leader Only',
      'Phase 1 - Leader Only',
      'Phase 1 Coaching',
      '60 Minute Phase 1'
    ]
  },
  
  // ========================================
  // PHASE 2 SETTINGS
  // ========================================
  PHASE2: {
    // Sheet name in Build File where Phase 2 data goes
    sheetName: 'Phase 2 Settings',
    
    // Row numbers for each field (Column A = labels, Column B = data)
    rows: {
      date: 2,      // Row 2: Phase 2 Meeting Date
      time: 3,      // Row 3: Phase 2 Meeting Time
      zoomLink: 9   // Row 9: Phase 2 Zoom Link
    },
    
    // Keywords to identify Phase 2 events
    identifiers: [
      '90 Minute Phase 2 - Team Building',
      'Phase 2 - Team Building',
      'Phase 2 Team Building',
      '90 Minute Phase 2'
    ]
  },
  
  // ========================================
  // DATE/TIME FORMATTING
  // ========================================
  dateFormat: {
    // Format: "December 22, 2024"
    style: 'long', // 'long' = full month name
    includeYear: true
  },
  
  timeFormat: {
    // Format: "2:00 PM EST"
    hour12: true,      // Use 12-hour format (not 24-hour)
    includeTimezone: true
  },
  
  // ========================================
  // EMAIL SETTINGS
  // ========================================
  EMAIL: {
    notifyOnSuccess: false,  // Send email when automation succeeds
    notifyOnError: true,     // Send email when automation fails
    adminEmail: 'admin@basleracademy.com'  // ⚠️ UPDATE THIS WITH YOUR EMAIL
  },
  
  // ========================================
  // CALENDAR SETTINGS
  // ========================================
  CALENDAR: {
    // How far back to check for new events (in hours)
    lookbackHours: 1,
    
    // How far ahead to check for upcoming events (in hours)
    // UPDATED v1.2.0: Extended to 90 days (2160 hours) for far-future booking
    lookaheadHours: 2160
  },
  
  // ========================================
  // IDS API SETTINGS
  // ========================================
  IDS_API: {
    // Toggle: Set to false to disable URL storage in Row 4
    storeFullUrlInRow4: false,  // Set to true to enable URL storage
    
    // API endpoint with account login
    endpoint: 'https://api.justrespond.com/api/v3/links?account_login=BASLERACADEMY',
    
    // API Key for Authorization header
    apiKey: '01KBQM7E1B420HD75KVMPQ88CXd9cc94b972',
    
    // Fixed configuration values
    contactEmail: 'admin@basleracademy.com',
    tagId: 349283,
    reportView: '6217',
    
    // Which rows to store IDS data in Phase 1 Settings sheet
    phase1LinkRow: 4,      // Row 4: Leader Assessment Link (full URL)
    phase1LoginCodeRow: 8, // Row 8: Response Link (login code only)
    
    // Which row to store IDS data in Phase 2 Settings sheet
    phase2LoginCodeRow: 8  // Row 8: Response Link (copied from Phase 1)
  }
};

/**
 * Get formatted date string
 * Example: December 22, 2024
 */
function getFormattedDate(date) {
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get formatted time string with timezone
 * Example: 2:00 PM EST
 */
function getFormattedTime(date) {
  const options = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  };
  return date.toLocaleTimeString('en-US', options);
}