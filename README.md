# ASTO Portfolio

Personal portfolio of a business automation & AI integration engineer, with a built-in AI assistant, its own analytics and a full content admin panel.

**Live:** [asto-portfolio.ru](https://asto-portfolio.ru)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Drizzle_ORM-4169E1?logo=postgresql&logoColor=white)
![License: All rights reserved](https://img.shields.io/badge/License-All_rights_reserved-lightgrey)

---

## What's inside

**Public site**
- Home page with an animated name, a fan of project cards and rotating quotes.
- About section with text blocks and a masonry photo/video gallery.
- Works catalog with category filter, search, lightbox galleries and inline charts in descriptions.
- Web resume on an A4 sheet with PDF export (headless Chrome).
- Three languages: Russian, English, German (cookie, then browser language).

**AI assistant**
- Text chat that answers on the owner's behalf from a "dossier" built live from the database.
- Tool calling: web search (Tavily) and URL fetching with an SSRF guard.
- Voice messages (Whisper) and real-time voice calls (OpenAI Realtime over WebRTC).
- Spending guard: a daily USD cap for the whole site and a per-visitor message quota.
- Optional SOCKS5 proxy for servers where OpenAI is geo-blocked.

**Admin panel** (`/admin`)
- Edit every text, work, category, gallery item, resume section and site image.
- One-click RU to EN translation (Google Cloud Translation).
- Assistant settings: model, temperature, instructions, realtime voice.

**Self-hosted analytics**
- Page views, time on page, clicks and visits stored in your own Postgres. No raw IPs, only a daily hash.
- Tracked short links (`/<code>` redirects with `?ref=<code>`) to compare campaigns and audiences.
- Bot filtering, dashboard with trends and insights, export to Google Sheets.

**Media pipeline**
- Uploads go to local disk. Images become WebP with `md` / `sm` / `blur` variants (sharp).
- Videos are transcoded to H.264 with preview clips, grid clips, posters and thumbnails (ffmpeg).
- Missing variants are generated on first request.

**Private agent API** (`/api/sena/v1`)
- REST API that lets the owner's personal assistant edit texts, works, links and settings.
- Every write is logged with before/after values and can be reverted.
- Disabled (answers 404) until `SENA_SITE_KEY` is set. See [lib/sena-api/README.md](lib/sena-api/README.md).

---

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Data | PostgreSQL, postgres.js, Drizzle ORM |
| Media | sharp, ffmpeg / ffprobe |
| AI | OpenAI Chat Completions, Realtime, Whisper; Tavily search |
| Integrations | Google Sheets API, Google Cloud Translation |
| PDF | Headless Chrome / Chromium |

---

## Project structure

```
app/                  Routes (App Router)
  admin/              Admin panel, protected by proxy.ts
  ai-assistant/       Chat, voice messages, voice calls (client)
  api/                Route handlers: assistant, analytics, uploads, auth, agent API
  actions/            Server actions used by the admin panel
  uploads/            Media file server with on-the-fly variants
lib/
  content.ts          Cached content reads (invalidated on every admin save)
  schema.ts           Database schema (Drizzle)
  storage.ts          Upload storage, image and video processing
  ai-*.ts             Assistant dossier, guardrails, budget, proxy
  analytics-*.ts      Visits, insights, export
  sena-api/           Private agent API: router, auth, audit log, revert
proxy.ts              Admin session check for /admin/*
public/               Static files and standalone project presentation pages
```

---

## Tests

Unit tests live in `tests/` and run with [Vitest](https://vitest.dev). They need no database or API keys.

They cover the security-sensitive pieces first:
- client IP detection behind nginx and rate limiting;
- the SSRF guard of the assistant's URL fetch tool;
- safe redirect targets for short links;
- on-the-fly media variants (no derivative chains);
- input validation of the private agent API;
- slugs, bot filter, media URLs, gallery notes parser.

GitHub Actions runs lint, type check and tests on every push to main and every pull request.

---

## How it runs

The live site runs on a single VPS behind nginx, as one Node.js process under PM2.
Rate limits, the media job queue and the agent API write lock live in process memory.

The AI assistant has a daily spending ceiling. Text chat replies are counted toward it, along with a per-guest daily message quota.
The voice call and voice-message transcription stop once the ceiling is reached, but their own cost is not counted: the call runs in the browser, and the server never sees its usage. Beyond that, they are bounded only by rate limits.

---

## Security notes

- Admin session: HMAC-signed `httpOnly` cookie; login is rate-limited and compared in constant time.
- Every server action checks the admin session itself, not only the `/admin` route guard.
- Uploads: admin only, MIME allow-list, size limit; SVGs are served with a sandboxing CSP.
- Strict security headers (CSP, HSTS, frame and referrer policies) in `next.config.ts`.

Found a vulnerability? Please open a private security advisory on GitHub instead of a public issue.

---

## License

© 2026 Artemii Storozhevskikh. All rights reserved.

The code is published for viewing and evaluation only, as part of the author's portfolio. Copying, modifying, distributing or using it, in whole or in part, requires prior written permission. See [LICENSE](LICENSE).

Third-party fonts and icons keep their own licenses: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
