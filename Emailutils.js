/**
 * Email Utilities - Send notification emails
 */

const EmailUtils = {
  
  /**
   * Send success notification
   */
  sendSuccessEmail: function(eventData, buildFile) {
    if (!CONFIG.EMAIL.notifyOnSuccess) {
      return; // Success emails disabled
    }
    
    const subject = `✓ Phase 1 Setup Complete - ${eventData.fullName}`;
    
    const body = `
Strong Teams Phase 1 automation completed successfully.

LEADER INFORMATION:
- Name: ${eventData.fullName}
- Email: ${eventData.email}
- Company: ${eventData.companyName}

PHASE 1 SESSION:
- Date: ${eventData.formattedDate}
- Time: ${eventData.formattedTime}
- Zoom Link: ${eventData.zoomLink}

BUILD FILE:
- File Name: ${buildFile.getName()}
- File URL: ${buildFile.getUrl()}

All data has been populated in Phase 1 Settings sheet.

---
Strong Teams Automation
`;
    
    MailApp.sendEmail({
      to: CONFIG.EMAIL.adminEmail,
      subject: subject,
      body: body
    });
    
    Logger.log(`✓ Success email sent to ${CONFIG.EMAIL.adminEmail}`);
  },
  
  /**
   * Send error notification
   */
  sendErrorEmail: function(event, eventData, error) {
    if (!CONFIG.EMAIL.notifyOnError) {
      return; // Error emails disabled
    }
    
    const subject = `✗ Phase 1 Automation Error - ${eventData ? eventData.fullName : 'Unknown'}`;
    
    const body = `
Strong Teams Phase 1 automation encountered an error.

ERROR DETAILS:
${error.message}

STACK TRACE:
${error.stack || 'No stack trace available'}

EVENT INFORMATION:
- Title: ${event.getTitle()}
- Start: ${event.getStartTime()}
- Event ID: ${event.getId()}

${eventData ? `
EXTRACTED DATA:
- Leader: ${eventData.fullName || 'N/A'}
- Email: ${eventData.email || 'N/A'}
- Company: ${eventData.companyName || 'N/A'}
` : 'No data was extracted'}

Please check the logs and fix the issue.

---
Strong Teams Automation
`;
    
    MailApp.sendEmail({
      to: CONFIG.EMAIL.adminEmail,
      subject: subject,
      body: body
    });
    
    Logger.log(`✗ Error email sent to ${CONFIG.EMAIL.adminEmail}`);
  }
};