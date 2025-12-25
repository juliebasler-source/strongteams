/**
 * Logger Utilities - Structured logging
 */

const LoggerUtils = {
  
  /**
   * Log successful processing
   */
  logSuccess: function(eventData, folders, buildFile) {
    const message = `
╔════════════════════════════════════════════════════════════
║ ✓ SUCCESS - Phase 1 Setup Complete
╠════════════════════════════════════════════════════════════
║ Leader: ${eventData.fullName}
║ Email: ${eventData.email}
║ Company: ${eventData.companyName}
║ 
║ Session Date: ${eventData.formattedDate}
║ Session Time: ${eventData.formattedTime}
║ 
║ Folder: ${folders.leaderFolder.getName()}
║ Build File: ${buildFile.getName()}
║ Build File URL: ${buildFile.getUrl()}
╚════════════════════════════════════════════════════════════
`;
    Logger.log(message);
  },
  
  /**
   * Log error
   */
  logError: function(event, eventData, error) {
    const message = `
╔════════════════════════════════════════════════════════════
║ ✗ ERROR - Phase 1 Setup Failed
╠════════════════════════════════════════════════════════════
║ Event: ${event.getTitle()}
║ Event ID: ${event.getId()}
║ 
${eventData ? `║ Leader: ${eventData.fullName || 'Unknown'}
║ Email: ${eventData.email || 'Unknown'}
` : '║ No data extracted\n'}║ 
║ Error: ${error.message}
║ 
║ Stack Trace:
║ ${error.stack ? error.stack.replace(/\n/g, '\n║ ') : 'No stack trace'}
╚════════════════════════════════════════════════════════════
`;
    Logger.log(message);
  },
  
  /**
   * Log skipped event
   */
  logSkipped: function(event, reason) {
    Logger.log(`⊘ Skipped: ${event.getTitle()} - ${reason}`);
  },
  
  /**
   * Log start of processing
   */
  logStart: function() {
    Logger.log('\n\n' + '='.repeat(70));
    Logger.log('STRONG TEAMS PHASE 1 AUTOMATION - STARTED');
    Logger.log('Timestamp: ' + new Date().toLocaleString());
    Logger.log('='.repeat(70) + '\n');
  },
  
  /**
   * Log end of processing
   */
  logEnd: function(successCount, errorCount, skippedCount) {
    Logger.log('\n' + '='.repeat(70));
    Logger.log('STRONG TEAMS PHASE 1 AUTOMATION - COMPLETED');
    Logger.log(`Summary: ${successCount} successful, ${errorCount} errors, ${skippedCount} skipped`);
    Logger.log('='.repeat(70) + '\n\n');
  }
};