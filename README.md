# the-eddie-bus

A static Next.js site for "The Eddie Bus" charity.

## Quick Start

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Build the static export:

```bash
npm run build
```

## Notes

- The site uses Next.js static export, so the build output is safe to host on a file-based web server.
- Interactive features should be added as client-side React components.
- Deployment mirrors the generated `out/` directory to the FTP host.
