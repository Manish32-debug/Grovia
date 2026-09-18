import { env, isProd } from '../../config/env.js';
import { logger } from '../../config/logger.js';

/**
 * Development transport. Phase 12 swaps the body of `send` for a Resend call;
 * every caller already goes through this interface, so nothing else changes.
 *
 * In development the link is logged at info level — that is how you complete
 * email verification locally without an inbox.
 */
interface Mail {
  to: string;
  subject: string;
  text: string;
}

async function send(mail: Mail): Promise<void> {
  if (isProd) {
    logger.warn({ to: mail.to, subject: mail.subject }, 'email transport not configured');
    return;
  }
  logger.info({ to: mail.to, subject: mail.subject }, `\n${mail.text}\n`);
}

export const mailer = {
  async verifyEmail(to: string, name: string, token: string) {
    const url = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    await send({
      to,
      subject: 'Confirm your Grovia email',
      text: `Hi ${name}, confirm your email to start ordering:\n${url}\n\nThe link works for 24 hours.`,
    });
  },

  async resetPassword(to: string, name: string, token: string) {
    const url = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    await send({
      to,
      subject: 'Reset your Grovia password',
      text: `Hi ${name}, set a new password here:\n${url}\n\nThe link works for 30 minutes. If you did not ask for this, ignore it — nothing has changed.`,
    });
  },

  async passwordChanged(to: string, name: string) {
    await send({
      to,
      subject: 'Your Grovia password was changed',
      text: `Hi ${name}, your password was just changed and every signed-in device was signed out. If this was not you, reset your password now.`,
    });
  },
};
