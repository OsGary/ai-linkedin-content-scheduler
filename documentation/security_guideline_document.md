# Security Guidelines for ai-linkedin-content-scheduler

This document provides a comprehensive set of security best practices tailored to the `ai-linkedin-content-scheduler` repository. It aligns with core security principles—Security by Design, Least Privilege, Defense in Depth, Fail Securely, and Secure Defaults—and covers all phases of development, deployment, and maintenance.

---

## 1. Authentication & Access Control

- **Robust Authentication** (better-auth)
  - Enforce strong password complexity (minimum length, mixed case, digits, special characters).
  - Use Argon2 or bcrypt with per-user salts for password hashing. Never use MD5 or SHA1.
  - Implement account lockout after a configurable number of failed attempts to mitigate brute-force attacks.

- **Session Management**
  - Generate cryptographically random, unguessable session IDs.
  - Store sessions server-side; avoid exposing session data to the client.
  - Enforce idle and absolute session timeouts (e.g., 15 minutes idle, 24 hours absolute).
  - On logout or password change, revoke all active sessions.
  - Protect against session fixation by regenerating session ID after authentication.

- **Role-Based Access Control (RBAC)**
  - Define roles (e.g., `user`, `admin`) and associated permissions in a central configuration.
  - Enforce server-side authorization checks on every API route (`/api/posts`, `/api/cron/publish`, etc.).
  - Verify resource ownership (a user may only access or modify their own posts and LinkedIn account entries).

- **Multi-Factor Authentication (MFA)**  *(optional but recommended)*
  - Provide TOTP (Time-based One-Time Password) or SMS/email OTP as a second factor for high-risk operations (changing password, connecting LinkedIn).

---
## 2. Input Handling & Processing

- **Parameterized Queries & ORM Usage**
  - Use Drizzle ORM’s parameterized queries to prevent SQL injection. Never construct SQL strings with user input.

- **Server-Side Validation**
  - Validate all incoming payloads against strict schemas (e.g., zod or Joi) in API routes.
  - Reject or sanitize unexpected fields. Enforce maximum lengths, allowed character sets, and proper types.

- **Cross-Site Scripting (XSS) Mitigation**
  - In React components, avoid using `dangerouslySetInnerHTML`. If required, sanitize HTML with a vetted library (e.g., DOMPurify).
  - Implement a robust Content Security Policy (CSP) to limit allowable script sources.

- **Prevent CSRF**
  - For state-changing requests (POST, PUT, DELETE), implement anti-CSRF tokens. Use Next.js built-in CSRF protection or a library like `csrf`.
  - For cookie-based sessions, enforce `SameSite=Lax` or `Strict` based on your flow.

- **File Uploads**  *(if implemented)*
  - Validate file types via MIME sniffing and extension allow-lists.
  - Enforce file size limits.
  - Store uploads outside the webroot or in an object storage service with restricted access.
  - Scan uploads for malware if you accept arbitrary content.

---
## 3. Data Protection & Privacy

- **Encryption In Transit**
  - Enforce TLS 1.2+ for all client-server and server-server communication (API calls to LinkedIn/OpenAI).
  - Use HSTS (`Strict-Transport-Security`) in production to prevent protocol downgrade.

- **Encryption At Rest**
  - Encrypt sensitive columns (OAuth tokens, AI API keys) in the database with AES-256.
  - Use a secrets management service (e.g., Vercel Environment Variables, HashiCorp Vault) for encryption keys.

- **Secret Management**
  - Do not commit `.env.local` or any credentials to source control.
  - Rotate LinkedIn refresh tokens and AI API keys periodically.

- **Prevent Information Leakage**
  - Do not expose stack traces, internal paths, or raw error messages in API responses—log them internally instead.
  - Mask PII in logs (user emails, tokens).

---
## 4. API & Service Security

- **HTTPS Enforcement**
  - Redirect all HTTP traffic to HTTPS.
  - Use secure, up-to-date cipher suites; disable TLS 1.0/1.1.

- **Rate Limiting & Throttling**
  - Protect public and sensitive API endpoints with rate limits (e.g., 100 requests per minute per IP or userID).
  - Use in-memory or distributed rate-limiting middleware (e.g., Redis throttler).

- **CORS Hardening**
  - Allow only trusted origins for web UI (`https://your-domain.com`).
  - Do **not** use a wildcard (`*`) in production.

- **Input Sanitization**
  - Apply the same strict validation on JSON bodies, query parameters, and URL segments.

- **API Versioning**
  - Prefix your endpoints with a version (e.g., `/api/v1/posts`), allowing you to deprecate old versions safely.

---
## 5. Web Application Security Hygiene

- **Security Headers**
  - Content-Security-Policy: restrict scripts, styles, frames to trusted sources.
  - X-Frame-Options: `DENY` or `SAMEORIGIN` to prevent clickjacking.
  - X-Content-Type-Options: `nosniff`.
  - Referrer-Policy: `strict-origin-when-cross-origin`.

- **Secure Cookies**
  - Set all cookies with `HttpOnly`, `Secure`, and `SameSite=Strict` (or `Lax` if needed).

- **Subresource Integrity (SRI)**
  - If loading third-party scripts or CSS from CDNs, include integrity hashes.

- **Disable Client-Side Storage for Secrets**
  - Never store tokens or PII in `localStorage` or `sessionStorage`.

---
## 6. Infrastructure & Configuration Management

- **Container & Host Hardening**
  - Use minimal base images (e.g., Alpine) and remove unnecessary packages.
  - Run containers as non-root users.

- **Secrets in CI/CD**
  - Store production environment variables and secrets in your CI/CD platform’s secure store (Vercel, GitHub Actions Secrets).

- **Disable Debugging in Production**
  - Ensure `NODE_ENV=production` and that verbose logs or debug endpoints are disabled.

- **Port & Service Exposure**
  - Expose only necessary ports (e.g., 443) on production firewalls.

- **Regular Patching**
  - Automate dependency updates and vulnerability scanning with tools like Dependabot or Snyk.

---
## 7. Dependency Management

- **Lockfiles & Deterministic Builds**
  - Commit `package-lock.json` or `yarn.lock` and run `npm ci` or `yarn --frozen-lockfile` in CI.

- **Vulnerability Scanning**
  - Integrate SCA tools (e.g., npm audit, Snyk) into your CI pipeline to block builds on critical CVEs.

- **Minimal Footprint**
  - Only install required dependencies. Regularly review and prune unused packages.


---

## 8. Project-Specific Considerations

- **LinkedIn OAuth Tokens**
  - Store access and refresh tokens encrypted in the database.
  - Automatically refresh expired tokens using a secure server-side background job.

- **OpenAI (AI Service) Keys**
  - Restrict API key permissions to the minimal scope needed.
  - Log usage metrics and detect anomalous usage patterns.

- **Cron Endpoint Protection** (`/api/cron/publish`)
  - Protect with a secure, rotating secret or mutual TLS to ensure only your scheduler can invoke it.

- **Background Job Reliability**
  - Implement idempotency checks in your publish logic to avoid duplicate posts.
  - Log successes and failures to a centralized monitoring service.


# Conclusion

By following these guidelines, the `ai-linkedin-content-scheduler` project will maintain a strong security posture throughout its lifecycle. Regularly audit and review your security controls, and always err on the side of caution when evaluating new dependencies or integrations.