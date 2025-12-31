/**
 * Interview Link Manager
 * Creates IDS assessment links for leader interviews
 * 
 * Setup: Run setupIDSApiKey() once to store your API key securely
 * Usage: Strong Teams menu → Create Interview Link
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const INTERVIEW_LINK_CONFIG = {
  // Event Tracking Sheet
  EVENT_TRACKING_SHEET_ID: '1HNuM6mpisqkiNAH0k9YHSFLJ9kY2KkF0tqdWOLtG2lw',
  EVENT_TRACKING_SHEET_NAME: 'Processed Events',
  
  // Column mappings in Event Tracking (1-indexed)
  COLUMNS: {
    LEADER_NAME: 4,    // Column D
    LEADER_EMAIL: 9,   // Column I
    BUILD_FILE_ID: 10  // Column J
  },
  
  // IDS API Configuration
  IDS_API_BASE_URL: 'https://api.justrespond.com/api/v3',
  IDS_ACCOUNT_LOGIN: 'BASLERACADEMY',
  
  // Link Settings (from template)
  TAG_ID: 349283,
  REPORTVIEW_ID: '6217/1056',
  CONTACT_EMAIL: 'admin@basleracademy.com',
  
  // Build File Location
  PHASE1_SHEET_NAME: 'Phase 1 Settings',
  LEADER_NAME_CELL: 'B7',
  ASSESSMENT_LINK_CELL: 'B4',
  
  // New Sheet Name
  INTERVIEW_SHEET_NAME: 'Interview Link'
};

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

/**
 * One-time setup to store IDS API key securely
 * Run this function once, then never again
 */
function setupIDSApiKey() {
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.prompt(
    'IDS API Key Setup',
    'Enter your IDS API key for BASLERACADEMY account:\n\n' +
    '(This will be stored securely and you won\'t need to enter it again)',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() == ui.Button.OK) {
    var apiKey = response.getResponseText().trim();
    
    if (!apiKey) {
      ui.alert('Setup Cancelled', 'No API key entered.', ui.ButtonSet.OK);
      return;
    }
    
    // Store in Script Properties (secure, not visible in code)
    PropertiesService.getScriptProperties().setProperty('IDS_API_KEY', apiKey);
    
    ui.alert(
      'Setup Complete',
      'IDS API key has been stored securely.\n\n' +
      'You can now use "Create Interview Link" from the Strong Teams menu.',
      ui.ButtonSet.OK
    );
    
    Logger.log('IDS API key stored successfully');
  }
}

/**
 * Get stored IDS API key
 */
function getIDSApiKey() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('IDS_API_KEY');
  
  if (!apiKey) {
    throw new Error(
      'IDS API key not configured.\n\n' +
      'Please run "Setup IDS API Key" from the Strong Teams menu first.'
    );
  }
  
  return apiKey;
}

/**
 * Test API key is working
 */
function testIDSApiKey() {
  try {
    var apiKey = getIDSApiKey();
    
    var options = {
      'method': 'get',
      'headers': {
        'Authorization': apiKey
      },
      'muteHttpExceptions': true
    };
    
    var response = UrlFetchApp.fetch(
      INTERVIEW_LINK_CONFIG.IDS_API_BASE_URL + '/ping',
      options
    );
    
    if (response.getResponseCode() === 200) {
      SpreadsheetApp.getUi().alert(
        'API Key Valid',
        'Successfully connected to IDS API.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return true;
    } else {
      SpreadsheetApp.getUi().alert(
        'API Error',
        'Response code: ' + response.getResponseCode() + '\n' + response.getContentText(),
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return false;
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    return false;
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Main function to create an Interview Assessment link
 * Called from menu: Strong Teams → Create Interview Link
 */
function createInterviewLink() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // Step 1: Get leader name from Phase 1 Settings
    var phase1Sheet = ss.getSheetByName(INTERVIEW_LINK_CONFIG.PHASE1_SHEET_NAME);
    if (!phase1Sheet) {
      throw new Error('Could not find "' + INTERVIEW_LINK_CONFIG.PHASE1_SHEET_NAME + '" sheet.');
    }
    
    var leaderName = phase1Sheet.getRange(INTERVIEW_LINK_CONFIG.LEADER_NAME_CELL).getValue();
    if (!leaderName) {
      throw new Error('Leader name not found in ' + INTERVIEW_LINK_CONFIG.LEADER_NAME_CELL + '.\n\nPlease fill in the leader name first.');
    }
    
    Logger.log('Leader Name: ' + leaderName);
    
    // Step 2: Look up leader email from Event Tracking
    var leaderEmail = getLeaderEmailFromTracking(leaderName);
    Logger.log('Leader Email: ' + leaderEmail);
    
    // Step 3: Confirm with user
    var confirmResponse = ui.alert(
      'Create Interview Link',
      'Create interview assessment link for:\n\n' +
      'Name: ' + leaderName + '\n' +
      'Email: ' + leaderEmail + '\n\n' +
      'Link Name: ' + leaderName + ' - Interview Assessment',
      ui.ButtonSet.YES_NO
    );
    
    if (confirmResponse !== ui.Button.YES) {
      ui.alert('Cancelled', 'Link creation cancelled.', ui.ButtonSet.OK);
      return;
    }
    
    // Step 4: Create the IDS link
    ui.alert('Creating Link', 'Please wait while the link is created...', ui.ButtonSet.OK);
    
    var linkData = createIDSLink(leaderName, leaderEmail);
    Logger.log('Link created: ' + linkData.login);
    
    // Step 5: Create/update Interview Link sheet
    var assessmentLink = phase1Sheet.getRange(INTERVIEW_LINK_CONFIG.ASSESSMENT_LINK_CELL).getValue();
    createInterviewLinkSheet(ss, linkData.login, assessmentLink);
    
    // Step 6: Success message
    ui.alert(
      'Success!',
      'Interview link created successfully!\n\n' +
      'Link Name: ' + leaderName + ' - Interview Assessment\n' +
      'Response Link: ' + linkData.login + '\n\n' +
      'The "Interview Link" sheet has been created with all details.',
      ui.ButtonSet.OK
    );
    
  } catch (e) {
    Logger.log('Error: ' + e.message);
    ui.alert('Error', e.message, ui.ButtonSet.OK);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Look up leader email from Event Tracking sheet
 */
function getLeaderEmailFromTracking(leaderName) {
  var trackingSheet = SpreadsheetApp.openById(INTERVIEW_LINK_CONFIG.EVENT_TRACKING_SHEET_ID);
  var sheet = trackingSheet.getSheetByName(INTERVIEW_LINK_CONFIG.EVENT_TRACKING_SHEET_NAME);
  
  if (!sheet) {
    throw new Error('Could not find Event Tracking sheet.');
  }
  
  var data = sheet.getDataRange().getValues();
  var nameCol = INTERVIEW_LINK_CONFIG.COLUMNS.LEADER_NAME - 1; // 0-indexed
  var emailCol = INTERVIEW_LINK_CONFIG.COLUMNS.LEADER_EMAIL - 1;
  
  // Search for matching leader name (skip header row)
  for (var i = 1; i < data.length; i++) {
    var rowName = data[i][nameCol];
    if (rowName && rowName.toString().toLowerCase().trim() === leaderName.toLowerCase().trim()) {
      var email = data[i][emailCol];
      if (email) {
        return email.toString().trim();
      }
    }
  }
  
  // If not found, prompt user to enter email
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Email Not Found',
    'Could not find email for "' + leaderName + '" in Event Tracking.\n\n' +
    'Please enter the leader\'s email address:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() == ui.Button.OK && response.getResponseText()) {
    return response.getResponseText().trim();
  }
  
  throw new Error('Leader email is required to create the interview link.');
}

/**
 * Create IDS Link via API
 */
function createIDSLink(leaderName, leaderEmail) {
  var apiKey = getIDSApiKey();
  
  // Build link name
  var linkName = leaderName + ' - Interview Assessment';
  
  // Get today's date in ISO format
  var today = new Date();
  var startDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd'T'00:00:00XXX");
  
  // Build payload based on working Postman template
  var payload = {
    'name': linkName,
    'description': 'Interview - Leading From Your Strengths®',
    'contact_email': INTERVIEW_LINK_CONFIG.CONTACT_EMAIL,
    'start_date': startDate,
    'end_date': null,
    'unlimited_end': true,
    'email_to': true,
    'cc': true,
    'cc_to': leaderEmail,
    'tag_id': INTERVIEW_LINK_CONFIG.TAG_ID,
    'dflt_language': 'en_US',
    'dflt_color': 'COLOR',
    'dflt_paper': 'LETTER',
    'locked': false,
    'link_admin': false,
    'reportviews': [INTERVIEW_LINK_CONFIG.REPORTVIEW_ID],
    'can_view_proxy': true,
    'status_email_proxy': true,
    'notification': {
      'frequency': 'N',
      'limit': 'N',
      'option_value': 0
    },
    'activity': {
      'frequency': 'N',
      'limit': 'N',
      'option_value': 0
    }
  };
  
  var options = {
    'method': 'post',
    'headers': {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  var url = INTERVIEW_LINK_CONFIG.IDS_API_BASE_URL + '/links?account_login=' + INTERVIEW_LINK_CONFIG.IDS_ACCOUNT_LOGIN;
  
  Logger.log('Creating link: ' + linkName);
  Logger.log('API URL: ' + url);
  Logger.log('Payload: ' + JSON.stringify(payload));
  
  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();
  
  Logger.log('Response Code: ' + responseCode);
  Logger.log('Response: ' + responseText);
  
  if (responseCode === 201 || responseCode === 200) {
    var result = JSON.parse(responseText);
    return {
      login: result.login,
      name: result.name,
      created_at: result.created_at
    };
  } else if (responseCode === 302) {
    // Follow redirect if needed
    var result = JSON.parse(responseText);
    return {
      login: result.login,
      name: result.name,
      created_at: result.created_at
    };
  } else {
    throw new Error(
      'Failed to create IDS link.\n\n' +
      'Response Code: ' + responseCode + '\n' +
      'Response: ' + responseText
    );
  }
}

/**
 * Create or update the Interview Link sheet
 */
function createInterviewLinkSheet(ss, responseLink, assessmentLink) {
  var sheetName = INTERVIEW_LINK_CONFIG.INTERVIEW_SHEET_NAME;
  var sheet = ss.getSheetByName(sheetName);
  
  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log('Created new sheet: ' + sheetName);
    
    // Set up headers
    sheet.getRange('A1').setValue('Date Setup');
    sheet.getRange('B1').setValue('Response Link');
    sheet.getRange('C1').setValue('Assessment Link');
    
    // Format headers
    var headerRange = sheet.getRange('A1:C1');
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a86e8');
    headerRange.setFontColor('#ffffff');
    
    // Set column widths
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(2, 150);
    sheet.setColumnWidth(3, 300);
  }
  
  // Get today's date formatted
  var today = new Date();
  var dateFormatted = Utilities.formatDate(today, Session.getScriptTimeZone(), 'MM/dd/yyyy');
  
  // Find next empty row (or row 2 if empty)
  var lastRow = sheet.getLastRow();
  var dataRow = lastRow < 1 ? 2 : lastRow + 1;
  
  // If this is first data entry, use row 2
  if (lastRow === 1) {
    dataRow = 2;
  }
  
  // Write data
  sheet.getRange(dataRow, 1).setValue(dateFormatted);
  sheet.getRange(dataRow, 2).setValue(responseLink);
  
  // For assessment link, create a formula that references Phase 1 B4
  // Or just copy the value if provided
  if (assessmentLink) {
    sheet.getRange(dataRow, 3).setValue(assessmentLink);
  } else {
    // Create formula to pull from Phase 1 Settings B4
    sheet.getRange(dataRow, 3).setFormula("='" + INTERVIEW_LINK_CONFIG.PHASE1_SHEET_NAME + "'!" + INTERVIEW_LINK_CONFIG.ASSESSMENT_LINK_CELL);
  }
  
  Logger.log('Interview Link sheet updated - Row ' + dataRow);
  
  // Activate the sheet so user can see it
  sheet.activate();
}

// ============================================================================
// MENU INTEGRATION
// ============================================================================

/**
 * Add Interview Link options to the Strong Teams menu
 * Call this from your existing onOpen or menu creation function
 */
function addInterviewLinkMenu(menu) {
  menu.addSeparator()
      .addItem('Create Interview Link', 'createInterviewLink')
      .addItem('Setup IDS API Key', 'setupIDSApiKey')
      .addItem('Test IDS API Connection', 'testIDSApiKey');
  
  return menu;
}

/**
 * Alternative: Create standalone menu (if not integrating with existing menu)
 */
function createInterviewLinkMenu() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Interview Links')
    .addItem('Create Interview Link', 'createInterviewLink')
    .addSeparator()
    .addItem('Setup IDS API Key', 'setupIDSApiKey')
    .addItem('Test IDS API Connection', 'testIDSApiKey')
    .addToUi();
}

// ============================================================================
// INTEGRATION HELPER
// ============================================================================

/**
 * Example of how to integrate with existing Strong Teams menu
 * Add this to your existing onOpen function:
 * 
 * function onOpen() {
 *   var ui = SpreadsheetApp.getUi();
 *   var menu = ui.createMenu('Strong Teams')
 *     .addItem('Build Phase Documents', 'buildPhaseDocuments')
 *     // ... your existing menu items ...
 *     .addSeparator()
 *     .addItem('Create Interview Link', 'createInterviewLink')
 *     .addItem('Setup IDS API Key', 'setupIDSApiKey');
 *   menu.addToUi();
 * }
 */
function setApiKeyDirect() {
  PropertiesService.getScriptProperties().setProperty('IDS_API_KEY', '01KBQM7E1B420HD75KVMPQ88CXd9cc94b972');
  Logger.log('API key set successfully');
}