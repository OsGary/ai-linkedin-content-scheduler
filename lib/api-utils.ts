import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class APIError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public details?: any
    ) {
        super(message);
        this.name = 'APIError';
    }
}

export function handleAPIError(error: unknown): NextResponse {
    console.error('API Error:', error);

    // Zod validation errors
    if (error instanceof ZodError) {
        return NextResponse.json(
            {
                error: 'Validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                })),
            },
            { status: 400 }
        );
    }

    // Custom API errors
    if (error instanceof APIError) {
        return NextResponse.json(
            {
                error: error.message,
                ...(error.details && { details: error.details }),
            },
            { status: error.statusCode }
        );
    }

    // Database errors (Drizzle/Pg)
    if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
            return NextResponse.json(
                { error: 'Resource already exists' },
                { status: 409 }
            );
        }

        if (error.message.includes('foreign key')) {
            return NextResponse.json(
                { error: 'Referenced resource does not exist' },
                { status: 400 }
            );

        }

        if (error.message.includes('not found')) {
            return NextResponse.json(
                { error: 'Resource not found' },
                { status: 404 }
            );
        }
    }

    // Generic server error
    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
    );
}

export function createAPIResponse<T = any>(
    data: T,
    status: number = 200,
    message?: string
): NextResponse {
    return NextResponse.json(
        {
            success: status >= 200 && status < 300,
            ...(message && { message }),
            data,
        },
        { status }
    );
}

export function validateSession(session: any) {
    if (!session?.user?.id) {
        throw new APIError('Authentication required', 401);
    }
}

export function createPaginationParams(searchParams: URLSearchParams) {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
}

export function createPaginationResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
) {
    const totalPages = Math.ceil(total / limit);

    return {
        items,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        },
    };
}

export function sanitizeHTML(input: string): string {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
}

export function validateLinkedInContent(content: string): string[] {
    const errors: string[] = [];

    if (!content.trim()) {
        errors.push('Content cannot be empty');
    }

    if (content.length > 3000) {
        errors.push('Content exceeds LinkedIn\'s 3000 character limit');
    }

    if (content.includes('<script>') || content.includes('javascript:')) {
        errors.push('Content contains potentially unsafe elements');
    }

    // Check for common spam patterns
    const spamPatterns = [
        /click here/gi,
        /buy now/gi,
        /limited time/gi,
        /act fast/gi,
    ];

    const spamMatches = spamPatterns.filter(pattern => pattern.test(content));
    if (spamMatches.length > 2) {
        errors.push('Content appears to contain excessive promotional language');
    }

    return errors;
}

export function extractHashtags(content: string): string[] {
    const hashtagRegex = /#\w+/g;
    const matches = content.match(hashtagRegex) || [];
    return matches.map(tag => tag.toLowerCase());
}

export function extractMentions(content: string): string[] {
    const mentionRegex = /@\w+/g;
    const matches = content.match(mentionRegex) || [];
    return matches;
}

export function calculateEngagementRate(likes: number, views: number): number {
    if (views === 0) return 0;
    return Number(((likes / views) * 100).toFixed(2));
}