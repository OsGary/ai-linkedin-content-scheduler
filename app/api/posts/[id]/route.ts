import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { posts } from '@/db/schema/content';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updatePostSchema = z.object({
    content: z.string().min(1).max(3000).optional(),
    status: z.enum(['idea', 'draft', 'scheduled', 'published', 'failed']).optional(),
    linkedinAccountId: z.string().uuid().optional(),
    scheduledAt: z.string().datetime().optional(),
    aiGenerated: z.boolean().optional(),
    aiPrompt: z.string().optional(),
    variations: z.array(z.string()).optional(),
});

// GET /api/posts/[id] - Fetch a specific post
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const post = await db.query.posts.findFirst({
            where: (posts, { and }) => and(
                eq(posts.id, params.id),
                eq(posts.userId, session.user.id)
            ),
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

        if (!post) {
            return NextResponse.json(
                { error: 'Post not found' },
                { status: 404 }
            );
        }

        // Remove sensitive data
        const safePost = {
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
            metadata: post.metadata,
            errorReason: post.errorReason,
            retryCount: post.retryCount,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
        };

        return NextResponse.json({ post: safePost });
    } catch (error) {
        console.error('Error fetching post:', error);
        return NextResponse.json(
            { error: 'Failed to fetch post' },
            { status: 500 }
        );
    }
}

// PUT /api/posts/[id] - Update a specific post
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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
        const validatedData = updatePostSchema.parse(body);

        const now = new Date();

        // Validate scheduled date if provided
        if (validatedData.scheduledAt) {
            const scheduledDate = new Date(validatedData.scheduledAt);
            if (scheduledDate <= now) {
                return NextResponse.json(
                    { error: 'Scheduled date must be in the future' },
                    { status: 400 }
                );
            }
        }

        // If status is being changed to scheduled, scheduledAt is required
        if (validatedData.status === 'scheduled' && !validatedData.scheduledAt && !validatedData.scheduledAt?.length) {
            // Try to get existing scheduledAt from database
            const existingPost = await db.query.posts.findFirst({
                where: (posts, { and }) => and(
                    eq(posts.id, params.id),
                    eq(posts.userId, session.user.id)
                ),
                columns: { scheduledAt: true }
            });

            if (!existingPost?.scheduledAt) {
                return NextResponse.json(
                    { error: 'Scheduled date is required when status is scheduled' },
                    { status: 400 }
                );
            }
        }

        const updatedPost = await db.update(posts)
            .set({
                ...validatedData,
                scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined,
                updatedAt: now,
            })
            .where(and(
                eq(posts.id, params.id),
                eq(posts.userId, session.user.id)
            ))
            .returning();

        if (updatedPost.length === 0) {
            return NextResponse.json(
                { error: 'Post not found or you do not have permission to update it' },
                { status: 404 }
            );
        }

        return NextResponse.json({ post: updatedPost[0] });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Error updating post:', error);
        return NextResponse.json(
            { error: 'Failed to update post' },
            { status: 500 }
        );
    }
}

// DELETE /api/posts/[id] - Delete a specific post
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        // Check if post exists and belongs to user
        const existingPost = await db.query.posts.findFirst({
            where: (posts, { and }) => and(
                eq(posts.id, params.id),
                eq(posts.userId, session.user.id)
            ),
            columns: { id: true, status: true, linkedinPostId: true }
        });

        if (!existingPost) {
            return NextResponse.json(
                { error: 'Post not found' },
                { status: 404 }
            );
        }

        // Don't allow deletion of published posts
        if (existingPost.status === 'published') {
            return NextResponse.json(
                { error: 'Cannot delete published posts' },
                { status: 400 }
            );
        }

        const deletedPost = await db.delete(posts)
            .where(and(
                eq(posts.id, params.id),
                eq(posts.userId, session.user.id)
            ))
            .returning({ id: posts.id });

        if (deletedPost.length === 0) {
            return NextResponse.json(
                { error: 'Post not found or you do not have permission to delete it' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Post deleted successfully',
            id: deletedPost[0].id
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json(
            { error: 'Failed to delete post' },
            { status: 500 }
        );
    }
}