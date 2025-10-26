import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { linkedinAccounts } from '@/db/schema/content';
import { eq, and } from 'drizzle-orm';

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

        const accounts = await db.query.linkedinAccounts.findMany({
            where: (accounts) => eq(accounts.userId, session.user.id),
            orderBy: (accounts) => accounts.createdAt,
        });

        // Remove sensitive data from response
        const safeAccounts = accounts.map(account => ({
            id: account.id,
            linkedinUserId: account.linkedinUserId,
            email: account.email,
            firstName: account.firstName,
            lastName: account.lastName,
            profileImageUrl: account.profileImageUrl,
            isActive: account.isActive,
            lastTokenRefresh: account.lastTokenRefresh,
            accessTokenExpiresAt: account.accessTokenExpiresAt,
            createdAt: account.createdAt,
        }));

        return NextResponse.json({ accounts: safeAccounts });
    } catch (error) {
        console.error('Error fetching LinkedIn accounts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch LinkedIn accounts' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');

        if (!accountId) {
            return NextResponse.json(
                { error: 'Account ID is required' },
                { status: 400 }
            );
        }

        // Delete the LinkedIn account
        const deleteResult = await db.delete(linkedinAccounts)
            .where(and(
                eq(linkedinAccounts.id, accountId),
                eq(linkedinAccounts.userId, session.user.id)
            ))
            .returning({ id: linkedinAccounts.id });

        if (deleteResult.length === 0) {
            return NextResponse.json(
                { error: 'Account not found or you do not have permission to delete it' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: 'LinkedIn account disconnected successfully' });
    } catch (error) {
        console.error('Error disconnecting LinkedIn account:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect LinkedIn account' },
            { status: 500 }
        );
    }
}