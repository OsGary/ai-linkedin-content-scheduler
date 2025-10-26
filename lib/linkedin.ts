import { encrypt, decrypt } from './encryption';

// LinkedIn OAuth configuration
const LINKEDIN_CONFIG = {
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/linkedin/callback',
    scopes: [
        'r_liteprofile', // Basic profile
        'r_emailaddress', // Email address
        'w_member_social', // Post to groups
        'w_share', // Share content
        'rw_organization_admin', // Organization admin
    ].join(' '),
};

export interface LinkedInProfile {
    id: string;
    localizedFirstName: string;
    localizedLastName: string;
    profilePicture?: {
        displayImage: string;
    };
    emailAddress?: string;
}

export interface LinkedInTokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    scope: string;
}

/**
 * Generates the LinkedIn OAuth authorization URL
 */
export function generateLinkedInAuthUrl(state: string): string {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: LINKEDIN_CONFIG.clientId,
        redirect_uri: LINKEDIN_CONFIG.redirectUri,
        scope: LINKEDIN_CONFIG.scopes,
        state,
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

/**
 * Exchanges authorization code for access tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<LinkedInTokenResponse> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: LINKEDIN_CONFIG.redirectUri,
            client_id: LINKEDIN_CONFIG.clientId,
            client_secret: LINKEDIN_CONFIG.clientSecret,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LinkedIn token exchange failed: ${error}`);
    }

    return response.json();
}

/**
 * Gets LinkedIn user profile information
 */
export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
    // Get basic profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!profileResponse.ok) {
        const error = await profileResponse.text();
        throw new Error(`LinkedIn profile fetch failed: ${error}`);
    }

    const profile = await profileResponse.json();

    // Get email address
    const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    let emailAddress;
    if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        emailAddress = emailData.elements?.[0]?.handle~?.emailAddress;
    }

    return {
        id: profile.id,
        localizedFirstName: profile.localizedFirstName,
        localizedLastName: profile.localizedLastName,
        profilePicture: profile.profilePicture,
        emailAddress,
    };
}

/**
 * Publishes a post to LinkedIn
 */
export async function publishToLinkedIn(
    accessToken: string,
    content: string,
    authorId: string
): Promise<string> {
    const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            author: `urn:li:person:${authorId}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: {
                        text: content,
                    },
                    shareMediaCategory: 'NONE',
                },
            },
            visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
        }),
    });

    if (!postResponse.ok) {
        const error = await postResponse.text();
        throw new Error(`LinkedIn post publishing failed: ${error}`);
    }

    const postData = await postResponse.json();
    return postData.id;
}

/**
 * Refreshes an expired LinkedIn access token
 */
export async function refreshLinkedInToken(refreshToken: string): Promise<LinkedInTokenResponse> {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: LINKEDIN_CONFIG.clientId,
            client_secret: LINKEDIN_CONFIG.clientSecret,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LinkedIn token refresh failed: ${error}`);
    }

    return response.json();
}

/**
 * Checks if a token is expired or will expire within the next 5 minutes
 */
export function isTokenExpired(expiresAt?: Date | null): boolean {
    if (!expiresAt) return true;
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expiresAt < fiveMinutesFromNow;
}

/**
 * Encrypts tokens before storing in database
 */
export function encryptTokens(tokens: LinkedInTokenResponse) {
    return {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    };
}

/**
 * Decrypts tokens after retrieving from database
 */
export function decryptTokens(encryptedTokens: {
    accessToken?: string | null;
    refreshToken?: string | null;
}): { accessToken: string; refreshToken?: string } {
    return {
        accessToken: encryptedTokens.accessToken ? decrypt(encryptedTokens.accessToken) : '',
        refreshToken: encryptedTokens.refreshToken ? decrypt(encryptedTokens.refreshToken) : undefined,
    };
}