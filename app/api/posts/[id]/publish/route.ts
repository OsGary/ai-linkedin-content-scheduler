import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { posts, linkedinAccounts } from '@/db/schema/content';
import { eq, and } from 'drizzle-orm';

// POST /api/posts/[id]/publish - Publish a post immediately
export async function POST(
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

        // Get the post and check permissions
        const post = await db.query.posts.findFirst({
            where: (posts, { and }) => and(
                eq(posts.id, params.id),
                eq(posts.userId, session.user.id)
            ),
            with: {
                linkedinAccount: true,
            },
        });

        if (!post) {
            return NextResponse.json(
                { error: 'Post not found' },
                { status: 404 }
            );
        }

        if (post.status === 'published') {
            return NextResponse.json(
                { error: 'Post is already published' },
                { status: 400 }
            );
        }

        if (!post.linkedinAccountId) {
            return NextResponse.json(
                { error: 'LinkedIn account is required to publish posts' },
                { status: 400 }
            );
        }

        // Check if LinkedIn account is connected and valid
        const linkedinAccount = await db.query.linkedinAccounts.findFirst({
            where: (linkedinAccounts, { and }) => and(
                eq(linkedinAccounts.id, post.linkedinAccountId),
                eq(linkedinAccounts.userId, session.user.id),
                eq(linkedinAccounts.isActive, true)
            ),
        });

        if (!linkedinAccount) {
            return NextResponse.json(
                { error: 'LinkedIn account is not connected or inactive' },
                { status: 400 }
            );
        }

        // In a real implementation, you would:
        // 1. Use the LinkedIn API to publish the post
        // 2. Handle API errors and retry logic
        // 3. Store the LinkedIn post ID
        // For now, we'll simulate the publishing process

        const now = new Date();
        let linkedinPostId: string | null = null;
        let errorReason: string | null = null;
        let newStatus: 'published' | 'failed' = 'published';

        try {
            // Simulate LinkedIn API call
            // In production, you would make an actual API call to LinkedIn
            const publishToLinkedIn = async (content: string, accessToken: string) => {
                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Simulate random success/failure (90% success rate)
                if (Math.random() > 0.1) {
                    return {
                        id: `linkedin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        success: true
                    };
                } else {
                    throw new Error('LinkedIn API error: Invalid permissions');
                }
            };

            const result = await publishToLinkedIn(post.content, linkedinAccount.accessToken);

            if (result.success) {
                linkedinPostId = result.id;
                newStatus = 'published';
            } else {
                throw new Error('Failed to publish to LinkedIn');
            }

        } catch (error) {
            console.error('LinkedIn publishing error:', error);
            errorReason = error instanceof Error ? error.message : 'Unknown publishing error';
            newStatus = 'failed';
        }

        // Update the post in the database
        const updatedPost = await db.update(posts)
            .set({
                status: newStatus,
                publishedAt: newStatus === 'published' ? now : null,
                linkedinPostId: linkedinPostId,
                errorReason: errorReason,
                retryCount: newStatus === 'failed' ? (post.retryCount || 0) + 1 : post.retryCount,
                updatedAt: now,
            })
            .where(and(
                eq(posts.id, params.id),
                eq(posts.userId, session.user.id)
            ))
            .returning();

        if (updatedPost.length === 0) {
            return NextResponse.json(
                { error: 'Failed to update post' },
                { status: 500 }
            );
        }

        if (newStatus === 'published') {
            return NextResponse.json({
                success: true,
                message: 'Post published successfully',
                post: updatedPost[0]
            });
        } else {
            return NextResponse.json(
                {
                    error: 'Failed to publish post',
                    details: errorReason,
                    post: updatedPost[0]
                },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error publishing post:', error);
        return NextResponse.json(
            { error: 'Failed to publish post' },
            { status: 500 }
        );
    }
}