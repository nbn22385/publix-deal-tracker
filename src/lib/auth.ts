import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sendEmail } from './mailer';
import { db } from './db';
import { buildAuthOrigins } from './auth-origins';

const { baseURL, trustedOrigins } = buildAuthOrigins({
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_ENV: process.env.VERCEL_ENV,
});

if (!baseURL) {
  console.error(
    'BETTER_AUTH_URL is missing or invalid (expected e.g. https://your-app.vercel.app). Auth origin checks may fail.',
  );
}

export const auth = betterAuth({
  ...(baseURL ? { baseURL } : {}),
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your Publix Deal Tracker password',
        html: `
          <p>You requested a password reset for Publix Deal Tracker.</p>
          <p><a href="${url}">Click here to reset your password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        `,
      });
    },
  },
  trustedOrigins,
});
