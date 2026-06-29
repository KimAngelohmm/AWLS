const { sendMail } = require('./emailService');

async function sendVerificationEmail({ to, fullName, verificationCode, expiresInMinutes }) {
  const name = fullName || 'Applicant';
  const expiryText = `${expiresInMinutes} minutes`;

  return sendMail({
    to,
    subject: 'Verify your AWLMS account - Your 6-digit code',
    text: `Hello ${name},

Thank you for registering with AWLMS!

Please use the following 6-digit verification code to verify your email address:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       ${verificationCode}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This code will expire in ${expiryText}.

If you did not create an account with AWLMS, please ignore this email.

Best regards,
AWLMS Recruitment Team`,
  });
}

async function sendWelcomeEmail({ to, fullName }) {
  const name = fullName || 'Applicant';

  return sendMail({
    to,
    subject: 'Welcome to AWLMS - Your account is verified!',
    text: `Hello ${name},

Congratulations! Your email has been successfully verified.

You can now log in to your AWLMS account to:
• Browse available job positions
• Submit applications
• Track your application status
• Complete AI-powered interviews

Access your account: ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}/login

Best regards,
AWLMS Recruitment Team`,
  });
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
};
