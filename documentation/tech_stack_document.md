# Tech Stack Document

This document explains the technology choices behind the **ai-linkedin-content-scheduler** project in simple, everyday language. Each section covers why we picked certain tools and how they help build a reliable, user-friendly application.

## 1. Frontend Technologies

We want the app to look great, load quickly, and be easy to extend. These are the main tools we use on the user interface side:

- **Next.js (App Router)**
  - A modern framework built on React. It helps us handle page navigation, server-side rendering, and data fetching in a clean, organized way.
- **React 19**
  - The core library for building interactive user interfaces. It lets us break our UI into reusable components.
- **TypeScript**
  - A version of JavaScript that adds strict typing. This catches many common mistakes early and makes our code easier to understand.
- **Tailwind CSS v4**
  - A utility-first styling tool. Instead of writing custom CSS, we apply small, reusable classes to style elements rapidly and consistently.
- **shadcn/ui**
  - A collection of ready-made UI components—cards, dialogs, calendars, forms—that match Tailwind styles. This speeds up design and ensures a polished look.
- **dnd-kit**
  - A lightweight library for drag-and-drop interactions. We use it to let users move posts between swimlane columns (idea, draft, scheduled, published).

Together, these tools ensure our front end is fast, responsive, and easy to maintain.

## 2. Backend Technologies

On the server side, we need secure user management, data storage, and API endpoints to power our features:

- **Next.js API Routes**
  - Built-in server endpoints where we implement business logic (e.g., creating posts, calling AI or LinkedIn services).
- **better-auth**
  - A simple yet robust authentication library. It handles sign-up, sign-in, session management, and keeps each user’s data private.
- **Drizzle ORM**
  - A type-safe layer over SQL. We define our data models in code (posts, schedules, LinkedIn accounts, user preferences), and Drizzle generates SQL queries for us.
- **PostgreSQL**
  - A powerful relational database. It stores user profiles, post content, scheduling details, and OAuth tokens in a structured way.
- **TypeScript** (on the server)
  - Ensures our API code and database models stay in sync, reducing runtime errors.

These components work together to authenticate users, persist data reliably, and expose clean, well-typed APIs for our front end.

## 3. Infrastructure and Deployment

To make sure our app runs smoothly in development and production, we use:

- **Git & GitHub**
  - Version control and code collaboration hub. Every code change is tracked, reviewed, and stored safely.
- **Docker & Docker Compose**
  - Containerization tools that let us spin up a local database and server identical to production. This avoids the “it works on my machine” problem.
- **Vercel**
  - A cloud platform specialized for Next.js. It handles builds, deployments, and global CDN distribution with zero configuration.
- **Vercel Cron Jobs**
  - Built-in scheduler for background tasks. We use this to trigger an endpoint every few minutes that checks for and publishes scheduled LinkedIn posts.
- **Environment Variables**
  - Secret keys (AI API keys, LinkedIn OAuth credentials) are stored outside the codebase. In development, they live in `.env.local`; in production, they’re managed securely in Vercel.

This setup gives us continuous integration (CI), continuous deployment (CD), and a production-like environment locally, all with minimal overhead.

## 4. Third-Party Integrations

Our app connects to a few external services to deliver its AI and LinkedIn features:

- **OpenAI API (or similar)**
  - Generates post drafts and variations based on user prompts and preferred tone of voice. We call it via a custom client in `lib/openai.ts`.
- **LinkedIn API (OAuth 2.0)**
  - Allows users to sign in with LinkedIn and publish scheduled posts directly to their feed. We manage tokens securely and refresh them as needed.
- **Vercel Cron Jobs**
  - Although provided by our hosting platform, this counts as an integration. It automates the publishing workflow without extra servers.

These integrations expand our app’s capabilities without reinventing complex AI or social-media workflows from scratch.

## 5. Security and Performance Considerations

We built security and speed into our stack from day one:

- **Authentication & Session Security**
  - `better-auth` ensures passwords and sessions are handled safely. OAuth tokens are encrypted in our database.
- **Environment Isolation**
  - Sensitive credentials never appear in code. They’re managed via environment variables and encrypted at rest.
- **Type Safety**
  - TypeScript and Drizzle ORM catch many issues before the code runs.
- **Error Handling**
  - API routes contain try/catch blocks. If a LinkedIn or AI call fails, we show clear messages rather than crashing.
- **Server-Side Rendering & Code Splitting**
  - Next.js automatically optimizes page loading by sending only the code and data each view needs.
- **Background Processing**
  - Offloading scheduled posts to a cron-driven API keeps the user interface snappy and avoids long-running requests.

Together, these measures protect user data and keep interactions smooth.

## 6. Conclusion and Overall Tech Stack Summary

In this project, we chose a modern, full-stack JavaScript approach with an emphasis on reliability, developer productivity, and a great user experience:

- **Frontend**: Next.js + React + TypeScript for structure; Tailwind CSS + shadcn/ui for styling; dnd-kit for interactivity.
- **Backend**: Next.js API Routes + better-auth for security; Drizzle ORM + PostgreSQL for data integrity and querying.
- **Infrastructure**: Git/GitHub for version control; Docker for local parity; Vercel for zero-config deployment and scheduled jobs.
- **Integrations**: OpenAI for AI content; LinkedIn API for publishing; Vercel Cron Jobs for automation.

This combination aligns perfectly with our goals: a scaffolded, type-safe boilerplate that handles authentication, data storage, and core UI elements out of the box—so you can focus on the unique AI-powered content scheduling features that set this project apart.