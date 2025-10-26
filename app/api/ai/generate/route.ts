import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { posts } from '@/db/schema/content';
import { eq, and, desc } from 'drizzle-orm';
import {
    handleAPIError,
    createAPIResponse,
    validateSession
} from '@/lib/api-utils';
import {
    generateLinkedInContent,
    analyzeUserTone
} from '@/lib/ai';
import { AIGenerationInput } from '@/lib/validations';

interface RateLimiter {
    requests: number;
    resetTime: number;
}

// Simple in-memory rate limiter (in production, use Redis)
const rateLimiters = new Map<string, RateLimiter>();

function checkRateLimit(userId: string, limit: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const userLimiter = rateLimiters.get(userId);

    if (!userLimiter || now > userLimiter.resetTime) {
        rateLimiters.set(userId, {
            requests: 1,
            resetTime: now + windowMs
        });
        return true;
    }

    if (userLimiter.requests >= limit) {
        return false;
    }

    userLimiter.requests++;
    return true;
}

// POST /api/ai/generate - Generate AI content
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        validateSession(session);

        // Rate limiting
        if (!checkRateLimit(session!.user.id, 10, 60000)) {
            return handleAPIError({
                name: 'RateLimitError',
                message: 'Too many requests. Please try again later.',
                details: { limit: 10, window: '1 minute' }
            });
        }

        const body = await request.json();
        const options: AIGenerationInput = {
            prompt: body.prompt,
            context: body.context,
            generateVariations: body.generateVariations || false,
            variationCount: Math.min(body.variationCount || 3, 5),
            useToneAnalysis: body.useToneAnalysis !== false,
        };

        if (!options.prompt?.trim()) {
            return handleAPIError({
                name: 'ValidationError',
                message: 'Prompt is required',
                details: { field: 'prompt' }
            });
        }

        if (options.prompt.length > 1000) {
            return handleAPIError({
                name: 'ValidationError',
                message: 'Prompt must be less than 1000 characters',
                details: { field: 'prompt' }
            });
        }

        // Analyze user tone if requested
        let toneAnalysis;
        if (options.useToneAnalysis) {
            toneAnalysis = await analyzeUserTone(session!.user.id);
        }

        // Generate content
        const result = await generateLinkedInContent(session!.user.id, {
            ...options,
            toneAnalysis,
            targetLength: body.targetLength,
        });

        return createAPIResponse({
            content: result.mainContent,
            variations: result.variations,
            toneMatch: result.toneMatch,
            hashtags: result.hashtags,
            toneAnalysis: toneAnalysis ? {
                formality: toneAnalysis.formality,
                enthusiasm: toneAnalysis.enthusiasm,
                expertise: toneAnalysis.expertise,
                length: toneAnalysis.length,
                style: toneAnalysis.style,
            } : undefined,
        }, 201, 'Content generated successfully');

    } catch (error) {
        return handleAPIError(error);
    }
}

// GET /api/ai/generate - Get user's tone analysis
export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        validateSession(session);

        const { searchParams } = new URL(request.url);
        const reanalyze = searchParams.get('reanalyze') === 'true';

        // Rate limiting for analysis requests
        if (!checkRateLimit(session!.user.id, 5, 300000)) {
            return handleAPIError({
                name: 'RateLimitError',
                message: 'Too many analysis requests. Please try again later.',
                details: { limit: 5, window: '5 minutes' }
            });
        }

        const toneAnalysis = await analyzeUserTone(session!.user.id);

        return createAPIResponse({
            toneAnalysis,
            userPostCount: await getUserPostCount(session!.user.id),
        });

    } catch (error) {
        return handleAPIError(error);
    }
}

/**
 * Gets the count of user's published posts
 */
async function getUserPostCount(userId: string): Promise<number> {
    try {
        const count = await db.query.posts.findMany({
            where: and(
                eq(posts.userId, userId),
                eq(posts.status, 'published')
            ),
            columns: { id: true }
        });

        return count.length;
    } catch (error) {
        return 0;
    }
}