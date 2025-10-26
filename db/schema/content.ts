import {
    pgTable,
    text,
    timestamp,
    boolean,
    varchar,
    jsonb
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// LinkedIn accounts table for storing OAuth tokens and account info
export const linkedinAccounts = pgTable("linkedin_accounts", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    linkedinUserId: text("linkedin_user_id").notNull().unique(),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    profileImageUrl: text("profile_image_url"),
    accessToken: text("access_token").notNull(), // Will be encrypted
    refreshToken: text("refresh_token"), // Will be encrypted
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    isActive: boolean("is_active")
        .$defaultFn(() => true)
        .notNull(),
    lastTokenRefresh: timestamp("last_token_refresh"),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

// Posts table for managing LinkedIn content
export const posts = pgTable("posts", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    linkedinAccountId: text("linkedin_account_id")
        .references(() => linkedinAccounts.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    status: varchar("status", { enum: ["idea", "draft", "scheduled", "published", "failed"] })
        .$defaultFn(() => "idea")
        .notNull(),
    scheduledAt: timestamp("scheduled_at"),
    publishedAt: timestamp("published_at"),
    linkedinPostId: text("linkedin_post_id"), // ID of the published post on LinkedIn
    aiGenerated: boolean("ai_generated")
        .$defaultFn(() => false)
        .notNull(),
    aiPrompt: text("ai_prompt"), // The prompt used to generate this post
    variations: jsonb("variations"), // Store multiple variations of the same post
    metadata: jsonb("metadata"), // Additional metadata like engagement metrics
    errorReason: text("error_reason"), // If publishing failed, store the reason
    retryCount: varchar("retry_count")
        .$defaultFn(() => 0)
        .notNull(),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

// User preferences for AI tone and system prompts
export const userPreferences = pgTable("user_preferences", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" })
        .unique(),
    toneSettings: jsonb("tone_settings").$type<{
        formality: "very-casual" | "casual" | "professional" | "very-formal";
        enthusiasm: "low" | "medium" | "high";
        expertise: "beginner-friendly" | "intermediate" | "expert";
        length: "short" | "medium" | "long";
    }>(),
    systemPrompts: jsonb("system_prompts").$type<{
        contentGeneration: string;
        toneAnalysis: string;
        variationGeneration: string;
    }>(),
    industry: text("industry"),
    targetAudience: text("target_audience"),
    language: varchar("language", { length: 2 }).$defaultFn(() => "en"),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

// Post analytics for tracking engagement
export const postAnalytics = pgTable("post_analytics", {
    id: text("id").primaryKey(),
    postId: text("post_id")
        .notNull()
        .references(() => posts.id, { onDelete: "cascade" }),
    views: varchar("views").$defaultFn(() => 0).notNull(),
    likes: varchar("likes").$defaultFn(() => 0).notNull(),
    comments: varchar("comments").$defaultFn(() => 0).notNull(),
    shares: varchar("shares").$defaultFn(() => 0).notNull(),
    clicks: varchar("clicks").$defaultFn(() => 0).notNull(),
    engagementRate: varchar("engagement_rate").$defaultFn(() => 0).notNull(),
    lastUpdated: timestamp("last_updated")
        .$defaultFn(() => new Date())
        .notNull(),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
});