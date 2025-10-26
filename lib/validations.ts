import { z } from 'zod';

// Post validation schemas
export const createPostSchema = z.object({
    content: z.string()
        .min(1, 'Content is required')
        .max(3000, 'Content must be less than 3000 characters'),
    status: z.enum(['idea', 'draft', 'scheduled', 'published', 'failed'])
        .default('idea'),
    linkedinAccountId: z.string().uuid().optional(),
    scheduledAt: z.string().datetime().optional(),
    aiGenerated: z.boolean().default(false),
    aiPrompt: z.string().optional(),
    variations: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
});

export const updatePostSchema = createPostSchema.partial().omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
});

export const postQuerySchema = z.object({
    status: z.enum(['idea', 'draft', 'scheduled', 'published', 'failed']).optional(),
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
    search: z.string().optional(),
});

// User preferences validation schemas
export const toneSettingsSchema = z.object({
    formality: z.enum(['very-casual', 'casual', 'professional', 'very-formal']),
    enthusiasm: z.enum(['low', 'medium', 'high']),
    expertise: z.enum(['beginner-friendly', 'intermediate', 'expert']),
    length: z.enum(['short', 'medium', 'long']),
});

export const systemPromptsSchema = z.object({
    contentGeneration: z.string().min(1, 'Content generation prompt is required'),
    toneAnalysis: z.string().min(1, 'Tone analysis prompt is required'),
    variationGeneration: z.string().min(1, 'Variation generation prompt is required'),
});

export const userPreferencesSchema = z.object({
    toneSettings: toneSettingsSchema.optional(),
    systemPrompts: systemPromptsSchema.optional(),
    industry: z.string().max(100, 'Industry must be less than 100 characters').optional(),
    targetAudience: z.string().max(200, 'Target audience must be less than 200 characters').optional(),
    language: z.string().length(2, 'Language must be a 2-character ISO code').default('en'),
});

// LinkedIn account validation schemas
export const linkedinAccountSchema = z.object({
    linkedinUserId: z.string().min(1, 'LinkedIn user ID is required'),
    email: z.string().email('Valid email is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    profileImageUrl: z.string().url().optional(),
});

// AI generation validation schemas
export const aiGenerationSchema = z.object({
    prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt must be less than 1000 characters'),
    context: z.string().max(2000, 'Context must be less than 2000 characters').optional(),
    generateVariations: z.boolean().default(false),
    variationCount: z.number().min(1).max(5).default(3),
    useToneAnalysis: z.boolean().default(true),
});

// Post analytics validation schemas
export const postAnalyticsSchema = z.object({
    postId: z.string().uuid('Valid post ID is required'),
    views: z.number().min(0).default(0),
    likes: z.number().min(0).default(0),
    comments: z.number().min(0).default(0),
    shares: z.number().min(0).default(0),
    clicks: z.number().min(0).default(0),
    engagementRate: z.number().min(0).max(100).default(0),
});

// Export types
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostQueryInput = z.infer<typeof postQuerySchema>;
export type ToneSettings = z.infer<typeof toneSettingsSchema>;
export type SystemPrompts = z.infer<typeof systemPromptsSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
export type LinkedInAccountInput = z.infer<typeof linkedinAccountSchema>;
export type AIGenerationInput = z.infer<typeof aiGenerationSchema>;
export type PostAnalyticsInput = z.infer<typeof postAnalyticsSchema>;