/**
 * Strong Teams Automation - IDS API Integration
 * 
 * @version 1.1.2
 * @phase Phase 1 Enhanced
 * @description Generate assessment response links via IDS (JustRespond) API
 * @lastUpdated 2024-12-23
 * 
 * Responsibilities:
 * - Generate unique response links for leaders
 * - Handle API authentication
 * - Parse response URLs
 * - Error handling and logging
 * 
 * API Documentation:
 * - Endpoint: https://api.justrespond.com/api/v3/links
 * - Method: POST
 * - Auth: API Key in Authorization header
 * - Response: 201 Created with link details
 * - Response URL Domain: https://assessment.basleracademy.com/
 * 
 * CHANGELOG v1.1.2:
 * - Updated domain to https://assessment.basleracademy.com/
 */

const IDSUtils = {
  
  /**
   * Generate a new IDS response link for a leader
   * @param {Object} eventData - Leader data from calendar event
   * @returns {Object} Object with loginCode and responseLink
   */
  generateResponseLink: function(eventData) {
    try {
      Logger.log('  → Generating IDS response link...');
      
      // Build API request
      const payload = this.buildRequestPayload(eventData);
      const options = this.buildRequestOptions(payload);
      
      // Make API call
      const response = UrlFetchApp.fetch(
        CONFIG.IDS_API.endpoint,
        options
      );
      
      // Check response code
      const responseCode = response.getResponseCode();
      Logger.log(`  → API Response Code: ${responseCode}`);
      
      if (responseCode !== 201) {
        throw new Error(`Unexpected response code: ${responseCode}`);
      }
      
      // Parse response
      const result = JSON.parse(response.getContentText());
      
      // Extract the login code from response
      // JustRespond API returns a "login" field with the unique code
      const loginCode = result.login;
      
      if (!loginCode) {
        Logger.log('  ⚠ Warning: No login code in API response');
        Logger.log(`  Raw response: ${response.getContentText()}`);
        throw new Error('No login code returned from IDS API');
      }
      
      // Build the full response URL
      // Format: https://assessment.basleracademy.com/{login_code}
      const responseLink = `https://assessment.basleracademy.com/${loginCode}`;
      
      Logger.log(`  ✓ Response link generated successfully`);
      Logger.log(`    Login Code: ${loginCode}`);
      Logger.log(`    URL: ${responseLink}`);
      
      // Return both the login code and full URL
      return {
        loginCode: loginCode,
        responseLink: responseLink
      };
      
    } catch (error) {
      Logger.log(`  ✗ ERROR generating response link: ${error.message}`);
      
      // Log additional details for debugging
      if (error.message.includes('response code')) {
        Logger.log(`  → This might be an API configuration issue`);
      }
      
      throw new Error(`Failed to generate IDS response link: ${error.message}`);
    }
  },
  
  /**
   * Build API request payload
   * @param {Object} eventData - Leader data
   * @returns {Object} Formatted payload for IDS API
   */
  buildRequestPayload: function(eventData) {
    // Get current ISO timestamp for start_date
    const now = new Date();
    const isoTimestamp = now.toISOString();
    
    return {
      // Name format: "[Leader Name] - Leading From Your Strengths"
      name: `${eventData.fullName} - Leading From Your Strengths`,
      
      // Fixed values from your template
      description: "Leading From Your Strengths®",
      contact_email: CONFIG.IDS_API.contactEmail,
      
      // Date settings
      start_date: isoTimestamp,
      end_date: null,
      unlimited_end: true,
      
      // Email settings
      email_to: true,
      cc: true,
      cc_to: eventData.email,  // CC the leader
      
      // Assessment configuration
      tag_id: CONFIG.IDS_API.tagId,
      dflt_language: "en_US",
      dflt_color: "COLOR",
      dflt_paper: "LETTER",
      
      // Link settings
      locked: false,
      link_admin: false,
      reportviews: [CONFIG.IDS_API.reportView],
      can_view_proxy: true,
      status_email_proxy: true,
      
      // Notification settings
      notification: {
        frequency: "N",
        limit: "H",
        option_value: "6"
      },
      
      // Activity settings
      activity: {
        frequency: "N",
        limit: "N",
        option_value: 0
      }
    };
  },
  
  /**
   * Build API request options with authentication
   * @param {Object} payload - Request body
   * @returns {Object} Options for UrlFetchApp
   */
  buildRequestOptions: function(payload) {
    return {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': CONFIG.IDS_API.apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: false  // Throw errors for non-200 responses
    };
  },
  
  /**
   * Test API connection and authentication
   * @returns {Boolean} True if connection successful
   */
  testConnection: function() {
    try {
      Logger.log('Testing IDS API connection...');
      
      // Create minimal test payload
      const testPayload = {
        name: "API Connection Test - Delete Me",
        description: "Testing API connection",
        contact_email: CONFIG.IDS_API.contactEmail,
        start_date: new Date().toISOString(),
        end_date: null,
        unlimited_end: true,
        email_to: false,  // Don't send email for test
        cc: false,
        tag_id: CONFIG.IDS_API.tagId,
        dflt_language: "en_US",
        dflt_color: "COLOR",
        dflt_paper: "LETTER",
        locked: false,
        link_admin: false,
        reportviews: [CONFIG.IDS_API.reportView],
        can_view_proxy: true,
        status_email_proxy: false,
        notification: {
          frequency: "N",
          limit: "H",
          option_value: "6"
        },
        activity: {
          frequency: "N",
          limit: "N",
          option_value: 0
        }
      };
      
      const options = this.buildRequestOptions(testPayload);
      const response = UrlFetchApp.fetch(CONFIG.IDS_API.endpoint, options);
      
      const responseCode = response.getResponseCode();
      
      if (responseCode === 201) {
        Logger.log('✓ IDS API connection successful (201 Created)');
        
        // Parse and show the test link
        const result = JSON.parse(response.getContentText());
        const loginCode = result.login;
        
        if (loginCode) {
          const testLink = `https://assessment.basleracademy.com/${loginCode}`;
          Logger.log('  Test link created (you should delete this in IDS):');
          Logger.log(`  ${testLink}`);
        } else {
          Logger.log('  Warning: No login code in response');
        }
        
        return true;
      } else {
        Logger.log(`✗ Unexpected response code: ${responseCode}`);
        return false;
      }
      
    } catch (error) {
      Logger.log(`✗ IDS API connection failed: ${error.message}`);
      
      // Provide helpful debugging info
      if (error.message.includes('401')) {
        Logger.log('  → Check API key in Config.gs');
      } else if (error.message.includes('404')) {
        Logger.log('  → Check endpoint URL and account_login');
      } else if (error.message.includes('400')) {
        Logger.log('  → Check required fields in payload');
      }
      
      return false;
    }
  },
  
  /**
   * Parse response to extract link URL
   * Handles extracting login code and building full URL
   * @param {String} responseText - Raw API response
   * @returns {String} Response link URL
   */
  parseResponseLink: function(responseText) {
    try {
      const result = JSON.parse(responseText);
      
      // Extract login code from response
      const loginCode = result.login;
      
      if (loginCode) {
        // Build full URL with login code
        return `https://assessment.basleracademy.com/${loginCode}`;
      }
      
      // If we get here, no login code found
      Logger.log('⚠ Could not find login code in response. Full response:');
      Logger.log(responseText);
      
      throw new Error('No login code found in API response');
      
    } catch (error) {
      throw new Error(`Failed to parse response: ${error.message}`);
    }
  }
};

// ========================================
// TEST FUNCTIONS
// ========================================

/**
 * Test IDS API connection
 * Run this first to verify API key and configuration
 */
function testIDSConnection() {
  Logger.log('='.repeat(70));
  Logger.log('TESTING IDS API CONNECTION');
  Logger.log('='.repeat(70));
  
  // Check configuration first
  Logger.log('\nChecking configuration...');
  Logger.log(`  Endpoint: ${CONFIG.IDS_API.endpoint}`);
  Logger.log(`  API Key: ${CONFIG.IDS_API.apiKey.substring(0, 10)}...`);
  Logger.log(`  Tag ID: ${CONFIG.IDS_API.tagId}`);
  Logger.log(`  Report View: ${CONFIG.IDS_API.reportView}`);
  Logger.log(`  Contact Email: ${CONFIG.IDS_API.contactEmail}`);
  
  // Test connection
  Logger.log('\nTesting API connection...');
  const success = IDSUtils.testConnection();
  
  Logger.log('\n' + '='.repeat(70));
  if (success) {
    Logger.log('✓ IDS API IS READY');
    Logger.log('Next step: Run testResponseLinkGeneration()');
  } else {
    Logger.log('✗ FIX CONFIGURATION BEFORE PROCEEDING');
    Logger.log('Check the error messages above');
  }
  Logger.log('='.repeat(70));
}

/**
 * Test response link generation with sample data
 * Run this after testIDSConnection() succeeds
 */
function testResponseLinkGeneration() {
  Logger.log('='.repeat(70));
  Logger.log('TESTING RESPONSE LINK GENERATION');
  Logger.log('='.repeat(70));
  
  const sampleData = {
    firstName: 'Test',
    lastName: 'Leader',
    fullName: 'Test Leader',
    email: 'test.leader@example.com',
    companyName: 'Test Company',
    formattedDate: getFormattedDate(new Date()),
    eventId: 'test_event_' + Date.now()
  };
  
  Logger.log('\nSample leader data:');
  Logger.log(`  Name: ${sampleData.fullName}`);
  Logger.log(`  Email: ${sampleData.email}`);
  Logger.log(`  Company: ${sampleData.companyName}`);
  
  try {
    Logger.log('\nGenerating response link...');
    const result = IDSUtils.generateResponseLink(sampleData);
    
    Logger.log('\n' + '='.repeat(70));
    Logger.log('✓ SUCCESS - Response Link Generated:');
    Logger.log('='.repeat(70));
    Logger.log(`Login Code: ${result.loginCode}`);
    Logger.log(`Full URL: ${result.responseLink}`);
    Logger.log('\n⚠️  NOTE: This is a real link! You may want to delete it in IDS.');
    Logger.log('='.repeat(70));
    
  } catch (error) {
    Logger.log('\n' + '='.repeat(70));
    Logger.log('✗ ERROR:');
    Logger.log('='.repeat(70));
    Logger.log(error.message);
    Logger.log('\nCheck the error details above and verify your configuration.');
    Logger.log('='.repeat(70));
  }
}

/**
 * Test with actual Phase 1 event data
 * Run this to test with real calendar event
 */
function testIDSWithRealEvent() {
  Logger.log('='.repeat(70));
  Logger.log('TESTING IDS WITH REAL CALENDAR EVENT');
  Logger.log('='.repeat(70));
  
  // Get calendar events
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const oneWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
  const events = calendar.getEvents(now, oneWeek);
  
  Logger.log(`\nFound ${events.length} events in next 7 days`);
  
  // Find first Phase 1 event
  for (let event of events) {
    if (CalendarUtils.isPhase1Event(event)) {
      Logger.log(`\n📅 Using event: ${event.getTitle()}`);
      
      try {
        // Extract event data
        Logger.log('\nExtracting event data...');
        const eventData = CalendarUtils.extractEventData(event);
        
        Logger.log(`  Leader: ${eventData.fullName}`);
        Logger.log(`  Email: ${eventData.email}`);
        Logger.log(`  Company: ${eventData.companyName}`);
        
        // Generate link
        Logger.log('\nGenerating response link...');
        const result = IDSUtils.generateResponseLink(eventData);
        
        Logger.log('\n' + '='.repeat(70));
        Logger.log('✓ SUCCESS - Response Link Generated:');
        Logger.log('='.repeat(70));
        Logger.log(`Login Code: ${result.loginCode}`);
        Logger.log(`Full URL: ${result.responseLink}`);
        Logger.log('='.repeat(70));
        
        return; // Stop after first event
        
      } catch (error) {
        Logger.log(`\n✗ Error: ${error.message}`);
        return;
      }
    }
  }
  
  Logger.log('\n✗ No Phase 1 events found in next 7 days');
  Logger.log('Create a test Phase 1 event first');
}