# Backend Structure Document for ai-linkedin-content-scheduler

## 1. Backend Architecture

This project uses a modern, server-driven architecture built on Next.js with the App Router. Here’s how it is organized and why it works well:

- **Next.js App Router**
  - Routes API endpoints and server-rendered pages in the same codebase.
  - Server Components fetch data efficiently and reduce client-side overhead.
- **Layered, Modular Design**
  - **`app/` folder**: Contains UI pages and API route handlers.
  - **`lib/` folder**: Houses business logic and third-party integrations (LinkedIn, AI service).
  - **`db/` folder**: Stores database schema definitions with Drizzle ORM.
- **TypeScript & Drizzle ORM**
  - Type-safe models from database to front end, reducing runtime errors.
- **better-auth Authentication**
  - Provides secure user sign-up, sign-in, and session management out of the box.

This setup supports:

- **Scalability**: API routes run as serverless functions on Vercel, auto-scaling to handle traffic.
- **Maintainability**: Separation of concerns makes it easy to update or replace modules (e.g., swap AI provider).
- **Performance**: Server Components handle data fetching on the server, reducing client bundle sizes.

## 2. Database Management

We use PostgreSQL for relational data and Drizzle ORM for schema management:

- **Database Type**: SQL (PostgreSQL)
- **ORM**: Drizzle ORM
- **Key Entities**:
  - Users and sessions (managed by better-auth)
  - Posts (ideas, drafts, scheduled, published)
  - LinkedIn accounts (OAuth tokens)
  - User preferences (AI tone settings)

**Data Practices:**

- **Type-safe schemas**: Defined in `db/schema/`, migrations via `drizzle-kit`.
- **Environment variables**: Database URL and credentials stored securely (.env files locally, Vercel Environment Variables in production).
- **Data integrity**: Foreign keys enforce relationships (e.g., each post links to a user).

## 3. Database Schema

Below is the PostgreSQL schema in human-readable SQL. It reflects core tables for users, posts, LinkedIn accounts, and preferences.

```sql
-- Users table (managed by better-auth)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('idea','draft','scheduled','published')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LinkedIn Accounts table
CREATE TABLE linkedin_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  tone_of_voice TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. API Design and Endpoints

The backend exposes RESTful API routes under `app/api`. All endpoints return JSON and use Next.js Route Handlers.

- **Authentication**
  - `GET  /api/auth/linkedin`  – Start LinkedIn OAuth flow.
  - `GET  /api/auth/linkedin/callback` – Handle OAuth callback, store tokens.

- **Posts CRUD** (`app/api/posts/route.ts`)
  - `GET    /api/posts`         – List all user posts.
  - `POST   /api/posts`         – Create a new post (idea or draft).
  - `PUT    /api/posts/:id`     – Update post content, status, schedule.
  - `DELETE /api/posts/:id`     – Remove a post.

- **AI Content Generation** (`app/api/ai/generate/route.ts`)
  - `POST /api/ai/generate`     – Send user prompt and preferences to AI, return variations.

- **Cron Publishing** (`app/api/cron/publish/route.ts`)
  - `POST /api/cron/publish`     – Find due scheduled posts and publish them to LinkedIn.

## 5. Hosting Solutions

This app is hosted on **Vercel**, which offers:

- **Serverless Functions** for API routes, scaling automatically with demand.
- **Edge CDN** for static assets, ensuring fast global delivery.
- **Environment Variable Management** for secure key storage.
- **Vercel Cron Jobs** to trigger the `/api/cron/publish` endpoint on a schedule.

For local development, we use **Docker & Docker Compose** to spin up a PostgreSQL instance that mirrors production.

## 6. Infrastructure Components

- **Load Balancing & Auto-Scaling**
  - Handled by Vercel’s serverless platform—no manual setup required.
- **Content Delivery Network (CDN)**
  - Vercel’s built-in CDN caches static assets at the edge.
- **Cron Scheduler**
  - Vercel Cron Jobs call the publish endpoint at defined intervals.
- **Local Dev Environment**
  - Docker Compose creates containers for the database and any required services.

These components work together to provide reliable performance and a smooth user experience.

## 7. Security Measures

- **Authentication & Authorization**
  - `better-auth` library for secure user sessions and route protection.
  - Role-based access enforced in API route handlers (each user only sees their own data).
- **OAuth 2.0**
  - Secure LinkedIn token exchange and storage.
- **Data Encryption & Secrets Management**
  - Environment variables for API keys and DB credentials.
  - HTTPS enforced by Vercel for all traffic.
- **Input Validation & Error Handling**
  - Comprehensive try/catch around external API calls (AI, LinkedIn).
  - Sanitization of user input before database writes.

## 8. Monitoring and Maintenance

- **Logging & Error Tracking**
  - Vercel provides request logs and error reports in its dashboard.
  - Optionally integrate a third-party tool (e.g., Sentry) for deeper insights.
- **Health Checks**
  - Monitor response times and error rates via Vercel Analytics.
- **Database Migrations**
  - Use `drizzle-kit` to run and track schema changes over time.
- **Dependency Updates**
  - Keep Next.js, Drizzle ORM, and authentication libraries up to date.

## 9. Conclusion and Overall Backend Summary

The `ai-linkedin-content-scheduler` backend combines a serverless Next.js App Router setup with PostgreSQL and Drizzle ORM to deliver a scalable, maintainable, and high-performance foundation. Key features include:

- Robust user authentication with `better-auth`.
- A clean, layered code structure separating UI, business logic, and data.
- RESTful API endpoints for posts management, AI content generation, and scheduled publishing.
- Hosting on Vercel with built-in scaling, CDN, and cron support.
- Strong security and monitoring practices to protect data and ensure reliability.

This architecture aligns perfectly with the goal of building an AI-powered LinkedIn content scheduler—providing a solid, type-safe, and production-ready backbone so you can focus on delivering core AI and scheduling features.