# Contributing Guide

## Prerequisites

- Node.js 18+
- npm
- Access to Neon PostgreSQL database
- (Optional) Cloudinary account for media uploads
- (Optional) OpenAI API key for AI content features

## Environment Setup

1. Clone the repository:
   ```bash
   git clone git@github.com:mrwind-up-bird/landingpage-e-ventschau.git
   cd landingpage-e-ventschau
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   > `postinstall` runs `prisma generate` automatically.

3. Create environment files from the example:
   ```bash
   cp .env.example .env
   cp .env.example .env.local
   ```

4. Fill in the required environment variables (see [Environment Variables](#environment-variables)).

5. Push the Prisma schema to your database:
   ```bash
   npm run db:push
   ```

6. Seed the database:
   ```bash
   npm run db:seed
   ```

7. Start the dev server:
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string (pooled). Used by Prisma at runtime. |
| `DATABASE_URL_UNPOOLED` | Yes | Neon PostgreSQL direct connection string. Used by Prisma for migrations. |
| `NEXTAUTH_SECRET` | Yes | Secret key for NextAuth JWT signing. Generate with `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | Yes | Canonical URL of the app. `http://localhost:3000` for local dev. |
| `TENANT_SLUG` | Yes | Multi-tenant identifier. Default: `rd-e-ventschau`. |
| `NEXT_PUBLIC_SITE_URL` | No | Public site URL for SEO/sitemap. Defaults to `https://e-ventschau.de`. |
| `NEXT_PUBLIC_ROOT_DOMAIN` | No | Root domain for middleware tenant routing. Defaults to `localhost:3000`. |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name for media uploads. |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret. |
| `OPENAI_API_KEY` | No | OpenAI API key for AI content improvement and SEO generation. |
| `NEXT_PUBLIC_MINIRAG_ID` | No | MiniRAG widget ID. |
| `NEXT_PUBLIC_MINIRAG_URL` | No | MiniRAG widget URL. |

> **Important:** Prisma CLI reads `.env` (not `.env.local`). Next.js reads `.env.local` at runtime. Both files must have `DATABASE_URL`.

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev` | Start development server on port 3000 |
| `npm run build` | `prisma generate && next build` | Generate Prisma client and build for production |
| `npm start` | `next start` | Start production server |
| `npm run lint` | `next lint` | Run ESLint |
| `npm run db:push` | `prisma db push` | Push Prisma schema to database (no migration history) |
| `npm run db:migrate` | `prisma migrate dev` | Create and apply Prisma migrations |
| `npm run db:seed` | `npx tsx prisma/seed.ts` | Seed the database with initial data |
| `npm run db:studio` | `prisma studio` | Open Prisma Studio GUI for database browsing |

## Development Workflow

1. Create a feature branch from `main`
2. Make changes and test locally with `npm run dev`
3. Run `npm run lint` before committing
4. Run `npm run build` to verify the production build succeeds
5. Commit and push, then create a PR against `main`

## Testing

No test framework is currently configured. Verify changes manually:

- Run `npm run build` to catch TypeScript and build errors
- Run `npm run lint` to catch linting issues
- Test admin features at `http://localhost:3000/admin` (login: `admin@e-ventschau.de` / `admin2024!`)

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5.7
- **Styling:** Tailwind CSS 3.4 (liquid-glass design system)
- **Database:** Prisma 6 with Neon PostgreSQL
- **Auth:** NextAuth 4 (JWT strategy, CredentialsProvider)
- **Media:** Cloudinary
- **Animation:** Framer Motion, Lenis (smooth scroll)
- **Content:** react-markdown, gray-matter
- **AI:** OpenAI (content improvement, SEO generation)
