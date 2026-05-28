import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { customerEnquiryTemplate } from './templates/costomer.enquiry.template';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sender = `"CELITE Tyre" <${process.env.EMAIL_USER}>`;
const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

/**
 * Send customer inquiry notification email to admin
 * @param {string} customerContactNo - Customer's contact number
 * @returns {Promise<boolean>} - Success status of email send
 */

export const sendCustomerInquiryEmailToAdmin = async (
  customerContactNo: string,
): Promise<boolean> => {
  try {
    if (!adminEmail) {
      console.error('❌ Admin email not configured in environment variables');
      return false;
    }

    const mailOptions = {
      from: sender,
      to: adminEmail,
      subject: '🚗 New Customer Inquiry - Contact Number Received',
      html: customerEnquiryTemplate(customerContactNo),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Customer inquiry email sent to admin: ${adminEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending customer inquiry email:', error);
    return false;
  }
};

/**
 * Send notification email to multiple recipients with a template
 * @param {string[]} recipientEmails - List of recipient email addresses
 * @param {string} taskMessage - Message containing task details
 */
export const sendNotificationEmail = async (recipientEmails: string[], taskMessage: string) => {
  const mailOptions = {
    from: sender,
    to: recipientEmails.join(','),
    subject: '📢 New Customer Inquiry 🚗',
    html: taskMessage,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Notification email sent to: ${recipientEmails.join(', ')}`);
  } catch (error) {
    console.error('❌ Error sending notification email:', error);
  }
};