import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { linkedinAccounts } from '@/db/schema/content';
import { exchangeCodeForTokens, getLinkedInProfile, encryptTokens, decryptTokens } from '@/lib/linkedin';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors
        if (error) {
            console.error('LinkedIn OAuth error:', error, errorDescription);
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=linkedin_oauth_failed&message=${encodeURIComponent(errorDescription || error)}`
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=linkedin_oauth_missing_params`
            );
        }

        // Verify state token to prevent CSRF
        const storedState = request.cookies.get('linkedin_oauth_state')?.value;
        if (!storedState || storedState !== state) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=linkedin_oauth_invalid_state`
            );
        }

        // Clear the state cookie
        const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?success=linkedin_connected`);

        // Get authenticated user
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (!session?.user?.id) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-in?error=authentication_required`
            );
        }

        // Exchange authorization code for tokens
        const tokenResponse = await exchangeCodeForTokens(code);

        // Get LinkedIn profile information
        const profile = await getLinkedInProfile(tokenResponse.access_token);

        // Encrypt tokens before storing
        const encryptedTokens = encryptTokens(tokenResponse);

        // Calculate token expiry dates
        const now = new Date();
        const accessTokenExpiresAt = new Date(now.getTime() + tokenResponse.expires_in * 1000);
        const refreshTokenExpiresAt = tokenResponse.refresh_token_expires_in
            ? new Date(now.getTime() + tokenResponse.refresh_token_expires_in * 1000)
            : null;

        // Check if LinkedIn account is already connected
        const existingAccount = await db.query.linkedinAccounts.findFirst({
            where: (accounts, { eq }) => eq(accounts.linkedinUserId, profile.id),
        });

        if (existingAccount) {
            // Update existing account
            await db.update(linkedinAccounts)
                .set({
                    email: profile.emailAddress || '',
                    firstName: profile.localizedFirstName,
                    lastName: profile.localizedLastName,
                    profileImageUrl: profile.profilePicture?.displayImage || null,
                    accessToken: encryptedTokens.accessToken,
                    refreshToken: encryptedTokens.refreshToken,
                    accessTokenExpiresAt,
                    refreshTokenExpiresAt,
                    scope: tokenResponse.scope,
                    isActive: true,
                    lastTokenRefresh: now,
                    updatedAt: now,
                })
                .where((accounts) => eq(linkedinAccounts.id, existingAccount.id));
        } else {
            // Create new LinkedIn account record
            await db.insert(linkedinAccounts).values({
                id: uuidv4(),
                userId: session.user.id,
                linkedinUserId: profile.id,
                email: profile.emailAddress || '',
                firstName: profile.localizedFirstName,
                lastName: profile.localizedLastName,
                profileImageUrl: profile.profilePicture?.displayImage || null,
                accessToken: encryptedTokens.accessToken,
                refreshToken: encryptedTokens.refreshToken,
                accessTokenExpiresAt,
                refreshTokenExpiresAt,
                scope: tokenResponse.scope,
                isActive: true,
                lastTokenRefresh: now,
                createdAt: now,
                updatedAt: now,
            });
        }

        // Clear the state cookie
        response.cookies.delete('linkedin_oauth_state');

        return response;
    } catch (error) {
        console.error('LinkedIn callback error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?error=linkedin_callback_failed&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
        );
    }
}