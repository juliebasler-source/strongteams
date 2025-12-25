/**
 * Stripe Webhook Handler for Pay-Later Notifications
 * Sends email when 100% discount/promotion code used
 */

/**
 * Handle GET requests (for browser testing)
 */
function doGet(e) {
  return ContentService.createTextOutput(
    '✅ Webhook is publicly accessible!\n\n' +
    'This endpoint accepts POST requests from Stripe.\n' +
    'Status: Ready to receive webhooks'
  ).setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Handle POST requests from Stripe
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    Logger.log('Webhook received: ' + payload.type);
    
    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      
      // Check for $0 payment (paylater scenario)
      if (session.amount_total === 0) {
        Logger.log('Zero-dollar checkout detected');
        
        if (session.discounts && session.discounts.length > 0) {
          for (let discount of session.discounts) {
            
            // Check promotion_code (new structure)
            if (discount.promotion_code) {
              Logger.log('Promotion code detected: ' + discount.promotion_code);
              sendPayLaterNotification(session);
              break;
            }
            
            // Check direct coupon (backwards compatible)
            if (discount.coupon && discount.coupon.id) {
              const couponCode = discount.coupon.id.toLowerCase();
              if (couponCode === 'paylater') {
                Logger.log('Coupon detected: paylater');
                sendPayLaterNotification(session);
                break;
              }
            }
          }
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Webhook error: ' + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Send pay-later notification email
 */
function sendPayLaterNotification(session) {
  const adminEmail = 'admin@basleracademy.com';
  
  // Extract customer details
  const customerName = session.customer_details.name || 'Unknown';
  const customerEmail = session.customer_details.email || session.customer_email || 'No email provided';
  
  // Calculate NET 30 due date
  const bookingDate = new Date(session.created * 1000);
  const dueDate = new Date(bookingDate);
  dueDate.setDate(dueDate.getDate() + 30);
  
  const dueDateString = dueDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Build email
  const subject = 'Corporate Booking - Invoice Required (NET 30) - ' + customerName;
  
  const body = '🔔 CORPORATE BOOKING ALERT\n\n' +
    '═══════════════════════════════════════\n\n' +
    'A corporate client has completed booking with a pay-later arrangement.\n\n' +
    '📋 CLIENT DETAILS:\n' +
    '──────────────────────────────────────\n' +
    'Name: ' + customerName + '\n' +
    'Email: ' + customerEmail + '\n' +
    'Booking Date: ' + bookingDate.toLocaleDateString('en-US') + '\n\n' +
    '💰 PAYMENT DETAILS:\n' +
    '──────────────────────────────────────\n' +
    'Amount: $500.00\n' +
    'Terms: NET 30\n' +
    'Due Date: ' + dueDateString + '\n\n' +
    '⚡ REQUIRED ACTION:\n' +
    '──────────────────────────────────────\n' +
    '1. Create an invoice in Stripe Dashboard\n' +
    '2. Set due date to: ' + dueDateString + '\n' +
    '3. Send invoice to: ' + customerEmail + '\n\n' +
    '🔗 CREATE INVOICE:\n' +
    'https://dashboard.stripe.com/invoices/create\n\n' +
    '───────────────────────────────────────\n' +
    'Stripe Session ID: ' + session.id + '\n' +
    '───────────────────────────────────────\n\n' +
    'This is an automated notification from your Stripe webhook.\n';
  
  // Send email
  MailApp.sendEmail({
    to: adminEmail,
    subject: subject,
    body: body
  });
  
  Logger.log('Notification sent to ' + adminEmail + ' for ' + customerName);
}

/**
 * Test function - Run this to verify email works
 */
function testPayLaterNotification() {
  Logger.log('Testing paylater notification...');
  
  const testSession = {
    id: 'cs_test_123456789',
    customer_details: {
      name: 'Test User',
      email: 'test@example.com'
    },
    customer_email: 'test@example.com',
    created: Math.floor(Date.now() / 1000)
  };
  
  sendPayLaterNotification(testSession);
  
  Logger.log('Test notification sent! Check admin@basleracademy.com');
}

/**
 * Test webhook URL with POST request
 */
function testWebhookPOST() {
  // REPLACE THIS WITH YOUR ACTUAL WEB APP URL
  const webhookURL = 'YOUR_WEB_APP_URL_HERE';
  
  if (webhookURL === 'YOUR_WEB_APP_URL_HERE') {
    Logger.log('❌ ERROR: Please replace YOUR_WEB_APP_URL_HERE with your actual webhook URL');
    return;
  }
  
  Logger.log('Testing POST to: ' + webhookURL);
  
  const testPayload = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        amount_total: 0,
        customer_email: 'test@example.com',
        customer_details: {
          name: 'Test User',
          email: 'test@example.com'
        },
        discounts: [
          {
            promotion_code: 'promo_test123'
          }
        ],
        created: Math.floor(Date.now() / 1000)
      }
    }
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(webhookURL, options);
    const code = response.getResponseCode();
    const body = response.getContentText();
    
    Logger.log('═══════════════════════════════════');
    Logger.log('Response Code: ' + code);
    Logger.log('Response Body: ' + body);
    Logger.log('═══════════════════════════════════');
    
    if (code === 200 && body.includes('success')) {
      Logger.log('✅ POST TEST PASSED!');
      Logger.log('✅ Webhook is working correctly');
      Logger.log('📧 Check email at admin@basleracademy.com');
    } else if (code === 302) {
      Logger.log('❌ POST TEST FAILED - Got 302 redirect');
      Logger.log('Deployment may not be truly public');
    } else {
      Logger.log('⚠️ Unexpected response: ' + code);
    }
  } catch (error) {
    Logger.log('❌ Error: ' + error.message);
  }
}