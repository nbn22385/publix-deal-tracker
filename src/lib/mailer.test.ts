import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: vi.fn() })) },
}));

import nodemailer from 'nodemailer';
import { getSender, isMailerConfigured, sendEmail } from './mailer';

const OLD_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...OLD_ENV };
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.EMAIL_FROM;
});

describe('isMailerConfigured', () => {
  it('is false without credentials', () => {
    expect(isMailerConfigured()).toBe(false);
  });

  it('is true with user + app password', () => {
    process.env.SMTP_USER = 'me@gmail.com';
    process.env.SMTP_PASS = 'xxxx xxxx xxxx xxxx';
    expect(isMailerConfigured()).toBe(true);
  });
});

describe('getSender', () => {
  it('prefers EMAIL_FROM when set', () => {
    process.env.EMAIL_FROM = 'Publix Deal Tracker <deals@example.com>';
    expect(getSender()).toBe('Publix Deal Tracker <deals@example.com>');
  });

  it('falls back to the SMTP account', () => {
    process.env.SMTP_USER = 'me@gmail.com';
    expect(getSender()).toBe('Publix Deal Tracker <me@gmail.com>');
  });
});

describe('sendEmail', () => {
  it('skips without touching SMTP when unconfigured', async () => {
    await sendEmail({ to: 'a@b.c', subject: 's', html: '<p>h</p>' });
    expect(vi.mocked(nodemailer.createTransport)).not.toHaveBeenCalled();
  });

  it('sends via the transporter when configured', async () => {
    process.env.SMTP_USER = 'me@gmail.com';
    process.env.SMTP_PASS = 'xxxx xxxx xxxx xxxx';
    await sendEmail({ to: 'a@b.c', subject: 's', html: '<p>h</p>' });
    const transport = vi.mocked(nodemailer.createTransport).mock.results[0]?.value;
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.c', subject: 's' }),
    );
  });
});
