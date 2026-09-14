import { pgTable, text, serial, timestamp, boolean, integer, date } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().unique(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const userStore = pgTable('user_store', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  storeId: text('store_id').notNull(),
  storeName: text('store_name').notNull(),
  zipCode: text('zip_code').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const availableItems = pgTable('available_items', {
  id: serial('id').primaryKey(),
  storeId: text('store_id').notNull(),
  department: text('department').notNull(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  imageUrl: text('image_url'),
  isBogo: boolean('is_bogo').default(false),
  salePrice: text('sale_price'),
  description: text('description'),
  fetchedAt: timestamp('fetched_at').defaultNow(),
});

export const watchlistItems = pgTable('watchlist_items', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  availableItemId: integer('available_item_id').references(() => availableItems.id),
  // Stable product reference for specific_item alerts. The old
  // availableItemId points at available_items rows that the weekly cron
  // deletes + re-inserts, so it can't survive a refresh — productId can.
  productId: text('product_id'),
  productName: text('product_name'),
  keywords: text('keywords'),
  department: text('department'),
  alertType: text('alert_type').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notificationLog = pgTable('notification_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  watchlistItemId: integer('watchlist_item_id'),
  matchedItemId: integer('matched_item_id'),
  sentAt: timestamp('sent_at').defaultNow(),
  status: text('status'),
});

export type UserStore = typeof userStore.$inferSelect;
export type AvailableItem = typeof availableItems.$inferSelect;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type NotificationLog = typeof notificationLog.$inferSelect;
