import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { userPreferences } from '@/db/schema/content';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const userPreferencesSchema = z.object({
    toneSettings: z.object({
        formality: z.enum(['very-casual', 'casual', 'professional', 'very-formal']).default('professional'),
        enthusiasm: z.enum(['low', 'medium', 'high']).default('medium'),
        expertise: z.enum(['beginner-friendly', 'intermediate', 'expert']).default('intermediate'),
        length: z.enum(['short', 'medium', 'long']).default('medium'),
    }).optional(),
    systemPrompts: z.object({
        contentGeneration: z.string().default('You are a professional LinkedIn content writer. Create engaging content based on the user\'s request while maintaining their established tone and style.'),
        toneAnalysis: z.string().default('Analyze the LinkedIn posts to identify the user\'s writing style, tone, and common themes. Focus on formality level, enthusiasm, expertise level, and typical post length.'),
        variationGeneration: z.string().default('Create multiple variations of this LinkedIn post while maintaining the core message and user\'s established tone. Each variation should offer a slightly different angle or approach.'),
    }).optional(),
    industry: z.string().optional(),
    targetAudience: z.string().optional(),
    language: z.string().length(2).default('en'),
});

// GET /api/user/preferences - Fetch user preferences
export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const preferences = await db.query.userPreferences.findFirst({
            where: eq(userPreferences.userId, session.user.id),
        });

        // Return default preferences if none exist
        const defaultPreferences = {
            toneSettings: {
                formality: 'professional' as const,
                enthusiasm: 'medium' as const,
                expertise: 'intermediate' as const,
                length: 'medium' as const,
            },
            systemPrompts: {
                contentGeneration: 'You are a professional LinkedIn content writer. Create engaging content based on the user\'s request while maintaining their established tone and style.',
                toneAnalysis: 'Analyze the LinkedIn posts to identify the user\'s writing style, tone, and common themes. Focus on formality level, enthusiasm, expertise level, and typical post length.',
                variationGeneration: 'Create multiple variations of this LinkedIn post while maintaining the core message and user\'s established tone. Each variation should offer a slightly different angle or approach.',
            },
            industry: null,
            targetAudience: null,
            language: 'en',
        };

        return NextResponse.json({
            preferences: preferences || defaultPreferences
        });
    } catch (error) {
        console.error('Error fetching user preferences:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user preferences' },
            { status: 500 }
        );
    }
}

// PUT /api/user/preferences - Update user preferences
export async function PUT(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validatedData = userPreferencesSchema.parse(body);

        const now = new Date();

        // Check if preferences exist for user
        const existingPreferences = await db.query.userPreferences.findFirst({
            where: eq(userPreferences.userId, session.user.id),
        });

        let updatedPreferences;

        if (existingPreferences) {
            // Update existing preferences
            updatedPreferences = await db.update(userPreferences)
                .set({
                    ...validatedData,
                    updatedAt: now,
                })
                .where(eq(userPreferences.userId, session.user.id))
                .returning();
        } else {
            // Create new preferences
            updatedPreferences = await db.insert(userPreferences).values({
                id: uuidv4(),
                userId: session.user.id,
                toneSettings: validatedData.toneSettings || {
                    formality: 'professional',
                    enthusiasm: 'medium',
                    expertise: 'intermediate',
                    length: 'medium',
                },
                systemPrompts: validatedData.systemPrompts || {
                    contentGeneration: 'You are a professional LinkedIn content writer. Create engaging content based on the user\'s request while maintaining their established tone and style.',
                    toneAnalysis: 'Analyze the LinkedIn posts to identify the user\'s writing style, tone, and common themes. Focus on formality level, enthusiasm, expertise level, and typical post length.',
                    variationGeneration: 'Create multiple variations of this LinkedIn post while maintaining the core message and user\'s established tone. Each variation should offer a slightly different angle or approach.',
                },
                industry: validatedData.industry || null,
                targetAudience: validatedData.targetAudience || null,
                language: validatedData.language || 'en',
                createdAt: now,
                updatedAt: now,
            }).returning();
        }

        return NextResponse.json({
            preferences: updatedPreferences[0],
            message: 'User preferences updated successfully'
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error updating user preferences:', error);
        return NextResponse.json(
            { error: 'Failed to update user preferences' },
            { status: 500 }
        );
    }
}