/**
 * MenuBuilder.gs
 * Master Library: Calendar Automate Phase 1
 * 
 * Centralizes all menu building for Strong Teams Build Files.
 * This function is called from each Build File's thin wrapper.
 * 
 * @version 1.0
 * @lastUpdated 2024-12-31
 */

/**
 * Builds the Strengths Tools menu in the spreadsheet UI.
 * Called from each Build File's onOpen() function.
 */
function buildMenu() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🎯 Strengths Tools')
    .addSubMenu(ui.createMenu('📊 Create Graphics')
      .addItem('Extract Data from IDS Export', 'extractIDSExportData')
      .addItem('Generate Strengths Charts', 'generateStrengthsCharts')
      .addItem('Generate Strengths Wheel SVG', 'buildStrengthsWheelURL'))
    .addSeparator()
    .addSubMenu(ui.createMenu('📧 Generate Phase Documents')
      .addItem('Phase 1: Assignment Email', 'generatePhase1AssignmentEmail')
      .addItem('Phase 1: Follow-up Email', 'generatePhase1FollowUpEmail')
      .addItem('Phase 2: Assignment Email', 'generatePhase2AssignmentEmail')
      .addItem('Phase 3: Follow-up Email', 'generatePhase3FollowUpEmail')
      .addItem('Phase 3: Team Assignment Email', 'generatePhase3TeamAssignmentEmail'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🔗 Assessment Tools')
      .addItem('Create Interview Link', 'createInterviewLink'))
    .addToUi();
}

/**
 * Shows information about the Strong Teams system.
 */
function showAbout() {
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Strong Teams Build System',
    'Version: 1.0\n\n' +
    'A comprehensive system for building strong teams through:\n' +
    '• Leading From Your Strengths assessments\n' +
    '• Automated folder and document creation\n' +
    '• Team graphics generation\n' +
    '• Phase email document creation\n\n' +
    'Powered by Insights International & Basler Academy',
    ui.ButtonSet.OK
  );
}
