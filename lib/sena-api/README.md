# Private API for Sena

Through it the owner's personal assistant (Sena) reads and edits the site: texts in three languages, works, resume, quotes, contacts,
the site's AI-assistant settings, tracking links for job applications, and views analytics. Everything lives under `/api/sena/v1`.

## How to enable
1. Generate a key (longer than 32 characters): `node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"`.
2. Set it in the site's environment as `SENA_SITE_KEY` and restart the site. The same key and the site address (`SITE_URL`) go into Sena's `.env`.
3. **While there is no key (or it is shorter than 32 characters), the API answers 404, as if it did not exist.** Deploying the code to the server without a key is safe.

## What is guaranteed
- The key goes only in the `Authorization: Bearer …` header, compared in constant time. 10 wrong attempts in 15 minutes from one address - 429.
  A correct key works, but no more than 300 requests per minute; analytics - 20 per minute, export to a spreadsheet - 3 per 10 minutes (the DB is shared with the site).
- Any edit understands `dry_run: true` (in the body or `?dry_run=1`): the site shows "before → after" and writes nothing. An unclear `dry_run` value (a string, a number) is rejected with 422, not silently turned into a real write.
- Writing requests run one at a time (a queue inside the process): the "before" value does not change between the read and the write, and two simultaneous reverts of one entry can't both pass.
- Batch edits (`changes`) run in one transaction: either all or none. The response always contains the previous values - the revert is built from them.
- Only existing keys and their translations are allowed (`key__en`, `key__de`). A typo in a field or key name is an error, not a silently created record.
- Interface labels (`ui`) and page heroes are stored as a group: editing one record creates the missing ones (from the built-in texts or as a copy of the Russian one), otherwise the English version of the site would start speaking Russian. A label can't be deleted, only replaced.
- The main text can't be made empty by accident (`allow_empty: true` is required). Translations of work lists (tags, results) must go in order, with empty ones only at the end, and tags contain no commas: this is how the admin reads them.
- Assistant settings: the model only from those the site tracks cost for; temperature above 0; the main instruction is not empty.
- Addresses in contacts are only `http(s)`, `mailto:`, `tel:`. A link's target page is only a path inside the site (no `//` and no protocols), and the code can't match a real page.
- After an edit the cache is reset immediately (as in the admin) and the site's AI-assistant dossier is refreshed. The server log (`[sena-api]`) gets keys and lengths, not the texts themselves.
- An edit that changed nothing is written to the log as a short row (`preview`, "no changes").
- Can't: create and delete works, upload images and videos, manage the gallery, clear analytics. These stay in the admin.

## Action log and revert
Everything Sena does on the site is written to the table `future_face.sena_audit` (defined in `lib/schema.ts`; if it doesn't exist yet, the API creates it itself on the first edit).
- **No edit goes without an entry.** The entry is written in the same transaction as the edit. If the log is unavailable, the edit is cancelled entirely (503 `audit_unavailable`), and the next attempt recreates the table.
- **What is in an entry:** number, time, action (`texts.put`, `work.patch`, `link.create`, `revert` …), target (`texts/home`, `works/site-a`), request method and address, IP,
  a short description, **before → after** for each field, and the revert steps. Edit texts are stored in full, so an entry shows exactly what changed.
- **What else is written:** dry runs (`preview`), rejections for bad data (`rejected`, with the code and reason) and reads (`read`). Reads and dry runs older than 30 days are erased on their own; edits and rejections are kept forever.
  Wrong keys (other people's attempts) do not go into the log: they are visible only in the server log, so nobody can bloat the DB.
- **Viewing:** `GET /audit` (`?kind=write,rejected`, `?since=2026-10-19`, `?target=texts/home`, `?action=link.create`, `?limit=`, `?full=1`) and `GET /audit/<number>`.
- **Revert:** `POST /audit/<number>/revert` with `{dry_run?, force?}`. Works for any edit: texts and translations, works (fields and lists with translations), contacts, resume blocks, quotes,
  assistant settings and cards, links (create, rename, delete). Something created is removed, something deleted comes back as it was, something changed returns to its previous value.
  - Before reverting, each step is checked against the DB. If that place was changed after the edit (in the admin or by another edit), the revert refuses (409 `conflict`) and shows what changed.
    If the revert is still needed, repeat with `force: true`. A dry run (`dry_run: true`) shows the conflicts and what will be restored, changing nothing.
  - The revert is itself logged and can itself be reverted (so an edit that was reverted by mistake can be brought back). One entry can't be reverted twice.
  - Actions that don't change data stay without a revert: cache reset and analytics export (they are only logged).


## Endpoints
`GET /api/sena/v1` returns the full list with descriptions. In short:

| What | Endpoints |
| --- | --- |
| Phrase search | `GET /texts/search?q=` - where on the site this text lives (in all sections, works, contacts, resume, quotes), with a ready-made edit request |
| Texts | `GET /texts`, `GET /texts/<section>?prefix=&search=&limit=`, `PUT /texts/<section>` `{changes:[{key,value}], dry_run}`; sections: home, about, works, contacts, resume, ai_assistant, ui, heroes, nav, about_blocks |
| Works | `GET /works`, `GET/PATCH /works/<slug>` |
| Contacts, resume, quotes | `/contacts/methods`, `/resume/sections` (+ create and delete), `/quotes` (+ create and delete) |
| Site AI assistant | `GET/PUT /ai/settings`, `/ai/capabilities`, `GET /ai/budget` |
| Links for applications | `GET/POST /links`, `PATCH/DELETE /links/<code>` |
| Analytics | `GET /analytics?range=&link=&parts=`, `POST /analytics/export` |

## Structure
The files live in `lib/sena-api/` (logic) and `app/api/sena/[...path]/route.ts` (a single entry point).
The API only reads and writes the same tables as the admin and uses the same functions (`loadDashboard` for analytics, cache reset by the `content` tag).
