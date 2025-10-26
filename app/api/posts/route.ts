import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { posts } from '@/db/schema/content';
import { eq, and, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
    handleAPIError,
    createAPIResponse,
    validateSession,
    createPaginationParams,
    validateLinkedInContent
} from '@/lib/api-utils';
import { CreatePostInput, PostQueryInput } from '@/lib/validations';

// GET /api/posts - Fetch user's posts
export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        validateSession(session);

        const { searchParams } = new URL(request.url);
        const query: PostQueryInput = {
            status: searchParams.get('status') as any,
            limit: parseInt(searchParams.get('limit') || '50'),
            offset: parseInt(searchParams.get('offset') || '0'),
        };

        // Build query conditions
        const whereConditions = [eq(posts.userId, session!.user.id)];

        if (query.status) {
            whereConditions.push(eq(posts.status, query.status));
        }

        const userPosts = await db.query.posts.findMany({
            where: (posts, { and }) => and(...whereConditions),
            orderBy: [desc(posts.updatedAt)],
            limit: query.limit,
            offset: query.offset,
            with: {
                linkedinAccount: {
                    columns: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        // Remove sensitive data from response
        const safePosts = userPosts.map(post => ({
            id: post.id,
            content: post.content,
            status: post.status,
            linkedinAccountId: post.linkedinAccountId,
            linkedinAccount: post.linkedinAccount,
            scheduledAt: post.scheduledAt,
            publishedAt: post.publishedAt,
            linkedinPostId: post.linkedinPostId,
            aiGenerated: post.aiGenerated,
            aiPrompt: post.aiPrompt,
            variations: post.variations,
            errorReason: post.errorReason,
            retryCount: post.retryCount,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
        }));

        return createAPIResponse({ posts: safePosts });
    } catch (error) {
        return handleAPIError(error);
    }
}

// POST /api/posts - Create a new post
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        validateSession(session);

        const body = await request.json();
        const validatedData: CreatePostInput = body;

        // Validate LinkedIn content
        const contentErrors = validateLinkedInContent(validatedData.content);
        if (contentErrors.length > 0) {
            return handleAPIError({
                name: 'ValidationError',
                message: contentErrors.join(', '),
                details: { field: 'content', errors: contentErrors }
            });
        }

        const now = new Date();

        // Validate scheduled date if provided
        if (validatedData.scheduledAt) {
            const scheduledDate = new Date(validatedData.scheduledAt);
            if (scheduledDate <= now) {
                return handleAPIError({
                    name: 'ValidationError',
                    message: 'Scheduled date must be in the future',
                    details: { field: 'scheduledAt' }
                });
            }
        }

        // If status is scheduled, scheduledAt is required
        if (validatedData.status === 'scheduled' && !validatedData.scheduledAt) {
            return handleAPIError({
                name: 'ValidationError',
                message: 'Scheduled date is required when status is scheduled',
                details: { field: 'scheduledAt' }
            });
        }

        const newPost = await db.insert(posts).values({
            id: uuidv4(),
            userId: session!.user.id,
            content: validatedData.content,
            status: validatedData.status,
            linkedinAccountId: validatedData.linkedinAccountId,
            scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
            aiGenerated: validatedData.aiGenerated || false,
            aiPrompt: validatedData.aiPrompt,
            variations: validatedData.variations || null,
            createdAt: now,
            updatedAt: now,
        }).returning();

        return createAPIResponse({ post: newPost[0] }, 201, 'Post created successfully');
    } catch (error) {
        return handleAPIError(error);
    }
}