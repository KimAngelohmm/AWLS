const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

let transport = null;

function emailProvider() {
  return String(process.env.EMAIL_PROVIDER || 'outlook').trim().toLowerCase();
}

function resolveSmtpHost() {
  if (process.env.EMAIL_HOST) {
    return process.env.EMAIL_HOST.trim();
  }
  const provider = emailProvider();
  if (provider === 'gmail' || provider === 'google') {
    return 'smtp.gmail.com';
  }
  if (provider === 'outlook' || provider === 'office365' || provider === 'microsoft') {
    return 'smtp.office365.com';
  }
  return null;
}

function buildTransportOptions() {
  const host = resolveSmtpHost();
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.EMAIL_PORT || 587);
  const secure = process.env.EMAIL_SECURE === 'true';
  const isOutlook =
    emailProvider() === 'outlook' ||
    emailProvider() === 'office365' ||
    emailProvider() === 'microsoft' ||
    host.includes('office365') ||
    host.includes('outlook');

  const options = {
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    tls: { minVersion: 'TLSv1.2' },
  };

  if (isOutlook) {
    options.requireTLS = true;
  }

  return options;
}

function getTransport() {
  if (!resolveSmtpHost()) return null;
  if (!process.env.EMAIL_USER?.trim() || !process.env.EMAIL_PASS) {
    const hint =
      emailProvider() === 'gmail' || emailProvider() === 'google'
        ? 'Add EMAIL_PASS (Google App Password) in backend/.env'
        : 'Add EMAIL_PASS (Microsoft 365 / Outlook password or app password) in backend/.env';
    console.warn(`[email] SMTP configured but credentials missing — ${hint}`);
    return null;
  }
  if (!transport) {
    transport = nodemailer.createTransport(buildTransportOptions());
  }
  return transport;
}

function resetTransport() {
  transport = null;
}

function frontendOrigin() {
  return (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
}

function fromAddress() {
  const addr = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@awlms.local';
  const name = process.env.EMAIL_FROM_NAME || 'AWLMS Recruitment';
  return name ? `${name} <${addr}>` : addr;
}

async function saveDevOutbox({ to, subject, text }) {
  if (process.env.NODE_ENV === 'production' || process.env.EMAIL_DEV_OUTBOX === 'false') {
    return null;
  }
  const dir = path.join(__dirname, '../../.email-outbox');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTo = String(to).replace(/[^a-zA-Z0-9@._-]/g, '_');
  const file = path.join(dir, `${stamp}_${safeTo}.txt`);
  const body = `From: ${fromAddress()}\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`;
  fs.writeFileSync(file, body, 'utf8');
  console.info(`[email] Dev outbox saved: ${file}`);
  return file;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransport();
  if (!t) {
    const reason = !resolveSmtpHost()
      ? 'EMAIL_HOST / EMAIL_PROVIDER not set'
      : !process.env.EMAIL_PASS
        ? 'EMAIL_PASS not set'
        : 'SMTP not configured';
    console.warn(`[email] Not sent (${reason}):`, subject, '→', to);
    await saveDevOutbox({ to, subject, text });
    return { sent: false, reason };
  }
  try {
    await t.sendMail({
      from: fromAddress(),
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });
    console.info('[email] Sent:', subject, '→', to);
    return { sent: true };
  } catch (err) {
    console.error('[email] Send failed:', err.message);
    await saveDevOutbox({ to, subject, text });
    return { sent: false, reason: err.message };
  }
}

async function verifyEmailConfig() {
  resetTransport();
  const t = getTransport();
  if (!t) {
    throw new Error(
      'Email not configured. Set EMAIL_USER, EMAIL_PASS, and EMAIL_PROVIDER=outlook in backend/.env'
    );
  }
  await t.verify();
  return {
    ok: true,
    host: resolveSmtpHost(),
    user: process.env.EMAIL_USER,
    provider: emailProvider(),
  };
}

async function sendApplicationConfirmation({ to, fullName, jobTitle }) {
  const name = fullName || 'Applicant';
  const role = jobTitle || 'the position';
  return sendMail({
    to,
    subject: `Application received — ${role}`,
    text: `Hello ${name},

Thank you for applying for ${role} at AWLMS.

We have received your application and it is under review. You will be notified by email if you are selected for an AI interview.

Best regards,
AWLMS Recruitment`,
  });
}

async function sendInterviewInvitation({ to, fullName, jobTitle, interviewToken }) {
  const name = fullName || 'Applicant';
  const role = jobTitle || 'the position';
  const link = `${frontendOrigin()}/interview/${interviewToken}`;
  return sendMail({
    to,
    subject: `AI interview invitation — ${role}`,
    text: `Hello ${name},

Congratulations! You have been invited to complete an AI-powered interview for ${role} at AWLMS.

Please use this one-time link to begin your interview:
${link}

This link is unique to you. Do not share it with others.

Best regards,
AWLMS Recruitment`,
  });
}

async function sendInterviewLink({ to, fullName, jobTitle, interviewLink, hrEmail, subject, hrNotes }) {
  const name = fullName || 'Applicant';
  const role = jobTitle || 'the position';
  const notes = hrNotes && hrNotes.trim() ? `\n\nNotes from HR:\n${hrNotes}` : '';
  return sendMail({
    to,
    subject: subject || `AI interview link — ${role}`,
    text: `Hello ${name},

You have been sent a link to complete an AI-powered interview for ${role} at AWLMS.

Interview link:
${interviewLink}

HR Contact: ${hrEmail}${notes}

This link is unique to you. Do not share it with others.

Best regards,
AWLMS Recruitment`,
  });
}

module.exports = {
  sendApplicationConfirmation,
  sendInterviewInvitation,
  sendInterviewLink,
  verifyEmailConfig,
  resetTransport,
};
