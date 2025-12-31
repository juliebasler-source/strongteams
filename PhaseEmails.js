/**
 * PhaseEmails.gs
 * Generates all Phase email documents (Phase 1, 2, and 3)
 */

function generatePhase1AssignmentEmail() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var phase1Sheet = ss.getSheetByName('Phase 1 Settings');
  var phase2Sheet = ss.getSheetByName('Phase 2 Settings');
  
  if (!phase1Sheet) {
    ui.alert('Error', 'Please create a "Phase 1 Settings" sheet first.', ui.ButtonSet.OK);
    return;
  }
  
  if (!phase2Sheet) {
    ui.alert('Error', 'Please create a "Phase 2 Settings" sheet first.', ui.ButtonSet.OK);
    return;
  }
  
  var phase1Date = phase1Sheet.getRange('B2').getValue();
  if (phase1Date instanceof Date) {
    phase1Date = Utilities.formatDate(phase1Date, Session.getScriptTimeZone(), "EEEE, MMMM d");
  } else {
    phase1Date = phase1Date ? phase1Date.toString() : "";
  }
  
  var phase1Time = phase1Sheet.getRange('B3').getValue();
  phase1Time = phase1Time ? phase1Time.toString() : "";
  
  var assessmentLink = phase1Sheet.getRange('B4').getValue();
  assessmentLink = assessmentLink ? assessmentLink.toString() : "";
  
  var phase1DeadlineDate = phase1Sheet.getRange('B5').getValue();
  if (phase1DeadlineDate instanceof Date) {
    phase1DeadlineDate = Utilities.formatDate(phase1DeadlineDate, Session.getScriptTimeZone(), "MMMM d, yyyy");
  } else {
    phase1DeadlineDate = phase1DeadlineDate ? phase1DeadlineDate.toString() : "";
  }
  
  var coachNames = phase1Sheet.getRange('B6').getValue();
  coachNames = coachNames ? coachNames.toString() : "";
  
  var leaderName = phase1Sheet.getRange('B7').getValue();
  leaderName = leaderName ? leaderName.toString() : "";
  
  var responseLink = phase1Sheet.getRange('B8').getValue();
  responseLink = responseLink ? responseLink.toString() : "";
  
  var sessionDate = phase2Sheet.getRange('B2').getValue();
  if (sessionDate instanceof Date) {
    sessionDate = Utilities.formatDate(sessionDate, Session.getScriptTimeZone(), "MMMM d, yyyy");
  } else {
    sessionDate = sessionDate ? sessionDate.toString() : "";
  }
  
  var sessionTime = phase2Sheet.getRange('B3').getValue();
  sessionTime = sessionTime ? sessionTime.toString() : "";
  
  if (!phase1Date) {
    var response = ui.prompt('Phase 1 Date Missing', 
                            'Enter the one-on-one session date (e.g., Wednesday, December 3):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    phase1Date = response.getResponseText();
    phase1Sheet.getRange('B2').setValue(phase1Date);
  }
  
  if (!phase1Time) {
    var response = ui.prompt('Phase 1 Time Missing', 
                            'Enter the one-on-one session time (e.g., 1:30 - 2:30pm Eastern):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    phase1Time = response.getResponseText();
    phase1Sheet.getRange('B3').setValue(phase1Time);
  }
  
  if (!sessionDate) {
    var response = ui.prompt('Team Session Date Missing', 
                            'Enter the team meeting date (e.g., January 15, 2026):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    sessionDate = response.getResponseText();
    phase2Sheet.getRange('B2').setValue(sessionDate);
  }
  
  if (!sessionTime) {
    var response = ui.prompt('Team Session Time Missing', 
                            'Enter the team meeting time (e.g., 2:00 PM):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    sessionTime = response.getResponseText();
    phase2Sheet.getRange('B3').setValue(sessionTime);
  }
  
  if (!assessmentLink) {
    var response = ui.prompt('Assessment Link Missing', 
                            'Paste the survey assessment link:', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    assessmentLink = response.getResponseText();
    phase1Sheet.getRange('B4').setValue(assessmentLink);
  }
  
  if (!leaderName) {
    var response = ui.prompt('Leader Name Missing', 
                            'Enter the leader\'s name:', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    leaderName = response.getResponseText();
    phase1Sheet.getRange('B7').setValue(leaderName);
  }
  
  if (!responseLink) {
    var response = ui.prompt('Response Link (Optional)', 
                            'Enter a link for questions/confirmations (or leave blank):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() == ui.Button.OK && response.getResponseText()) {
      responseLink = response.getResponseText();
      phase1Sheet.getRange('B8').setValue(responseLink);
    }
  }
  
  if (!coachNames) {
    coachNames = 'Steve Basler';
  }
  
  var docName = leaderName + ' - Phase 1 Leader Assessment Assignment Email';
  var doc = DocumentApp.create(docName);
  var body = doc.getBody();
  
  body.setMarginTop(72);
  body.setMarginBottom(72);
  body.setMarginLeft(72);
  body.setMarginRight(72);
  
  var subject = body.appendParagraph('Subject: Assignment and Next Steps');
  subject.setSpacingAfter(12);
  
  var greeting = body.appendParagraph(leaderName + ',');
  greeting.setSpacingAfter(12);
  
  var opening = body.appendParagraph('We are so excited that you have made the decision to move forward with this process!');
  opening.setSpacingAfter(12);
  
  var datesHeader = body.appendParagraph('Important Dates:');
  datesHeader.setSpacingAfter(6);
  
  var phase1Bullet = body.appendListItem('Your One-on-One Session: ' + phase1Date + ' | ' + phase1Time + ' | 60 Minutes');
  phase1Bullet.setGlyphType(DocumentApp.GlyphType.BULLET);
  phase1Bullet.setIndentStart(36);
  phase1Bullet.setIndentFirstLine(18);
  
  var phase2Bullet = body.appendListItem('Team Meeting: ' + sessionDate + ' | ' + sessionTime + ' | 90 Minutes');
  phase2Bullet.setGlyphType(DocumentApp.GlyphType.BULLET);
  phase2Bullet.setIndentStart(36);
  phase2Bullet.setIndentFirstLine(18);
  phase2Bullet.setSpacingAfter(12);
  
  var calPara = body.appendParagraph('I know you have already put some blocks on your calendars for the times above. I will also send a zoom invite from Basler Academy for each session soon.');
  calPara.setSpacingAfter(12);
  
  var assignHeader = body.appendParagraph('Your Assignment:');
  assignHeader.setSpacingAfter(6);
  
  var assignPara = body.appendParagraph('In preparation for our first meeting, you will need to complete the Leading From Your Strengths Assessment. This is not a test—it cannot be failed, and there are no right or wrong answers. When completing the assessment, think about who you are as a leader and be decisive with your responses: "I am most like this" and "I am least like this." The assessment should take you 10-12 minutes to complete.');
  assignPara.setSpacingAfter(12);
  
  var assessLinkText = 'Assessment Link: ' + assessmentLink;
  var assessLinkPara = body.appendParagraph(assessLinkText);
  assessLinkPara.setSpacingAfter(6);
  if (assessmentLink && assessmentLink.indexOf('http') === 0) {
    assessLinkPara.editAsText().setLinkUrl(17, assessLinkText.length - 1, assessmentLink);
  }
  
  if (responseLink) {
    var responseLinkText = 'Response Link: ' + responseLink;
    var responseLinkPara = body.appendParagraph(responseLinkText);
    responseLinkPara.setSpacingAfter(12);
    if (responseLink.indexOf('http') === 0) {
      responseLinkPara.editAsText().setLinkUrl(15, responseLinkText.length - 1, responseLink);
    }
  }
  
  var postAssess = body.appendParagraph('Once you have completed the assessment, you will be able to download your results on-screen, and you will also receive a copy via email for safekeeping.');
  postAssess.setSpacingAfter(12);
  
  var reviewPara = body.appendParagraph('Please review your results before our meeting and make a list of any questions you have or insights you\'d like to discuss. Our meeting will be somewhat scripted, but there will be plenty of room for your questions to be addressed. Rodney Cox, Julie Basler, and I will be on the call.');
  reviewPara.setSpacingAfter(12);
  
  var nextHeader = body.appendParagraph('What\'s Next:');
  nextHeader.setSpacingAfter(6);
  
  var nextPara = body.appendParagraph('Once we have completed our one-on-one session with you, we will send you the assignment for your team. You\'ll have the flexibility to modify it and add your own touches, but we will provide all the details you need.');
  nextPara.setSpacingAfter(12);
  
  var thankYou = body.appendParagraph('Thank you for being an early adopter—we look forward to spending time with you and obtaining your candid feedback.');
  thankYou.setSpacingAfter(12);
  
  var closing = body.appendParagraph('Have a great Thanksgiving!');
  closing.setSpacingAfter(12);
  
  var sig1 = body.appendParagraph(coachNames);
  sig1.setSpacingAfter(0);
  var sig2 = body.appendParagraph('Basler Academy');
  sig2.setSpacingAfter(0);
  
  doc.saveAndClose();
  
  var docFile = DriveApp.getFileById(doc.getId());
  var spreadsheetFile = DriveApp.getFileById(ss.getId());
  var folders = spreadsheetFile.getParents();
  
  if (folders.hasNext()) {
    var folder = folders.next();
    folder.addFile(docFile);
    DriveApp.getRootFolder().removeFile(docFile);
  }
  
  var docUrl = doc.getUrl();
  var html = '<script>window.open("' + docUrl + '", "_blank");google.script.host.close();</script>';
  var userInterface = HtmlService.createHtmlOutput(html).setWidth(200).setHeight(100);
  ui.showModalDialog(userInterface, 'Opening Document...');
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Phase 1 Leader Assessment Assignment Email created!', 'Success', 5);
}

/**
 * Generates Phase 1 Follow-up Email document
 * Subject: Your Strengths Movement Exercise & Team Assessment Assignment
 */
function generatePhase1FollowUpEmail() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var phase1Sheet = ss.getSheetByName('Phase 1 Settings');
  var phase2Sheet = ss.getSheetByName('Phase 2 Settings');
  
  if (!phase1Sheet) {
    ui.alert('Error', 'Please create a "Phase 1 Settings" sheet first.', ui.ButtonSet.OK);
    return;
  }
  
  if (!phase2Sheet) {
    ui.alert('Error', 'Please create a "Phase 2 Settings" sheet first.', ui.ButtonSet.OK);
    return;
  }
  
  var coachNames = phase1Sheet.getRange('B6').getValue();
  coachNames = coachNames ? coachNames.toString() : "";
  
  var leaderName = phase1Sheet.getRange('B7').getValue();
  leaderName = leaderName ? leaderName.toString() : "";
  
  var sessionDate = phase2Sheet.getRange('B2').getValue();
  if (sessionDate instanceof Date) {
    sessionDate = Utilities.formatDate(sessionDate, Session.getScriptTimeZone(), "MMMM d, yyyy");
  } else {
    sessionDate = sessionDate ? sessionDate.toString() : "";
  }
  
  var sessionTime = phase2Sheet.getRange('B3').getValue();
  sessionTime = sessionTime ? sessionTime.toString() : "";
  
  var phase2ZoomLink = phase2Sheet.getRange('B9').getValue();
  phase2ZoomLink = phase2ZoomLink ? phase2ZoomLink.toString() : "";
  
  if (!leaderName) {
    var response = ui.prompt('Leader Name Missing', 
                            'Enter the leader\'s name:', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    leaderName = response.getResponseText();
    phase1Sheet.getRange('B7').setValue(leaderName);
  }
  
  if (!sessionDate) {
    var response = ui.prompt('Team Session Date Missing', 
                            'Enter the team meeting date (e.g., January 15, 2026):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    sessionDate = response.getResponseText();
    phase2Sheet.getRange('B2').setValue(sessionDate);
  }
  
  if (!sessionTime) {
    var response = ui.prompt('Team Session Time Missing', 
                            'Enter the team meeting time (e.g., 2:00 PM):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    sessionTime = response.getResponseText();
    phase2Sheet.getRange('B3').setValue(sessionTime);
  }
  
  if (!phase2ZoomLink) {
    var response = ui.prompt('Phase 2 Zoom Link (Optional)', 
                            'Enter the Zoom link for the team meeting (or leave blank):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() == ui.Button.OK && response.getResponseText()) {
      phase2ZoomLink = response.getResponseText();
      phase2Sheet.getRange('B9').setValue(phase2ZoomLink);
    }
  }
  
  if (!coachNames) {
    coachNames = 'Steve Basler';
  }
  
  var docName = leaderName + ' - Phase 1 Coaching Call Follow-up Email';
  var doc = DocumentApp.create(docName);
  var body = doc.getBody();
  
  body.setMarginTop(72);
  body.setMarginBottom(72);
  body.setMarginLeft(72);
  body.setMarginRight(72);
  
  var subject = body.appendParagraph('Subject: Your Strengths Movement Exercise & Team Assessment Assignment');
  subject.setSpacingAfter(12);
  
  var greeting = body.appendParagraph(leaderName + ',');
  greeting.setSpacingAfter(12);
  
  var opening = body.appendParagraph('Thank you for your time! I hope you found our 60 minutes together profitable and insightful. Your transparency and authenticity as a leader were truly refreshing—those qualities will serve you and your team incredibly well as you move through this process.');
  opening.setSpacingAfter(12);
  
  var assignHeader = body.appendParagraph('Your Assignment: Strengths Movement Exercise');
  assignHeader.setSpacingAfter(6);
  
  var exerciseDesc = body.appendParagraph('Attached you\'ll find the Strengths Movement Exercise. This is the same exercise your team members will complete during Phase 3 in your second one-on-one sessions with them (Strengths Movement and Action Planning).');
  exerciseDesc.setSpacingAfter(12);
  
  var servesHeader = body.appendParagraph('This exercise serves two important purposes:');
  servesHeader.setSpacingAfter(6);
  
  var purpose1 = body.appendListItem('It addresses the movement we discussed on the coaching call - You\'ll work through the four scales (Problem Solving, Processing Information, Managing Change, and Facing Risk) to understand where you\'re adapting and why, then develop an action plan for alignment.');
  purpose1.setGlyphType(DocumentApp.GlyphType.NUMBER);
  purpose1.setIndentStart(36);
  purpose1.setIndentFirstLine(18);
  
  var purpose2 = body.appendListItem('It gives you firsthand experience with what you\'ll be asking your team to complete - When you facilitate this exercise with each team member in Phase 3, you\'ll understand exactly what they\'re working through because you\'ve done it yourself.');
  purpose2.setGlyphType(DocumentApp.GlyphType.NUMBER);
  purpose2.setIndentStart(36);
  purpose2.setIndentFirstLine(18);
  purpose2.setSpacingAfter(12);
  
  var instructions = body.appendParagraph('Please complete this exercise before our team meeting. If you would please scan and send it back to me it would help me with context as we move forward.');
  instructions.setSpacingAfter(12);
  
  var teamHeader = body.appendParagraph('Team Assessment Assignment');
  teamHeader.setSpacingAfter(6);
  
  var actionHeader = body.appendParagraph('Action Items:');
  actionHeader.setSpacingAfter(6);
  
  var action1 = body.appendListItem('First, send a calendar invite to your team for the Team Building Session:');
  action1.setGlyphType(DocumentApp.GlyphType.NUMBER);
  action1.setIndentStart(36);
  action1.setIndentFirstLine(18);
  
  var dateBullet = body.appendListItem('Date: ' + sessionDate);
  dateBullet.setGlyphType(DocumentApp.GlyphType.BULLET);
  dateBullet.setIndentStart(72);
  dateBullet.setIndentFirstLine(54);
  
  var timeBullet = body.appendListItem('Time: ' + sessionTime);
  timeBullet.setGlyphType(DocumentApp.GlyphType.BULLET);
  timeBullet.setIndentStart(72);
  timeBullet.setIndentFirstLine(54);
  
  var durationBullet = body.appendListItem('Duration: 90 Minutes');
  durationBullet.setGlyphType(DocumentApp.GlyphType.BULLET);
  durationBullet.setIndentStart(72);
  durationBullet.setIndentFirstLine(54);
  
  var zoomText = 'Zoom Link: ' + (phase2ZoomLink || '[TO BE PROVIDED]');
  var zoomBullet = body.appendListItem(zoomText);
  zoomBullet.setGlyphType(DocumentApp.GlyphType.BULLET);
  zoomBullet.setIndentStart(72);
  zoomBullet.setIndentFirstLine(54);
  if (phase2ZoomLink && phase2ZoomLink.indexOf('http') === 0) {
    zoomBullet.editAsText().setLinkUrl(11, zoomText.length - 1, phase2ZoomLink);
  }
  
  var action2 = body.appendListItem('Then, send the assessment assignment email (attached as a separate document). You have the flexibility to modify it and add your own touches, but we\'ve provided all the details you need including:');
  action2.setGlyphType(DocumentApp.GlyphType.NUMBER);
  action2.setIndentStart(36);
  action2.setIndentFirstLine(18);
  
  var sub1 = body.appendListItem('Instructions for completing the Leading From Your Strengths Assessment');
  sub1.setGlyphType(DocumentApp.GlyphType.BULLET);
  sub1.setIndentStart(72);
  sub1.setIndentFirstLine(54);
  
  var sub2 = body.appendListItem('What to expect from the assessment process');
  sub2.setGlyphType(DocumentApp.GlyphType.BULLET);
  sub2.setIndentStart(72);
  sub2.setIndentFirstLine(54);
  
  var sub3 = body.appendListItem('How to access and save their results');
  sub3.setGlyphType(DocumentApp.GlyphType.BULLET);
  sub3.setIndentStart(72);
  sub3.setIndentFirstLine(54);
  
  var sub4 = body.appendListItem('Preparation steps before the team meeting');
  sub4.setGlyphType(DocumentApp.GlyphType.BULLET);
  sub4.setIndentStart(72);
  sub4.setIndentFirstLine(54);
  sub4.setSpacingAfter(12);
  
  var personalize = body.appendParagraph('Feel free to personalize the assignment message to fit your leadership style and team culture.');
  personalize.setSpacingAfter(12);
  
  var closing = body.appendParagraph('Looking forward to the journey ahead!');
  closing.setSpacingAfter(12);
  
  var sig1 = body.appendParagraph(coachNames);
  sig1.setSpacingAfter(0);
  var sig2 = body.appendParagraph('Basler Academy');
  sig2.setSpacingAfter(0);
  
  doc.saveAndClose();
  
  var docFile = DriveApp.getFileById(doc.getId());
  var spreadsheetFile = DriveApp.getFileById(ss.getId());
  var folders = spreadsheetFile.getParents();
  
  if (folders.hasNext()) {
    var folder = folders.next();
    folder.addFile(docFile);
    DriveApp.getRootFolder().removeFile(docFile);
  }
  
  var docUrl = doc.getUrl();
  var html = '<script>window.open("' + docUrl + '", "_blank");google.script.host.close();</script>';
  var userInterface = HtmlService.createHtmlOutput(html).setWidth(200).setHeight(100);
  ui.showModalDialog(userInterface, 'Opening Document...');
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Phase 1 Coaching Call Follow-up Email created!', 'Success', 5);
}

/**
 * Generates Phase 2 Assignment Email document from Phase 2 Settings sheet
 * Subject: Team Building Session Prep - Complete Your Leading From Your Strengths Assessment
 */
function generatePhase2AssignmentEmail() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var settingsSheet = ss.getSheetByName('Phase 2 Settings');
  
  if (!settingsSheet) {
    ui.alert('Error', 'Please create a "Phase 2 Settings" sheet first with the required variables.', ui.ButtonSet.OK);
    return;
  }
  
  var sessionDate = settingsSheet.getRange('B2').getValue();
  if (sessionDate instanceof Date) {
    sessionDate = Utilities.formatDate(sessionDate, Session.getScriptTimeZone(), "MMMM d, yyyy");
  } else {
    sessionDate = sessionDate ? sessionDate.toString() : "";
  }
  
  var sessionTime = settingsSheet.getRange('B3').getValue();
  sessionTime = sessionTime ? sessionTime.toString() : "";
  
  var assessmentLink = settingsSheet.getRange('B4').getValue();
  assessmentLink = assessmentLink ? assessmentLink.toString() : "";
  
  var deadlineDate = settingsSheet.getRange('B5').getValue();
  if (deadlineDate instanceof Date) {
    deadlineDate = Utilities.formatDate(deadlineDate, Session.getScriptTimeZone(), "MMMM d, yyyy");
  } else {
    deadlineDate = deadlineDate ? deadlineDate.toString() : "";
  }
  
  var coachNames = settingsSheet.getRange('B6').getValue();
  coachNames = coachNames ? coachNames.toString() : "";
  
  var leaderName = settingsSheet.getRange('B7').getValue();
  leaderName = leaderName ? leaderName.toString() : "";
  
  var responseLink = settingsSheet.getRange('B8').getValue();
  responseLink = responseLink ? responseLink.toString() : "";
  
  if (!sessionDate) {
    var response = ui.prompt('Session Date Missing', 
                            'Enter the team session date (e.g., January 15, 2026):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    sessionDate = response.getResponseText();
    settingsSheet.getRange('B2').setValue(sessionDate);
  }
  
  if (!sessionTime) {
    var response = ui.prompt('Session Time Missing', 
                            'Enter the session time (e.g., 2:00 PM):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    sessionTime = response.getResponseText();
    settingsSheet.getRange('B3').setValue(sessionTime);
  }
  
  if (!assessmentLink) {
    var response = ui.prompt('Assessment Link Missing', 
                            'Paste the survey assessment link:', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    assessmentLink = response.getResponseText();
    settingsSheet.getRange('B4').setValue(assessmentLink);
  }
  
  if (!deadlineDate) {
    var response = ui.prompt('Deadline Date Missing', 
                            'Enter the assessment deadline (e.g., January 10, 2026):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    deadlineDate = response.getResponseText();
    settingsSheet.getRange('B5').setValue(deadlineDate);
  }
  
  if (!leaderName) {
    var response = ui.prompt('Leader Name Missing', 
                            'Enter the leader\'s name (person signing email):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    leaderName = response.getResponseText();
    settingsSheet.getRange('B7').setValue(leaderName);
  }
  
  if (!responseLink) {
    var response = ui.prompt('Response Link (Optional)', 
                            'Enter a link for questions/confirmations (or leave blank):', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() == ui.Button.OK && response.getResponseText()) {
      responseLink = response.getResponseText();
      settingsSheet.getRange('B8').setValue(responseLink);
    }
  }
  
  if (!coachNames) {
    coachNames = 'Rodney Cox from Insights International, along with Steve and Julie Basler';
  }
  
  var docName = leaderName + ' - Phase 2 Email to Team Assessment Assignment';
  var doc = DocumentApp.create(docName);
  var body = doc.getBody();
  
  body.setMarginTop(72);
  body.setMarginBottom(72);
  body.setMarginLeft(72);
  body.setMarginRight(72);
  
  var subject = body.appendParagraph('Subject: Team Building Session Prep - Complete Your Leading From Your Strengths Assessment');
  subject.setHeading(DocumentApp.ParagraphHeading.NORMAL);
  subject.setSpacingAfter(12);
  
  var greeting = body.appendParagraph('Team,');
  greeting.setSpacingAfter(12);
  
  var para1Text = "I'm excited to share that we'll be participating in a 90-minute Team Building Session with Basler Academy on " + 
                  sessionDate + " at " + sessionTime + 
                  ". This session is designed to help us build stronger relationships grounded in empathy, understanding, and trust—so that each of you feels valued and can contribute at your highest level.";
  var para1 = body.appendParagraph(para1Text);
  para1.setSpacingAfter(12);
  
  var para2 = body.appendParagraph("Research shows that organizations with strong cultures see employee engagement up to 72% higher, and teams built on genuine understanding achieve 21% greater performance. As we head into 2026, I want us to be one of those teams—not just working together, but thriving together.");
  para2.setSpacingAfter(12);
  
  var para3Text = "To prepare for our session, each of you will need to complete the Leading From Your Strengths Assessment. This assessment is a foundational tool that will give us valuable insights into how we each approach problem-solving, process information, manage change, and face risk. The results will guide our conversation and help us understand and appreciate what each person brings to the team.";
  var para3 = body.appendParagraph(para3Text);
  para3.setSpacingAfter(12);
  
  var importantHeader = body.appendParagraph('Important Details:');
  importantHeader.setSpacingAfter(6);
  
  var list1 = body.appendListItem('This is not a test—it cannot be failed, and there are no right or wrong answers');
  list1.setGlyphType(DocumentApp.GlyphType.BULLET);
  list1.setIndentStart(36);
  list1.setIndentFirstLine(18);
  
  var list2 = body.appendListItem('When completing the assessment, think about who you are at work and be decisive with your responses: "I am most like this" and "I am least like this"');
  list2.setGlyphType(DocumentApp.GlyphType.BULLET);
  list2.setIndentStart(36);
  list2.setIndentFirstLine(18);
  
  var list3 = body.appendListItem('The assessment should take you 10-12 minutes to complete');
  list3.setGlyphType(DocumentApp.GlyphType.BULLET);
  list3.setIndentStart(36);
  list3.setIndentFirstLine(18);
  
  var list4 = body.appendListItem("Once completed, you'll be able to download your results on-screen, and you'll also receive a copy via email for safekeeping");
  list4.setGlyphType(DocumentApp.GlyphType.BULLET);
  list4.setIndentStart(36);
  list4.setIndentFirstLine(18);
  list4.setSpacingAfter(12);
  
  var linkParaText = 'Assessment Link: ' + assessmentLink;
  var linkPara = body.appendParagraph(linkParaText);
  linkPara.setSpacingAfter(6);
  if (assessmentLink && assessmentLink.indexOf('http') === 0) {
    linkPara.editAsText().setLinkUrl(17, linkParaText.length - 1, assessmentLink);
  }
  
  if (responseLink) {
    var responseParaText = 'Response Link: ' + responseLink;
    var responsePara = body.appendParagraph(responseParaText);
    responsePara.setSpacingAfter(12);
    if (responseLink.indexOf('http') === 0) {
      responsePara.editAsText().setLinkUrl(15, responseParaText.length - 1, responseLink);
    }
  }
  
  var assignmentHeader = body.appendParagraph('Your Assignment:');
  assignmentHeader.setSpacingAfter(6);
  
  var assign1 = body.appendListItem('Complete the assessment by ' + deadlineDate);
  assign1.setGlyphType(DocumentApp.GlyphType.BULLET);
  assign1.setIndentStart(36);
  assign1.setIndentFirstLine(18);
  
  var assign2 = body.appendListItem('Review your results before our team session');
  assign2.setGlyphType(DocumentApp.GlyphType.BULLET);
  assign2.setIndentStart(36);
  assign2.setIndentFirstLine(18);
  
  var assign3 = body.appendListItem('Come prepared to share insights and ask questions');
  assign3.setGlyphType(DocumentApp.GlyphType.BULLET);
  assign3.setIndentStart(36);
  assign3.setIndentFirstLine(18);
  assign3.setSpacingAfter(12);
  
  var closingPara = body.appendParagraph("Our team building session will be facilitated by " + coachNames + 
                       ". This is an investment in us as a team, and I'm looking forward to what we'll learn together.");
  closingPara.setSpacingAfter(12);
  
  var seeYouPara = body.appendParagraph('See you on ' + sessionDate + '!');
  seeYouPara.setSpacingAfter(12);
  
  var signature = body.appendParagraph(leaderName);
  signature.setSpacingAfter(0);
  
  doc.saveAndClose();
  
  var docFile = DriveApp.getFileById(doc.getId());
  var spreadsheetFile = DriveApp.getFileById(ss.getId());
  var folders = spreadsheetFile.getParents();
  
  if (folders.hasNext()) {
    var folder = folders.next();
    folder.addFile(docFile);
    DriveApp.getRootFolder().removeFile(docFile);
  }
  
  var docUrl = doc.getUrl();
  var html = '<script>window.open("' + docUrl + '", "_blank");google.script.host.close();</script>';
  var userInterface = HtmlService.createHtmlOutput(html).setWidth(200).setHeight(100);
  ui.showModalDialog(userInterface, 'Opening Document...');
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Phase 2 Email to Team Assessment Assignment created!', 'Success', 5);
}

/**
 * Generates Phase 3 Follow-up Email document
 * Subject: Your Phase 3 & 4 One-on-One Guides (The Real Team Building Begins!)
 */
function generatePhase3FollowUpEmail() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var phase1Sheet = ss.getSheetByName('Phase 1 Settings');
  
  if (!phase1Sheet) {
    ui.alert('Error', 'Please create a "Phase 1 Settings" sheet first.', ui.ButtonSet.OK);
    return;
  }
  
  var coachNames = phase1Sheet.getRange('B6').getValue();
  coachNames = coachNames ? coachNames.toString() : "";
  
  var leaderName = phase1Sheet.getRange('B7').getValue();
  leaderName = leaderName ? leaderName.toString() : "";
  
  if (!leaderName) {
    var response = ui.prompt('Leader Name Missing', 
                            'Enter the leader\'s name:', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    leaderName = response.getResponseText();
    phase1Sheet.getRange('B7').setValue(leaderName);
  }
  
  if (!coachNames) {
    coachNames = 'Steve Basler';
  }
  
  var docName = leaderName + ' - Phase 3 Follow-up Email';
  var doc = DocumentApp.create(docName);
  var body = doc.getBody();
  
  body.setMarginTop(72);
  body.setMarginBottom(72);
  body.setMarginLeft(72);
  body.setMarginRight(72);
  
  var subject = body.appendParagraph('Subject: Your Phase 3 & 4 One-on-One Guides (The Real Team Building Begins!)');
  subject.setSpacingAfter(12);
  
  var greeting = body.appendParagraph(leaderName + ',');
  greeting.setSpacingAfter(12);
  
  var para1 = body.appendParagraph('Thank you for entrusting your team to us during yesterday\'s Team Building Session! It was an honor to facilitate that conversation, and we\'re genuinely excited about what\'s ahead for you and your team.');
  para1.setSpacingAfter(12);
  
  var para2 = body.appendParagraph('Here\'s the truth: Phase 2 was just the foundation. Phases 3 and 4 are where the real team building happens.');
  para2.setSpacingAfter(12);
  
  var para3 = body.appendParagraph('These next phases are where trust deepens, empathy grows, and true understanding takes root. We\'ve equipped you with the tools, but you\'re the hero in this story. Your team will experience transformation through the one-on-one conversations you\'re about to have with them—and they\'ll have with each other.');
  para3.setSpacingAfter(12);
  
  var para4 = body.appendParagraph('We\'ve included a link to download your One-on-One Exercise Guide. This is the same guide you\'ll use for your Phase 3 sessions with each team member, and the same guide each team member will use when they meet with each other in Phase 4.');
  para4.setSpacingAfter(12);
  
  var para5 = body.appendParagraph('(Note: This same link is included in the team member assignment email, so everyone will have access to the same resource.)');
  para5.setSpacingAfter(12);
  
  var actionHeader = body.appendParagraph('Your Immediate Action Items:');
  actionHeader.setSpacingAfter(6);
  
  var linkText = 'Click Here to Download the One-on-One Exercise Guide';
  var action1 = body.appendListItem(linkText + ' and review it thoroughly to prepare for your first one-on-one session.');
  action1.setGlyphType(DocumentApp.GlyphType.NUMBER);
  action1.setIndentStart(36);
  action1.setIndentFirstLine(18);
  // Add hyperlink to "Click Here"
  var guideUrl = 'https://drive.google.com/file/d/17R_uCQRbs9aVdmHGtpxlgJXarJy9QNcV/view?usp=sharing';
  action1.editAsText().setLinkUrl(0, linkText.length - 1, guideUrl);
  
  var action2 = body.appendListItem('Review and send the team member assignment email (attached) to your team as soon as possible. You can modify it to fit your voice and team culture, but we\'ve included all the essential details they\'ll need.');
  action2.setGlyphType(DocumentApp.GlyphType.NUMBER);
  action2.setIndentStart(36);
  action2.setIndentFirstLine(18);
  
  var action3 = body.appendListItem('Schedule your Phase 3 one-on-ones with each team member:');
  action3.setGlyphType(DocumentApp.GlyphType.NUMBER);
  action3.setIndentStart(36);
  action3.setIndentFirstLine(18);
  
  var sub1 = body.appendListItem('First Session (30-45 minutes): One-on-One Exercise');
  sub1.setGlyphType(DocumentApp.GlyphType.BULLET);
  sub1.setIndentStart(72);
  sub1.setIndentFirstLine(54);
  
  var sub2 = body.appendListItem('Follow-up Session (15-30 minutes): Strengths Movement Exercise and Action Planning');
  sub2.setGlyphType(DocumentApp.GlyphType.BULLET);
  sub2.setIndentStart(72);
  sub2.setIndentFirstLine(54);
  
  var action4 = body.appendListItem('Important: We strongly recommend you break these into two separate meetings rather than combining them. This gives time for reflection between sessions and builds more trust, empathy, and understanding. Keep the ball rolling, but give each conversation the space it deserves.');
  action4.setGlyphType(DocumentApp.GlyphType.NUMBER);
  action4.setIndentStart(36);
  action4.setIndentFirstLine(18);
  
  var action5 = body.appendListItem('Phase 4 Peer One-on-Ones: We will give the responsibility to each team member to schedule their own one-on-ones with each other. We will instruct them to add you as "optional" to those meeting invites—not to observe, but simply to keep you in the loop on who\'s meeting when so you can keep everyone accountable.');
  action5.setGlyphType(DocumentApp.GlyphType.NUMBER);
  action5.setIndentStart(36);
  action5.setIndentFirstLine(18);
  action5.setSpacingAfter(12);
  
  var timingHeader = body.appendParagraph('Key Timing Notes:');
  timingHeader.setSpacingAfter(6);
  
  var timing1 = body.appendListItem('Phase 3 and Phase 4 should happen simultaneously—they\'re designed to run in parallel, not sequentially. You don\'t need to wait until all your one-on-ones are complete before team members start meeting with each other (unless you prefer to structure it that way).');
  timing1.setGlyphType(DocumentApp.GlyphType.BULLET);
  timing1.setIndentStart(36);
  timing1.setIndentFirstLine(18);
  
  var timing2 = body.appendListItem('When you\'re ready for Phase 5 (your final team meeting), just let us know! We\'ll send you everything you need to facilitate that 45-60 minute session where you\'ll pull together all the takeaways, future to-dos, and organizational implementation strategy.');
  timing2.setGlyphType(DocumentApp.GlyphType.BULLET);
  timing2.setIndentStart(36);
  timing2.setIndentFirstLine(18);
  timing2.setSpacingAfter(12);
  
  var para6 = body.appendParagraph('If you need any assistance as you move through these phases—questions about the exercises, coaching on a difficult conversation, or just a sounding board—please reach out anytime. We\'re invested in your success.');
  para6.setSpacingAfter(12);
  
  var para7 = body.appendParagraph('Please keep us posted on your wins along the way! We want to celebrate with you as you watch your team grow stronger, more connected, and more aligned. Those breakthrough moments when someone truly "gets it" about themselves or a teammate—we love hearing about those.');
  para7.setSpacingAfter(12);
  
  var para8 = body.appendParagraph('You\'re building something special here. Let\'s make it happen!');
  para8.setSpacingAfter(12);
  
  var closing = body.appendParagraph('Looking forward to the journey ahead,');
  closing.setSpacingAfter(12);
  
  var sig1 = body.appendParagraph(coachNames);
  sig1.setSpacingAfter(0);
  var sig2 = body.appendParagraph('Basler Academy');
  sig2.setSpacingAfter(0);
  
  doc.saveAndClose();
  
  var docFile = DriveApp.getFileById(doc.getId());
  var spreadsheetFile = DriveApp.getFileById(ss.getId());
  var folders = spreadsheetFile.getParents();
  
  if (folders.hasNext()) {
    var folder = folders.next();
    folder.addFile(docFile);
    DriveApp.getRootFolder().removeFile(docFile);
  }
  
  var docUrl = doc.getUrl();
  var html = '<script>window.open("' + docUrl + '", "_blank");google.script.host.close();</script>';
  var userInterface = HtmlService.createHtmlOutput(html).setWidth(200).setHeight(100);
  ui.showModalDialog(userInterface, 'Opening Document...');
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Phase 3 Follow-up Email created!', 'Success', 5);
}

/**
 * Generates Phase 3 Team Assignment Email document
 * Subject: Your Next Steps in Building Our Stronger Team
 */
function generatePhase3TeamAssignmentEmail() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var phase1Sheet = ss.getSheetByName('Phase 1 Settings');
  
  if (!phase1Sheet) {
    ui.alert('Error', 'Please create a "Phase 1 Settings" sheet first.', ui.ButtonSet.OK);
    return;
  }
  
  var leaderName = phase1Sheet.getRange('B7').getValue();
  leaderName = leaderName ? leaderName.toString() : "";
  
  if (!leaderName) {
    var response = ui.prompt('Leader Name Missing', 
                            'Enter the leader\'s name:', 
                            ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() != ui.Button.OK) return;
    leaderName = response.getResponseText();
    phase1Sheet.getRange('B7').setValue(leaderName);
  }
  
  var docName = leaderName + ' - Phase 3 Email to Team Assignment';
  var doc = DocumentApp.create(docName);
  var body = doc.getBody();
  
  body.setMarginTop(72);
  body.setMarginBottom(72);
  body.setMarginLeft(72);
  body.setMarginRight(72);
  
  var subject = body.appendParagraph('Subject: Your Next Steps in Building Our Stronger Team');
  subject.setSpacingAfter(12);
  
  var greeting = body.appendParagraph('Team,');
  greeting.setSpacingAfter(12);
  
  var para1 = body.appendParagraph('Thank you for your engagement during our Team Building Session! The insights we discovered together are just the beginning. The real transformation happens in the one-on-one conversations we\'re about to have—both with me and with each other.');
  para1.setSpacingAfter(12);
  
  var para2 = body.appendParagraph('Here\'s what\'s next and what you need to do:');
  para2.setSpacingAfter(12);
  
  var para3 = body.appendParagraph('You\'ll meet with me for two separate sessions:');
  para3.setSpacingAfter(6);
  
  var session1 = body.appendListItem('First Session (30-45 minutes): One-on-One Exercise');
  session1.setGlyphType(DocumentApp.GlyphType.NUMBER);
  session1.setIndentStart(36);
  session1.setIndentFirstLine(18);
  
  var session2 = body.appendListItem('Second Session (15-30 minutes): Strengths Movement and Action Planning');
  session2.setGlyphType(DocumentApp.GlyphType.NUMBER);
  session2.setIndentStart(36);
  session2.setIndentFirstLine(18);
  session2.setSpacingAfter(12);
  
  var assignHeader1 = body.appendParagraph('Your Assignment:');
  assignHeader1.setSpacingAfter(6);
  
  var linkText1 = 'Click Here';
  var assign1Text = 'Download the One-on-One Exercise Guide - ' + linkText1 + ' to download';
  var assign1 = body.appendListItem(assign1Text);
  assign1.setGlyphType(DocumentApp.GlyphType.NUMBER);
  assign1.setIndentStart(36);
  assign1.setIndentFirstLine(18);
  var guideUrl = 'https://drive.google.com/file/d/17R_uCQRbs9aVdmHGtpxlgJXarJy9QNcV/view?usp=sharing';
  var linkStart1 = assign1Text.indexOf(linkText1);
  assign1.editAsText().setLinkUrl(linkStart1, linkStart1 + linkText1.length - 1, guideUrl);
  
  var assign2 = body.appendListItem('Complete the pre-work in the guide before our first meeting');
  assign2.setGlyphType(DocumentApp.GlyphType.NUMBER);
  assign2.setIndentStart(36);
  assign2.setIndentFirstLine(18);
  
  var assign3 = body.appendListItem('Schedule both sessions with me - Reach out to set up times on my calendar');
  assign3.setGlyphType(DocumentApp.GlyphType.NUMBER);
  assign3.setIndentStart(36);
  assign3.setIndentFirstLine(18);
  assign3.setSpacingAfter(12);
  
  var para4 = body.appendParagraph('We\'re breaking these into two meetings intentionally—it gives us time to reflect between sessions and builds more trust, empathy, and understanding.');
  para4.setSpacingAfter(12);
  
  var para5 = body.appendParagraph('After (or alongside) your meetings with me, you\'ll meet one-on-one with each of your teammates using the same One-on-One Exercise Guide.');
  para5.setSpacingAfter(12);
  
  var assignHeader2 = body.appendParagraph('Your Assignment:');
  assignHeader2.setSpacingAfter(6);
  
  var peerAssign1 = body.appendListItem('Schedule a 20-30 minute one-on-one with each team member');
  peerAssign1.setGlyphType(DocumentApp.GlyphType.NUMBER);
  peerAssign1.setIndentStart(36);
  peerAssign1.setIndentFirstLine(18);
  
  var peerAssign2 = body.appendListItem('Use the same One-on-One Exercise Guide you used with me (skip the "Keys to Motivating" and "Keys to Leading" sections—those are just for me)');
  peerAssign2.setGlyphType(DocumentApp.GlyphType.NUMBER);
  peerAssign2.setIndentStart(36);
  peerAssign2.setIndentFirstLine(18);
  
  var peerAssign3 = body.appendListItem('Add me as "optional" on all peer meeting invites (not to observe, just to keep me in the loop)');
  peerAssign3.setGlyphType(DocumentApp.GlyphType.NUMBER);
  peerAssign3.setIndentStart(36);
  peerAssign3.setIndentFirstLine(18);
  peerAssign3.setSpacingAfter(12);
  
  var para6 = body.appendParagraph('These peer conversations are where team cohesion is really built. They\'re just as important as your conversations with me.');
  para6.setSpacingAfter(12);
  
  var para7 = body.appendParagraph('For your second session with me, we\'ll work through the Strengths Movement Exercise together. I\'m providing the link now so you have it, but please wait to complete this exercise until after we\'ve finished our first one-on-one session.');
  para7.setSpacingAfter(12);
  
  var linkText2 = 'Click Here';
  var movementText = 'Download the Strengths Movement Exercise - ' + linkText2;
  var movementPara = body.appendParagraph(movementText);
  movementPara.setSpacingAfter(12);
  var movementUrl = 'https://drive.google.com/file/d/1x6U8dGW24jZQHrVzRg_WrpbpUfralUTQ/view?usp=sharing';
  var linkStart2 = movementText.indexOf(linkText2);
  movementPara.editAsText().setLinkUrl(linkStart2, linkStart2 + linkText2.length - 1, movementUrl);
  
  var para8 = body.appendParagraph('Phase 3 (your sessions with me) and Phase 4 (your peer sessions) should happen simultaneously—you don\'t need to wait until all your sessions with me are complete before starting your peer conversations. Let\'s keep the momentum going!');
  para8.setSpacingAfter(12);
  
  var para9 = body.appendParagraph('These conversations are where we build the relational capital that makes everything else possible. When we genuinely understand each other—how we communicate, what motivates us, how we show up under pressure—collaboration becomes natural, trust deepens, and performance increases.');
  para9.setSpacingAfter(12);
  
  var para10 = body.appendParagraph('Remember: Thriving relationships → thriving cultures → thriving organizations.');
  para10.setSpacingAfter(12);
  
  var para11 = body.appendParagraph('Let\'s build something great together.');
  para11.setSpacingAfter(12);
  
  var closing = body.appendParagraph('Looking forward to our conversations,');
  closing.setSpacingAfter(12);
  
  var signature = body.appendParagraph(leaderName);
  signature.setSpacingAfter(0);
  
  doc.saveAndClose();
  
  var docFile = DriveApp.getFileById(doc.getId());
  var spreadsheetFile = DriveApp.getFileById(ss.getId());
  var folders = spreadsheetFile.getParents();
  
  if (folders.hasNext()) {
    var folder = folders.next();
    folder.addFile(docFile);
    DriveApp.getRootFolder().removeFile(docFile);
  }
  
  var docUrl = doc.getUrl();
  var html = '<script>window.open("' + docUrl + '", "_blank");google.script.host.close();</script>';
  var userInterface = HtmlService.createHtmlOutput(html).setWidth(200).setHeight(100);
  ui.showModalDialog(userInterface, 'Opening Document...');
  
  SpreadsheetApp.getActiveSpreadsheet().toast('Phase 3 Email to Team Assignment created!', 'Success', 5);
}