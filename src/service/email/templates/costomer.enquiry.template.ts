/**
 * Customer Inquiry Email Template
 * HTML template for sending customer inquiry notifications to admin
 */

export const customerEnquiryTemplate = (customerContact: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Customer Inquiry</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #fff7f3;
          line-height: 1.6;
          color: #111827;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #FF2D2D 0%, #FF6A00 100%);
          color: white;
          padding: 32px 28px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          letter-spacing: 0.02em;
        }
        .header p {
          font-size: 14px;
          opacity: 0.95;
        }
        .content {
          padding: 30px;
        }
        .info-box {
          background-color: #fff2ed;
          border-left: 4px solid #FF2D2D;
          padding: 20px;
          margin: 24px 0;
          border-radius: 8px;
        }
        .info-box h3 {
          color: #FF2D2D;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .info-box p {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          word-break: break-all;
        }
        .cta-section {
          background-color: #fff3e7;
          padding: 22px;
          border-radius: 10px;
          margin-top: 28px;
          border: 2px dashed #FF6A00;
        }
        .cta-section p {
          font-size: 14px;
          color: #374151;
          margin-bottom: 12px;
        }
        .cta-button {
          display: inline-block;
          background-color: #FF2D2D;
          color: #ffffff;
          padding: 12px 30px;
          border-radius: 9999px;
          text-decoration: none;
          font-weight: 700;
          margin-top: 10px;
          transition: background-color 0.3s ease;
        }
        .cta-button:hover {
          background-color: #FF6A00;
        }
        .footer {
          background-color: #fff5f2;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #fde2d0;
          font-size: 12px;
          color: #6b7280;
        }
        .footer p {
          margin: 5px 0;
        }
        .timestamp {
          color: #9ca3af;
          font-size: 12px;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>🚗 New Customer Inquiry</h1>
          <p>CELITE Tyre - Customer Service Alert</p>
        </div>

        <!-- Content -->
        <div class="content">
          <p>Hello,</p>
          
          <p style="margin: 15px 0; font-size: 15px;">
            A new customer inquiry has been received on your CELITE Tyre website. Please review the details below and take appropriate action.
          </p>

          <!-- Customer Contact Info -->
          <div class="info-box">
            <h3>📞 Customer Contact Information</h3>
            <p>${customerContact}</p>
          </div>

          <!-- Action Section -->
          <div class="cta-section">
            <p><strong>Next Steps:</strong></p>
            <p>✅ Review the customer's contact details above</p>
            <p>✅ Reach out to the customer within 24 hours</p>
            <p>✅ Provide assistance with their tire inquiry</p>
            <p>✅ Update your CRM system with this lead</p>
          </div>

          <p style="margin: 20px 0; font-size: 14px; color: #666;">
            This is an automated notification from your CELITE Tyre website. Please ensure prompt follow-up with this customer inquiry to maintain excellent customer service.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>CELITE Tyre</strong> - Premium Tire Solutions</p>
          <p>This is an automated message. Please do not reply to this email.</p>
          <div class="timestamp">
            Generated at: ${new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
