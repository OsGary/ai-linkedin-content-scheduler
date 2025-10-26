import OpenAI from 'openai';
import { db } from '@/db';
import { posts, userPreferences } from '@/db/schema/content';
import { eq, and, desc, gt } from 'drizzle-orm';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface ToneAnalysis {
    formality: 'very-casual' | 'casual' | 'professional' | 'very-formal';
    enthusiasm: 'low' | 'medium' | 'high';
    expertise: 'beginner-friendly' | 'intermediate' | 'expert';
    length: 'short' | 'medium' | 'long';
    style: string;
    commonThemes: string[];
    hashtags: string[];
}

export interface ContentGenerationOptions {
    prompt: string;
    context?: string;
    toneAnalysis?: ToneAnalysis;
    userPreferences?: any;
    generateVariations?: boolean;
    variationCount?: number;
    targetLength?: 'short' | 'medium' | 'long';
}

export interface GeneratedContent {
    mainContent: string;
    variations?: string[];
    toneMatch: number; // 0-1 score of how well it matches user's tone
    hashtags: string[];
    suggestedImprovements?: string[];
}

/**
 * Analyzes user's writing style from their existing posts
 */
export async function analyzeUserTone(userId: string): Promise<ToneAnalysis> {
    try {
        // Get user's recent published posts for analysis
        const userPosts = await db.query.posts.findMany({
            where: and(
                eq(posts.userId, userId),
                eq(posts.status, 'published')
            ),
            orderBy: [desc(posts.publishedAt)],
            limit: Math.min(20, 100), // Analyze up to 20 posts, max 100 total
            columns: {
                content: true,
                createdAt: true,
            },
        });

        if (userPosts.length === 0) {
            // Return default tone for new users
            return {
                formality: 'professional',
                enthusiasm: 'medium',
                expertise: 'intermediate',
                length: 'medium',
                style: 'Professional and informative',
                commonThemes: [],
                hashtags: [],
            };
        }

        // Combine post content for analysis
        const combinedContent = userPosts
            .map(post => post.content)
            .join('\n\n')
            .substring(0, 8000); // Limit to avoid token limits

        const analysisPrompt = `
Analyze the writing style of these LinkedIn posts and provide a detailed analysis:

${combinedContent}

Please analyze and respond with a JSON object containing:
1. formality: "very-casual", "casual", "professional", or "very-formal"
2. enthusiasm: "low", "medium", or "high"
3. expertise: "beginner-friendly", "intermediate", or "expert"
4. length: "short", "medium", or "long" (based on typical post length)
5. style: A brief description of their writing style
6. commonThemes: Array of 3-5 common topics or themes
7. hashtags: Array of frequently used hashtag patterns

Consider factors like:
- Language formality and vocabulary choice
- Use of emojis and expressions
- Technical depth and terminology
- Post structure and length patterns
- Recurring topics or themes
- Hashtag usage patterns
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert at analyzing LinkedIn writing styles and content patterns. Provide objective, accurate analysis in the requested JSON format."
                },
                {
                    role: "user",
                    content: analysisPrompt
                }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
        });

        const analysis = JSON.parse(completion.choices[0].message.content || '{}');

        // Validate and clean the response
        return {
            formality: ['very-casual', 'casual', 'professional', 'very-formal'].includes(analysis.formality)
                ? analysis.formality
                : 'professional',
            enthusiasm: ['low', 'medium', 'high'].includes(analysis.enthusiasm)
                ? analysis.enthusiasm
                : 'medium',
            expertise: ['beginner-friendly', 'intermediate', 'expert'].includes(analysis.expertise)
                ? analysis.expertise
                : 'intermediate',
            length: ['short', 'medium', 'long'].includes(analysis.length)
                ? analysis.length
                : 'medium',
            style: analysis.style || 'Professional and informative',
            commonThemes: Array.isArray(analysis.commonThemes) ? analysis.commonThemes.slice(0, 5) : [],
            hashtags: Array.isArray(analysis.hashtags) ? analysis.hashtags.slice(0, 10) : [],
        };
    } catch (error) {
        console.error('Error analyzing user tone:', error);
        // Return default tone on error
        return {
            formality: 'professional',
            enthusiasm: 'medium',
            expertise: 'intermediate',
            length: 'medium',
            style: 'Professional and informative',
            commonThemes: [],
            hashtags: [],
        };
    }
}

/**
 * Generates LinkedIn content based on user prompt and preferences
 */
export async function generateLinkedInContent(
    userId: string,
    options: ContentGenerationOptions
): Promise<GeneratedContent> {
    try {
        // Get user preferences
        const userPrefs = await db.query.userPreferences.findFirst({
            where: eq(userPreferences.userId, userId),
        });

        // Analyze user tone if not provided
        const toneAnalysis = options.toneAnalysis || await analyzeUserTone(userId);

        // Build the system prompt based on user preferences and tone
        const systemPrompt = buildSystemPrompt(userPrefs, toneAnalysis);

        const mainPrompt = buildContentPrompt(options, toneAnalysis);

        // Generate main content
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: mainPrompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1500,
        });

        const mainContent = completion.choices[0].message.content || '';

        // Extract hashtags and calculate tone match
        const hashtags = extractHashtags(mainContent);
        const toneMatch = calculateToneMatch(mainContent, toneAnalysis);

        const result: GeneratedContent = {
            mainContent,
            hashtags,
            toneMatch,
        };

        // Generate variations if requested
        if (options.generateVariations && options.variationCount && options.variationCount > 1) {
            result.variations = await generateVariations(mainContent, toneAnalysis, options.variationCount - 1);
        }

        return result;
    } catch (error) {
        console.error('Error generating content:', error);
        throw new Error('Failed to generate content');
    }
}

/**
 * Generates variations of existing content
 */
export async function generateVariations(
    originalContent: string,
    toneAnalysis: ToneAnalysis,
    count: number = 3
): Promise<string[]> {
    try {
        const variationsPrompt = `
Create ${count} different variations of this LinkedIn post while maintaining the core message and the user's established tone:

Original post:
"${originalContent}"

User's writing style:
- Formality: ${toneAnalysis.formality}
- Enthusiasm: ${toneAnalysis.enthusiasm}
- Expertise level: ${toneAnalysis.expertise}
- Typical length: ${toneAnalysis.length}
- Style: ${toneAnalysis.style}

Each variation should:
1. Keep the main message and key points
2. Match the user's established tone and style
3. Be appropriate for LinkedIn
4. Include relevant hashtags
5. Be under 3000 characters

Please provide the variations as separate responses, numbered 1-${count}.
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are an expert content creator specializing in LinkedIn posts. Create engaging variations while maintaining the author's voice and style."
                },
                {
                    role: "user",
                    content: variationsPrompt
                }
            ],
            temperature: 0.8,
            max_tokens: 2000,
        });

        const response = completion.choices[0].message.content || '';

        // Parse numbered variations
        const variations = response
            .split(/\n\d+\./)
            .filter(v => v.trim().length > 0)
            .map(v => v.trim())
            .slice(0, count);

        return variations;
    } catch (error) {
        console.error('Error generating variations:', error);
        return [];
    }
}

/**
 * Builds a system prompt based on user preferences and tone analysis
 */
function buildSystemPrompt(userPreferences: any, toneAnalysis: ToneAnalysis): string {
    const basePrompt = userPreferences?.systemPrompts?.contentGeneration ||
        "You are a professional LinkedIn content writer. Create engaging content based on the user's request while maintaining their established tone and style.";

    const toneInstructions = `
Maintain this writing style:
- Formality: ${toneAnalysis.formality}
- Enthusiasm level: ${toneAnalysis.enthusiasm}
- Expertise: ${toneAnalysis.expertise}
- Length preference: ${toneAnalysis.length}
- Style: ${toneAnalysis.style}

Content guidelines:
- Be authentic and professional
- Include relevant hashtags (3-5 max)
- Keep under 3000 characters
- Add value and insights
- Use appropriate formatting (line breaks, emojis if style allows)
`;

    return `${basePrompt}

${toneInstructions}

Common topics/themes for this user: ${toneAnalysis.commonThemes.join(', ')}
Frequently used hashtags: ${toneAnalysis.hashtags.join(', ')}`;
}

/**
 * Builds the content generation prompt
 */
function buildContentPrompt(options: ContentGenerationOptions, toneAnalysis: ToneAnalysis): string {
    let prompt = `Create a LinkedIn post about: ${options.prompt}`;

    if (options.context) {
        prompt += `\n\nAdditional context: ${options.context}`;
    }

    if (options.targetLength) {
        const lengthInstructions = {
            short: "Keep it concise (around 100-200 characters)",
            medium: "Standard LinkedIn length (around 200-600 characters)",
            long: "Detailed post (around 600-1000 characters)"
        };
        prompt += `\n\nTarget length: ${lengthInstructions[options.targetLength]}`;
    }

    prompt += `

Make sure the content:
1. Matches the specified tone and style
2. Is engaging and professional
3. Includes relevant hashtags
4. Follows LinkedIn best practices
5. Provides value to the target audience`;

    return prompt;
}

/**
 * Extracts hashtags from content
 */
function extractHashtags(content: string): string[] {
    const hashtagRegex = /#\w+/g;
    const matches = content.match(hashtagRegex) || [];
    return matches.map(tag => tag.toLowerCase());
}

/**
 * Calculates how well content matches the user's tone (0-1 scale)
 */
function calculateToneMatch(content: string, toneAnalysis: ToneAnalysis): number {
    // This is a simplified version - in production, you might use a more sophisticated approach
    let score = 0.5; // Base score

    // Check length alignment
    const contentLength = content.length;
    const expectedLengths = {
        short: [50, 200],
        medium: [200, 600],
        long: [600, 1000]
    };

    const [minLen, maxLen] = expectedLengths[toneAnalysis.length];
    if (contentLength >= minLen && contentLength <= maxLen) {
        score += 0.2;
    }

    // Check for hashtags (professional posts usually have them)
    const hashtags = extractHashtags(content);
    if (hashtags.length >= 2 && hashtags.length <= 5) {
        score += 0.1;
    }

    // Check formality indicators
    if (toneAnalysis.formality === 'professional' || toneAnalysis.formality === 'very-formal') {
        if (!content.includes('lol') && !content.includes('omg')) {
            score += 0.1;
        }
    }

    // Check enthusiasm indicators
    if (toneAnalysis.enthusiasm === 'high') {
        if (/[!?.]{2,}/.test(content) || /💪|🚀|✨|🎉/.test(content)) {
            score += 0.1;
        }
    }

    return Math.min(score, 1.0);
}