import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "../../utils/winston";
import {
  customerEnquiryTemplate,
  CustomerEnquiryDetails,
} from "./templates/costomer.enquiry.template";

dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || EMAIL_USER;

const isConfigured = Boolean(EMAIL_USER && EMAIL_PASS && ADMIN_EMAIL);

if (!isConfigured) {
  logger.warn(
    "E-mail is not configured (EMAIL_USER / EMAIL_PASS / ADMIN_EMAIL). Inquiry mails will be skipped.",
  );
}

// One shared transporter with pooling so each inquiry does not open a new
// SMTP connection to Gmail.
const transporter = nodemailer.createTransport({
  service: "gmail",
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

const sender = `"CELITE Tyre" <${EMAIL_USER}>`;

/** Escape user-supplied text before it is placed inside HTML. */
export const escapeHtml = (value: string | undefined | null): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Notify the admin that a customer left their contact details
 * (used by the product page, the contact form and the callback drawer).
 */
export const sendCustomerInquiryEmailToAdmin = async (
  details: CustomerEnquiryDetails,
): Promise<boolean> => {
  if (!isConfigured) return false;

  try {
    const subjectParts = ["New Customer Inquiry"];
    if (details.tyre) subjectParts.push(details.tyre);

    await transporter.sendMail({
      from: sender,
      to: ADMIN_EMAIL,
      replyTo: details.email || undefined,
      subject: subjectParts.join(" - "),
      html: customerEnquiryTemplate(details),
      text: [
        "New customer inquiry from the CELITE Tyre website",
        `Contact: ${details.contactNo}`,
        details.fullName ? `Name: ${details.fullName}` : null,
        details.email ? `Email: ${details.email}` : null,
        details.tyre ? `Tyre: ${details.tyre}` : null,
        details.message ? `Message: ${details.message}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    logger.info(`Customer inquiry e-mail sent to admin for ${details.contactNo}`);
    return true;
  } catch (error) {
    logger.error(`Error sending customer inquiry e-mail: ${(error as Error).message}`);
    return false;
  }
};

/** Notify the admin that a new lead was saved via /user/post-user-details. */
export const sendNewLeadEmailToAdmin = async (lead: {
  fullName?: string | null;
  email?: string | null;
  contactNumber?: string | null;
}): Promise<boolean> => {
  if (!isConfigured) return false;

  await transporter.sendMail({
    from: sender,
    to: ADMIN_EMAIL,
    replyTo: lead.email || undefined,
    subject: "New Lead Received - CELITE Tyre",
    html: `
      <h3>New Lead Received</h3>
      <p><b>Name:</b> ${escapeHtml(lead.fullName)}</p>
      <p><b>Phone:</b> ${escapeHtml(lead.contactNumber)}</p>
      <p><b>Email:</b> ${escapeHtml(lead.email)}</p>
      <p style="color:#6b7280;font-size:12px">Received ${new Date().toLocaleString()}</p>
    `,
  });

  logger.info(`New lead e-mail sent to admin for ${lead.contactNumber}`);
  return true;
};
