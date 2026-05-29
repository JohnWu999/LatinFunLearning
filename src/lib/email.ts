import nodemailer from "nodemailer";

type VerificationEmail = {
  email: string;
  code: string;
};

function smtpReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function fromAddress() {
  return process.env.SMTP_FROM ?? `"Classic WordLab" <${process.env.SMTP_USER ?? "no-reply@classicwordlab.local"}>`;
}

export async function sendVerificationEmail({ email, code }: VerificationEmail) {
  const subject = "Classic WordLab account verification code";
  const text = [
    "Welcome to Classic WordLab.",
    "",
    "To protect your learning account and make sure this email belongs to you, please enter the verification code below on the registration page:",
    "",
    code,
    "",
    "This code will expire in 10 minutes. If you did not request a Classic WordLab account, you can safely ignore this email.",
    "",
    "Classic WordLab Team"
  ].join("\n");
  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #28231f; line-height: 1.6;">
      <h1 style="color:#26576f; margin-bottom: 8px;">Welcome to Classic WordLab</h1>
      <p>To protect your learning account and make sure this email belongs to you, please enter the verification code below on the registration page:</p>
      <p style="font-size: 32px; letter-spacing: 0.18em; font-weight: 800; color: #df5d22; margin: 22px 0;">${code}</p>
      <p>This code will expire in <strong>10 minutes</strong>. If you did not request a Classic WordLab account, you can safely ignore this email.</p>
      <p style="margin-top: 28px; color: #77716a;">Classic WordLab Team</p>
    </div>
  `;

  if (!smtpReady()) {
    console.info(`[Classic WordLab] Verification code for ${email}: ${code}`);
    return { delivered: false, reason: "SMTP is not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: fromAddress(),
    to: email,
    subject,
    text,
    html
  });

  return { delivered: true };
}
