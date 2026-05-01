import nodemailer from "nodemailer";

export const sendUserEmail = async (user: any) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, // app password
        },
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: "ishupraja124421@gmail.com", // 👈 YOUR EMAIL (owner)
        subject: "New Customer Inquiry 🚗",
        html: `
      <h3>New Lead Received</h3>
      <p><b>Name:</b> ${user.FullName}</p>
      <p><b>Phone:</b> ${user.contactNumber}</p>
      <p><b>Email:</b> ${user.email}</p>
    `,
    });
};