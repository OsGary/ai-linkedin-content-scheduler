# Project Requirements Document (PRD)

## 1. Project Overview

This project, **AI LinkedIn Content Scheduler**, is a web-based SaaS application that helps content creators, marketers, and professionals generate, manage, and automatically post LinkedIn content. Users can leverage an AI engine to draft ideas or full posts, organize them in a swimlane-style interface (idea → draft → scheduled → published), and schedule them to publish at specific times. The goal is to remove the manual overhead of brainstorming, editing, and remembering to post on LinkedIn, ensuring a steady, high-quality content pipeline.

We’re building this tool to streamline social media workflows, boost audience engagement, and maintain consistent branding with minimal effort. Success will be measured by user adoption, average number of posts scheduled per user, and reliability of the automated publishing pipeline (targeting 99.9% successful scheduled posts). Key objectives include secure multi-user support, intuitive drag-and-drop post management, seamless AI-powered generation, and reliable background scheduling.

## 2. In-Scope vs. Out-of-Scope

**In-Scope (Version 1.0)**
- User Authentication & multi-tenancy (sign-up, sign-in, session management) via `better-auth`.  
- LinkedIn OAuth 2.0 integration for connecting/disconnecting accounts.  
- AI Content Generation endpoint (using OpenAI or similar) with user-specific tone preferences.  
- Swimlane view for posts in four statuses: Idea, Draft, Scheduled, Published.  
- Drag-and-drop reordering and status changes (via `dnd-kit`).  
- Post Editor with a date/time picker for scheduling.  
- Vercel Cron Job or equivalent background task to publish scheduled posts automatically.  
- Responsive UI with dark mode, built on Next.js (App Router), Tailwind CSS, and shadcn/ui.  
- PostgreSQL database managed by Drizzle ORM.  
- Docker & Docker Compose for local development; Vercel for production deployment.  

**Out-of-Scope (Later Phases)**
- Analytics dashboards (engagement metrics, click-through rates).  
- Team or role-based collaboration features.  
- Support for additional social networks (e.g., Twitter, Facebook).  
- Advanced rich text or media editor (video, GIFs).  
- Mobile-native applications (iOS/Android).  
- Built-in content templates beyond basic AI prompts.  

## 3. User Flow

A new user lands on the homepage and is prompted to sign up with email/password. After confirming their email, they sign in and arrive at the Dashboard, which displays four columns (Idea, Draft, Scheduled, Published). A top navigation bar includes links to “Connect LinkedIn,” “Settings,” and “Log out.” The user clicks “Connect LinkedIn,” completes the OAuth flow, and returns to see their LinkedIn account listed under Connected Accounts.

Once connected, the user clicks a “New Idea” button to open a modal dialog. They enter a prompt or click “Generate with AI” to fetch post drafts. Generated drafts appear in the Draft column. The user can drag a draft into the Scheduled column, open it in the Post Editor, set a future date and time, and click “Save & Schedule.” Behind the scenes, the system saves the post status as `scheduled` with a timestamp. The Vercel Cron Job runs every few minutes, finds due posts, and publishes them to LinkedIn via the LinkedIn API. Published posts automatically move to the Published column.

## 4. Core Features

- **Authentication & Multi-Tenancy**: Secure sign-up, sign-in, and session management to isolate each user’s data.  
- **LinkedIn OAuth Integration**: Connect/disconnect LinkedIn accounts; store OAuth tokens in `linkedinAccounts` table.  
- **AI Content Generation**: Server-side endpoint that calls OpenAI (or chosen model) with user tone settings; returns draft variations.  
- **Swimlane Post Management**: Four-column UI displaying posts by status; drag-and-drop between columns to update status.  
- **Post Editor & Scheduler**: Modal or dedicated page for editing content; date/time picker to schedule posts.  
- **Cron-Based Publishing**: Background job (Vercel Cron) to fetch and publish scheduled posts via LinkedIn API.  
- **User Preferences**: Store custom system prompts or tone settings in `userPreferences` table.  
- **Responsive & Themed UI**: Light/dark mode toggle; mobile-friendly design using Tailwind CSS and shadcn/ui.  

## 5. Tech Stack & Tools

- **Frontend**: Next.js (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui components, `dnd-kit` for drag-and-drop.  
- **Backend**: Next.js API routes, TypeScript, `better-auth` for authentication, Drizzle ORM for type-safe PostgreSQL integration.  
- **Database**: PostgreSQL (hosted via Vercel Postgres or other cloud provider).  
- **AI Model**: OpenAI GPT-4 (or equivalent) accessed via server-side client in `lib/openai.ts`.  
- **LinkedIn API**: Custom client in `lib/linkedin.ts` handling OAuth and post publishing.  
- **Background Jobs**: Vercel Cron Jobs triggering `/api/cron/publish`.  
- **Development Tools**: Docker & Docker Compose for local services; VS Code with Cursor/Windsurf extensions (optional).  
- **Deployment**: Vercel for hosting frontend, backend, environment variables, and cron.  

## 6. Non-Functional Requirements

- **Performance**: Page load time ≤ 2s on 3G; AI generation endpoint ≤ 1.5s response time.  
- **Reliability**: 99.9% uptime for scheduled publishing; retries on transient failures.  
- **Security**: HTTPS only; OWASP Top 10 mitigations; environment variables for secrets; encrypt tokens at rest.  
- **Compliance**: GDPR-ready (data storage in EU, user data deletion on request).  
- **Usability**: WCAG AA accessibility standards; intuitive drag-and-drop; clear toast notifications on success/failure.  

## 7. Constraints & Assumptions

- **Constraints**:
  - Requires GPT-4 API availability and API key quotas.  
  - Tied to Vercel Cron Job frequency limits (minimum interval ~5 minutes).  
  - LinkedIn API rate limits for publishing (approx. 100 posts/day per account).  

- **Assumptions**:
  - Users have or can create a LinkedIn account for OAuth.  
  - Vercel environment will provide SSL/TLS and environment variable management.  
  - AI model latency and costs are within project budget.  

## 8. Known Issues & Potential Pitfalls

- **Token Expiry & Refresh**: LinkedIn tokens may expire; implement refresh token flow and error handling.  
- **API Rate Limits**: Hitting LinkedIn or OpenAI limits; add exponential backoff and user warnings.  
- **Cron Job Drift**: Vercel Cron may not fire exactly on schedule; include timestamp checks and batch publishing.  
- **Network Failures**: Handle transient HTTP errors for AI and LinkedIn calls with retries.  
- **Drag-and-Drop Edge Cases**: Ensure mobile support and fallback UI for unsupported browsers.  

Mitigation strategies include robust try/catch with logging, retry queues, and user-facing alerts for manual retry if automated publishing fails.  