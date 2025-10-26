import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
    handleAPIError,
    createAPIResponse,
    validateSession,
    extractHashtags,
    extractMentions,
    calculateEngagementRate
} from '@/lib/api-utils';
import { z } from 'zod';

const analyzeContentSchema = z.object({
    content: z.string().min(1, 'Content is required').max(3000),
    checkTone: z.boolean().default(true),
    checkEngagement: z.boolean().default(true),
    checkSEO: z.boolean().default(true),
    targetAudience: z.string().optional(),
});

interface RateLimiter {
    requests: number;
    resetTime: number;
}

const rateLimiters = new Map<string, RateLimiter>();

function checkRateLimit(userId: string, limit: number = 20, windowMs: number = 300000): boolean {
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

// POST /api/ai/analyze - Analyze content
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        validateSession(session);

        // Rate limiting
        if (!checkRateLimit(session!.user.id, 20, 300000)) {
            return handleAPIError({
                name: 'RateLimitError',
                message: 'Too many analysis requests. Please try again later.',
                details: { limit: 20, window: '5 minutes' }
            });
        }

        const body = await request.json();
        const validatedData = analyzeContentSchema.parse(body);

        const analysis = await analyzeContent(validatedData);

        return createAPIResponse({
            analysis,
            insights: generateInsights(analysis, validatedData.targetAudience),
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleAPIError(error);
        }
        return handleAPIError(error);
    }
}

async function analyzeContent(data: z.infer<typeof analyzeContentSchema>) {
    const content = data.content;

    const analysis: any = {
        basic: {
            characterCount: content.length,
            wordCount: content.split(/\s+/).length,
            lineCount: content.split('\n').length,
        },
        content: {
            hashtags: extractHashtags(content),
            mentions: extractMentions(content),
            hasLinks: /https?:\/\//.test(content),
            hasQuestions: /\?/.test(content),
            hasEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(content),
        },
        seo: {},
        engagement: {},
        tone: {},
    };

    // SEO Analysis
    if (data.checkSEO) {
        analysis.seo = {
            hashtagCount: analysis.content.hashtags.length,
            hashtagOptimal: analysis.content.hashtags.length >= 2 && analysis.content.hashtags.length <= 5,
            mentionCount: analysis.content.mentions.length,
            hasCallToAction: /(learn more|find out more|check out|visit|click|share|comment|let me know)/i.test(content),
            firstLineLength: content.split('\n')[0]?.length || 0,
            firstLineEngaging: (content.split('\n')[0]?.length || 0) <= 140,
        };
    }

    // Engagement Analysis
    if (data.checkEngagement) {
        analysis.engagement = {
            hasQuestions: analysis.content.hasQuestions,
            hasEmojis: analysis.content.hasEmojis,
            hasPersonalization: /(I|I'm|I've|my|we|our)/i.test(content) && !/(the company|our company)/i.test(content),
            hasStatistics: /\d+%|\d+\s*(million|billion|thousand|percent)/i.test(content),
            hasStory: content.split('.').length >= 3, // Simple heuristic for storytelling
            readabilityScore: calculateReadabilityScore(content),
        };
    }

    // Tone Analysis (simplified)
    if (data.checkTone) {
        analysis.tone = analyzeTone(content);
    }

    return analysis;
}

function calculateReadabilityScore(content: string): number {
    // Simple readability score based on sentence length and word complexity
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/);

    if (sentences.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const longWords = words.filter(word => word.length > 6).length;
    const longWordPercentage = (longWords / words.length) * 100;

    // Simplified Flesch Reading Ease-like calculation
    let score = 100;
    score -= (avgWordsPerSentence - 15) * 2; // Penalize longer sentences
    score -= longWordPercentage * 0.5; // Penalize complex words

    return Math.max(0, Math.min(100, Math.round(score)));
}

function analyzeTone(content: string) {
    const lowercase = content.toLowerCase();

    // Simple tone detection based on keyword patterns
    const formalityScore = analyzeFormality(lowercase);
    const enthusiasmScore = analyzeEnthusiasm(content);
    const expertiseScore = analyzeExpertise(lowercase);

    return {
        formality: formalityScore,
        enthusiasm: enthusiasmScore,
        expertise: expertiseScore,
        sentiment: analyzeSentiment(lowercase),
    };
}

function analyzeFormality(content: string): 'very-casual' | 'casual' | 'professional' | 'very-formal' {
    const casualWords = ['hey', 'hi', 'yo', 'sup', 'lol', 'omg', 'btw', 'gonna', 'wanna'];
    const formalWords = ['furthermore', 'moreover', 'nevertheless', 'consequently', 'therefore'];

    const casualCount = casualWords.filter(word => content.includes(word)).length;
    const formalCount = formalWords.filter(word => content.includes(word)).length;

    if (formalCount > casualCount) {
        return formalCount > 1 ? 'very-formal' : 'professional';
    } else {
        return casualCount > 2 ? 'very-casual' : 'casual';
    }
}

function analyzeEnthusiasm(content: string): 'low' | 'medium' | 'high' {
    const enthusiasmIndicators = [
        /!+/g, // Multiple exclamation marks
        /💪|🚀|✨|🎉|🔥|💯/g, // Enthusiastic emojis
        /(amazing|awesome|fantastic|incredible|excited|thrilled)/gi, // Enthusiastic words
    ];

    let score = 0;
    enthusiasmIndicators.forEach(indicator => {
        const matches = content.match(indicator);
        if (matches) score += matches.length;
    });

    if (score >= 3) return 'high';
    if (score >= 1) return 'medium';
    return 'low';
}

function analyzeExpertise(content: string): 'beginner-friendly' | 'intermediate' | 'expert' {
    const beginnerWords = ['simple', 'easy', 'basic', 'getting started', 'introduction', 'step by step'];
    const expertWords = ['paradigm', 'leverage', 'synergy', 'optimize', 'architectural', 'methodology'];

    const beginnerCount = beginnerWords.filter(word => content.includes(word)).length;
    const expertCount = expertWords.filter(word => content.includes(word)).length;

    if (expertCount > beginnerCount) return 'expert';
    if (beginnerCount > 0) return 'beginner-friendly';
    return 'intermediate';
}

function analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'good', 'amazing', 'excellent', 'wonderful', 'fantastic', 'love', 'happy', 'excited'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'frustrated', 'worst', 'poor'];

    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
}

function generateInsights(analysis: any, targetAudience?: string) {
    const insights: string[] = [];

    // Content insights
    if (analysis.seo?.hashtagOptimal === false) {
        insights.push(analysis.seo?.hashtagCount === 0
            ? "Consider adding 2-5 relevant hashtags to improve visibility"
            : analysis.seo?.hashtagCount > 5
            ? "Too many hashtags can look spammy. Consider using 3-5 focused hashtags"
            : "");
    }

    if (analysis.engagement?.hasQuestions === false) {
        insights.push("Adding a question can increase engagement by encouraging comments");
    }

    if (analysis.engagement?.hasCallToAction === false) {
        insights.push("Include a clear call-to-action to guide reader response");
    }

    if (analysis.seo?.firstLineEngaging === false) {
        insights.push("The first line is too long. Consider making it more engaging and under 140 characters");
    }

    if (analysis.engagement?.readabilityScore && analysis.engagement.readabilityScore < 60) {
        insights.push("The content might be hard to read. Consider shorter sentences and simpler language");
    }

    if (analysis.engagement?.hasPersonalization === false) {
        insights.push("Adding personal experiences or opinions can make the post more relatable");
    }

    // Target audience specific insights
    if (targetAudience) {
        if (targetAudience.toLowerCase().includes('beginner') && analysis.tone?.expertise === 'expert') {
            insights.push("The content might be too technical for a beginner audience");
        }
        if (targetAudience.toLowerCase().includes('expert') && analysis.tone?.expertise === 'beginner-friendly') {
            insights.push("Consider adding more depth and technical details for expert audiences");
        }
    }

    return insights.filter(insight => insight.length > 0);
}