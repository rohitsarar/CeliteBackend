/**
 * @deprecated Kept only so old imports keep compiling.
 * Use `sendNewLeadEmailToAdmin` from `service/email/email.service` instead,
 * which reads the recipient from ADMIN_EMAIL instead of a hardcoded address.
 */
import { sendNewLeadEmailToAdmin } from "../service/email/email.service";

export const sendUserEmail = async (user: {
  FullName?: string | null;
  email?: string | null;
  contactNumber?: string | null;
}) =>
  sendNewLeadEmailToAdmin({
    fullName: user.FullName,
    email: user.email,
    contactNumber: user.contactNumber,
  });
