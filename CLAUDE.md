🛑 CRITICAL BEHAVIORAL RULES (MANDATORY)

    VARIABLE PROTECTION: * NEVER modify, delete, or overwrite environment variables in Google Cloud Console, .env files, or cloudbuild.yaml.

        NO BLANK CONFIGS: If a file contains sensitive keys or project IDs (like ebey3-67950), never output a version of that file with missing or "placeholder" data. Use comments like // ... existing config remains unchanged instead.

        If a new variable is needed, suggest it in text; do not rewrite the existing configuration block.

    TASK CHUNKING (THE 3-STEP RULE):

        For every request, you MUST first respond with a structured Plan.

        Divide the work into 2-3 major steps.

        Break each step into 2-4 small, actionable parts.

        STOP and WAIT for user confirmation after presenting the plan before writing any code or executing commands.

    EXECUTION CONTEXT:

        Always assume a production-sensitive environment on Google Cloud Run.

        Prioritize stability and data integrity over rapid refactoring.

Project Overview

ebey3 (اي بيع) is an Arabic/Kurdish e-commerce marketplace featuring auctions, fixed-price listings, and multi-seller support.
Tech Stack

    Backend: Express (Node 20), TypeScript, Drizzle ORM, PostgreSQL.

    Frontend: React 18, Vite 6, Wouter, Tailwind, Radix UI.

    Search: Meilisearch (proxied via /api/meilisearch).

    Mobile: Capacitor 8 (Android/iOS) | App ID: yasircom.ebey3.com.

    Hosting: Google Cloud Run, Firebase Hosting, Cloud SQL.

Architecture & Directory Map
Path	Purpose
server/	Express backend, routes, storage, services.
client/src/	React app (pages, components, hooks, lib).
shared/	Drizzle schema, Zod schemas, shared types.
script/	Build scripts (e.g., tsx script/build.ts).
Data Layer

    shared/schema.ts: Drizzle tables (users, listings, bids, etc.).

    server/storage.ts: Main data layer; uses db and syncListingToMeilisearch.

    Migrations: Handled via drizzle-kit push or drizzle-kit migrate.

Technical Conventions
1. Internationalization (i18n)

    Languages: ar (Arabic), ku (Kurdish), en (English).

    Implementation: Use const { language, t } = useLanguage() from client/src/lib/i18n.tsx.

    RTL Support: Always apply dir={language === "ar" ? "rtl" : "ltr"} to main containers.

2. Search (Meilisearch)

    Backend Service: server/services/meilisearch.ts.

    Proxy Route: /api/meilisearch/* ensures the master key stays server-side.

    Note: Search is optional; code must handle cases where getClient() === null.

3. Deployment Flow

    Push to main branch.

    Cloud Build executes cloudbuild.yaml.

    Cloud Build deploys to Cloud Run.

    Firebase Hosting serves dist/public and rewrites /api/* to Cloud Run.

4. Deploy Command

    To deploy, push to main — Cloud Build triggers automatically:
    git add -A && git commit -m "description" && git push origin main

Common Pitfalls to Avoid

    Dependency Management: If adding/removing dependencies, run npm install and commit the updated package-lock.json.

    Mobile UI: All frontend changes must be tested for compatibility with the Capacitor mobile wrapper.

    Hardcoded Strings: Avoid hardcoding Arabic/Kurdish text; always add new keys to the translations object in i18n.tsx.

