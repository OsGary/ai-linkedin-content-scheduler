# Frontend Guidelines for ai-linkedin-content-scheduler

This document outlines the frontend architecture, design principles, and technologies used in the ai-linkedin-content-scheduler project. It’s written in everyday language so anyone can understand how the frontend is set up and why.

## 1. Frontend Architecture

**Frameworks and Libraries**
- **Next.js (App Router)**: Provides both server and client components. Server components fetch data efficiently, while client components handle interactivity like drag-and-drop.
- **React 19**: The core UI library for building reusable components.
- **TypeScript**: Adds type safety across the stack—from database schemas to UI props—catching errors early.
- **Tailwind CSS v4**: A utility-first CSS framework for rapid styling without writing custom CSS classes.
- **shadcn/ui**: A component library built on top of Tailwind CSS, offering ready-made UI elements (Cards, Dialogs, Forms, Calendar).

**Support for Scalability, Maintainability, and Performance**
- **Scalability**: The App Router’s file-based routing separates pages and API routes naturally, making it easy to add new features.
- **Maintainability**: Components live in logical folders (`app/`, `components/ui/`), and business logic lives in `lib/`, so it’s easy to find and update code.
- **Performance**: Server components minimize client-side JavaScript, and Next.js optimizes assets and images out of the box.

## 2. Design Principles

- **Usability**: The UI is clean and straightforward. Users can connect LinkedIn, draft posts, drag items through swimlanes, and schedule content with minimal clicks.
- **Accessibility**: All interactive elements use semantic HTML and ARIA attributes. Color contrasts meet WCAG AA standards.
- **Responsiveness**: The layout adapts from mobile to desktop using Tailwind’s responsive utilities. The swimlane board stacks columns vertically on small screens.

How these principles are applied:
- Buttons and form fields have clear labels and keyboard focus styles.
- Dialogs trap focus so keyboard users stay inside modal flows.
- Touch-area sizes meet accessibility guidelines for mobile users.

## 3. Styling and Theming

**Styling Approach**
- **Utility-First with Tailwind CSS**: No custom CSS files. We compose styles using Tailwind classes directly in JSX.
- **Component Styles**: When we need custom styling, we use Tailwind’s `@apply` in a `.css` or `.scss` file.

**Theming**
- **Dark Mode Support**: Users can toggle between light and dark themes. Tailwind’s `dark:` variants handle color switches.

**Visual Style**
- **Modern Flat Design** with subtle shadows for depth. Dialogs and dashboards use a hint of glassmorphism (semi-transparent backgrounds) for a polished look.

**Color Palette**
- **Primary**: #2563EB (Blue)
- **Secondary**: #F59E0B (Amber)
- **Accent**: #10B981 (Emerald)
- **Neutral**: #F3F4F6 (Light Gray), #374151 (Dark Gray)
- **Error**: #DC2626 (Red)
- **Success**: #059669 (Green)

**Fonts**
- **Primary Font**: Inter (sans-serif) for a clean, readable interface.
- **Fallbacks**: system-ui, -apple-system, BlinkMacSystemFont, ‘Segoe UI’, Roboto.

## 4. Component Structure

- **File Organization**:
  - `app/`: Pages (React Server and Client components) and API routes.
  - `components/ui/`: Custom wrappers or overrides of `shadcn/ui` elements.
  - `lib/`: Business logic and service clients (LinkedIn, OpenAI).

- **Reusable Components**:
  - Cards for swimlane items.
  - Dialogs for post editors.
  - Forms and inputs for scheduling and AI prompts.
  - Calendar view for picking dates.

**Why Component-Based Architecture Matters**
- Encourages **DRY** (Don’t Repeat Yourself) by reusing UI bits.
- Simplifies testing—each component can be tested in isolation.
- Enhances consistency in look and behavior across the app.

## 5. State Management

- **React State & Context API**: Local state with `useState` and shared global state with `useContext` for user session and theme.
- **Server Actions & Fetching**: Next.js server actions handle form submissions (e.g., creating or updating posts) without extra client-side boilerplate.
- **Data Fetching**: Use Next.js `fetch` in server components or client-side libraries like SWR or React Query if real-time updates are needed.

This mix ensures fast initial loads (server-rendered) and smooth interactions (client state) without a heavy global store.

## 6. Routing and Navigation

- **Next.js App Router** handles both page routing and API endpoints. Structure:
  - `app/dashboard/page.tsx` for the main swimlane view.
  - `app/sign-in/page.tsx` and `app/sign-up/page.tsx` for authentication flows.
  - `app/api/` for backend routes:
    - `posts/route.ts` (CRUD for posts)
    - `ai/generate/route.ts` (AI content generation)
    - `cron/publish/route.ts` (cron-triggered publishing)
    - `auth/linkedin/route.ts` (LinkedIn OAuth)

- **Navigation**: A top-level layout provides a persistent header with navigation links (Dashboard, Settings). Client-side transitions are handled by Next.js’ `<Link>` component for instant page changes.

## 7. Performance Optimization

- **Lazy Loading & Code Splitting**: Use dynamic imports (`next/dynamic`) for heavy components like the Calendar or drag-and-drop board.
- **Image Optimization**: Next.js `<Image>` component compresses and serves images at the right size.
- **Tree Shaking**: Tailwind CSS removes unused styles in production builds.
- **Server Components**: Reduce client JavaScript by rendering static parts on the server.

These strategies keep page loads snappy and reduce bandwidth usage for users.

## 8. Testing and Quality Assurance

- **Unit Tests**: Jest and React Testing Library for individual components and hooks.
- **Integration Tests**: Test user flows in isolation—e.g., creating a post, generating AI content, scheduling.
- **End-to-End Tests**: Cypress or Playwright to simulate real user actions (sign in, drag-and-drop, publish to LinkedIn).
- **Type Checking**: Continuous TypeScript checks to enforce type safety.
- **Linting & Formatting**: ESLint (with React and Next.js plugins) and Prettier ensure consistent code style.
- **CI/CD**: GitHub Actions or Vercel’s built-in checks run tests and linters on each pull request.

## 9. Conclusion and Overall Frontend Summary

This frontend setup provides a clear, modular foundation for building an AI-powered LinkedIn content scheduler. By combining Next.js App Router, React, TypeScript, Tailwind CSS, and shadcn/ui, we ensure a scalable, maintainable, and performant application. Design principles around usability, accessibility, and responsiveness guide every UI decision, while our component-based architecture and state-management patterns make development efficient and predictable.

Unique aspects:
- **Server & Client Hybrid Components**: Minimizes client JavaScript for faster loads.
- **shadcn/ui Kickstart**: Rapidly assembles beautiful UIs without building from scratch.
- **Built-In Cron Jobs**: Vercel integration automates content publishing seamlessly.

With these guidelines, any developer—technical or not—can understand how the frontend works and how to extend it to meet new requirements.