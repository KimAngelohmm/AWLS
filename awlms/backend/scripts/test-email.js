/**
 * Verify Outlook/Microsoft 365 SMTP and send a test interview invite.
 * Usage: node scripts/test-email.js [recipient@email.com]
 */
require('dotenv').config();
const {
  verifyEmailConfig,
  sendInterviewInvitation,
} = require('../src/services/emailService');

async function main() {
  const to = process.argv[2] || process.env.EMAIL_USER;
  if (!to) {
    console.error('Usage: node scripts/test-email.js recipient@example.com');
    process.exit(1);
  }
  if (!process.env.EMAIL_PASS) {
    console.error(
      'EMAIL_PASS is empty in backend/.env.\n' +
        'For Outlook / DYCI: use your Microsoft 365 password, or create an app password at\n' +
        'https://account.microsoft.com/security (if your school uses multi-factor auth).\n' +
        'SMTP must be enabled for your mailbox (some schools disable it — ask IT if login fails).'
    );
    process.exit(1);
  }

  console.log('Verifying SMTP connection…');
  const info = await verifyEmailConfig();
  console.log('SMTP OK:', info.host, 'as', info.user, `(${info.provider})`);

  const result = await sendInterviewInvitation({
    to,
    fullName: 'Test Applicant',
    jobTitle: 'Assistant of HR Personnel',
    interviewToken: 'test-token-replace-with-real',
  });

  if (result.sent) {
    console.log(`Test interview invitation sent to ${to}`);
  } else {
    console.error('Send failed:', result.reason);
    console.error('Check backend/.email-outbox/ for a saved copy (dev fallback).');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  if (/535|Authentication|Invalid login/i.test(err.message)) {
    console.error(
      '\nTip: Wrong password, or SMTP AUTH disabled for your DYCI account. Try an app password or contact school IT.'
    );
  }
  process.exit(1);
});
