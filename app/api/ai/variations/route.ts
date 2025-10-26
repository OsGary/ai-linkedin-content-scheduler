import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { posts, userPreferences } from '@/db/schema/content';
import { eq, and } from 'drizzle-orm';
import {
    handleAPIError,
    createAPIResponse,
    validateSession
} from '@/lib/api-utils';
import { generateVariations, analyzeUserTone } from '@/lib/ai';
import { z } from 'zod';

const generateVariationsSchema = z.object({
    postId: z.string().uuid('Valid post ID is required'),
    count: z.number().min(1).max(5).default(3),
    content: z.string().optional(), // If provided, use this instead of fetching from database
});

interface RateLimiter {
    requests: number;
    resetTime: number;
}

const rateLimiters = new Map<string, RateLimiter>();

function checkRateLimit(userId: string, limit: number = 5, windowMs: number = 300000): boolean {
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

// POST /api/ai/variations - Generate variations of a post
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        validateSession(session);

        // Rate limiting
        if (!checkRateLimit(session!.user.id, 5, 300000)) {
            return handleAPIError({
                name: 'RateLimitError',
                message: 'Too many requests. Please try again later.',
                details: { limit: 5, window: '5 minutes' }
            });
        }

        const body = await request.json();
        const validatedData = generateVariationsSchema.parse(body);

        let content: string;
        let userId: string;

        // Get content from database if not provided
        if (validatedData.content) {
            content = validatedData.content;
            userId = session!.user.id;
        } else {
            // Fetch the post from database
            const post = await db.query.posts.findFirst({
                where: and(
                    eq(posts.id, validatedData.postId),
                    eq(posts.userId, session!.user.id)
                ),
                columns: {
                    content: true,
                    userId: true,
                },
            });

            if (!post) {
                return handleAPIError({
                    name: 'NotFoundError',
                    message: 'Post not found or you do not have permission to access it'
                });
            }

            content = post.content;
            userId = post.userId;
        }

        // Analyze user tone
        const toneAnalysis = await analyzeUserTone(userId);

        // Generate variations
        const variations = await generateVariations(
            content,
            toneAnalysis,
            validatedData.count
        );

        return createAPIResponse({
            variations,
            originalContent: content,
            toneAnalysis: {
                formality: toneAnalysis.formality,
                enthusiasm: toneAnalysis.enthusiasm,
                expertise: toneAnalysis.expertise,
                length: toneAnalysis.length,
                style: toneAnalysis.style,
            },
        }, 201, 'Variations generated successfully');

    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleAPIError(error);
        }
        return handleAPIError(error);
    }
}