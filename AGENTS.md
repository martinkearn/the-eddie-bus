# Project instructions

This is a static Next.js website.

## Hard constraints

- Use Next.js static export.
- Set `output: 'export'` in `next.config.js`.
- Do not use API routes.
- Do not use server actions.
- Do not require backend server compute.
- Do not require a database.
- Do not use runtime SSR.
- Interactive UI must be client-side React components.
- The site must work from static files after `npm run build`.

## Commands

- Install: `npm install`
- Develop: `npm run dev`
- Build: `npm run build`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
