import { NextRequest, NextResponse } from 'next/server';
import { generateStateToken, hashToken } from '@/lib/encryption';
import { generateLinkedInAuthUrl } from '@/lib/linkedin';

export async function GET() {
    try {
        // Generate a secure state token for CSRF protection
        const state = generateStateToken();

        // Store the hashed state in a cookie for verification
        const hashedState = hashToken(state);

        const response = NextResponse.redirect(generateLinkedInAuthUrl(state));

        // Set secure cookie with state token
        response.cookies.set('linkedin_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60, // 10 minutes
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('LinkedIn OAuth error:', error);
        return NextResponse.json(
            { error: 'Failed to initiate LinkedIn OAuth' },
            { status: 500 }
        );
    }
}