import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/** True when SMTP credentials are present; otherwise sends are skipped. */
export function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Sender identity. Set EMAIL_FROM to a full mailbox, e.g.
 * `Publix Deal Tracker <deals@example.com>`. Defaults to the SMTP
 * account itself (Gmail rewrites unmatched From addresses anyway).
 */
export function getSender(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  const user = process.env.SMTP_USER || 'noreply@localhost';
  return `Publix Deal Tracker <${user}>`;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }
  return transporter;
}

/** Sends an email, or logs and skips when SMTP is not configured. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!isMailerConfigured()) {
    console.error('SMTP_USER/SMTP_PASS are not set — skipping email');
    return;
  }
  await getTransporter().sendMail({ from: getSender(), ...message });
}
