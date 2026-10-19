/**
 * Customer Inquiry Email Template
 * HTML template for sending customer inquiry notifications to the admin.
 */

export type CustomerEnquiryDetails = {
  contactNo: string;
  fullName?: string;
  email?: string;
  tyre?: string;
  message?: string;
};

const escapeHtml = (value: string | undefined | null): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const row = (label: string, value?: string) =>
  value
    ? `<tr>
         <td style="padding:6px 0;color:#6b7280;font-size:13px;width:110px;vertical-align:top">${label}</td>
         <td style="padding:6px 0;color:#111827;font-size:15px;font-weight:600;word-break:break-word">${escapeHtml(value)}</td>
       </tr>`
    : "";

export const customerEnquiryTemplate = (details: CustomerEnquiryDetails): string => {
  const phoneDigits = details.contactNo.replace(/[^0-9+]/g, "");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Customer Inquiry</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff7f3; line-height: 1.6; color: #111827; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #FF2D2D 0%, #FF6A00 100%); color: white; padding: 32px 28px; text-align: center; }
        .header h1 { font-size: 26px; margin-bottom: 8px; letter-spacing: 0.02em; }
        .header p { font-size: 14px; opacity: 0.95; }
        .content { padding: 30px; }
        .info-box { background-color: #fff2ed; border-left: 4px solid #FF2D2D; padding: 18px 20px; margin: 24px 0; border-radius: 8px; }
        .info-box h3 { color: #FF2D2D; font-size: 15px; margin-bottom: 8px; }
        .message-box { background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; font-size: 14px; white-space: pre-wrap; }
        .cta-button { display: inline-block; background-color: #FF2D2D; color: #ffffff !important; padding: 12px 30px; border-radius: 9999px; text-decoration: none; font-weight: 700; margin-top: 16px; }
        .footer { background-color: #fff5f2; padding: 20px; text-align: center; border-top: 1px solid #fde2d0; font-size: 12px; color: #6b7280; }
        .footer p { margin: 5px 0; }
        .timestamp { color: #9ca3af; font-size: 12px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Customer Inquiry</h1>
          <p>CELITE Tyre - Customer Service Alert</p>
        </div>

        <div class="content">
          <p>Hello,</p>
          <p style="margin: 15px 0; font-size: 15px;">
            A new customer inquiry has been received on the CELITE Tyre website.
          </p>

          <div class="info-box">
            <h3>Customer Details</h3>
            <table cellpadding="0" cellspacing="0" style="width:100%">
              ${row("Phone", details.contactNo)}
              ${row("Name", details.fullName)}
              ${row("Email", details.email)}
              ${row("Interested in", details.tyre)}
            </table>
          </div>

          ${
            details.message
              ? `<h3 style="font-size:14px;color:#374151;margin-bottom:8px">Message</h3>
                 <div class="message-box">${escapeHtml(details.message)}</div>`
              : ""
          }

          <div style="text-align:center">
            <a class="cta-button" href="tel:${escapeHtml(phoneDigits)}">Call ${escapeHtml(details.contactNo)}</a>
          </div>

          <p style="margin: 24px 0 0; font-size: 13px; color: #666;">
            Please reach out to the customer within 24 hours.
          </p>
        </div>

        <div class="footer">
          <p><strong>CELITE Tyre</strong> - Premium Tyre Solutions</p>
          <p>This is an automated message from the website.</p>
          <div class="timestamp">Generated at: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</div>
        </div>
      </div>
    </body>
    </html>
  `;
};
