# Mega Rewards

Static front end (11 HTML pages) plus a small accounts API in `api/`.
Accounts, points, entries, tips and plan are stored in a **private Vercel Blob store** (one JSON file per account).

## How it works
| Piece | What it does |
|---|---|
| `*.html` | The site. Shared scripts handle the square cursor, login state and data sync on every page. |
| `api/register` `api/login` `api/logout` `api/me` `api/sync` `api/delete` | Accounts API. Passwords are hashed with scrypt. Sessions are signed, HttpOnly, Secure cookies. |
| Private Blob store | The database. Files are named with a hash of the email and are not publicly readable. |

The browser keeps a local copy for speed and syncs changes to the account about 0.7s after each action.
On another device, logging in loads the same data. A stale device refreshes itself on its next page load.

## Environment variables (Vercel project settings)
- `SESSION_SECRET`: long random string used to sign login cookies. Required.
- `BLOB_READ_WRITE_TOKEN`: added automatically when a Blob store is connected to the project.

## Test accounts (local demos, never touch the database)
| Name | Plan | Email | Password |
|---|---|---|---|
| Alex Morgan | Plus | alex@example.com | Mega1234! |
| Jordan Lee | Free | jordan@example.com | Free1234! |
| Sam Rivera | Mega | sam@example.com | Mega5678! |
| Casey Nguyen | Free | casey@example.com | Fresh1234! |

Anything registered through the Join form is a real account in the database.

## Prototype limits (read before launch)
- Points, entries and savings are calculated in the browser and saved as sent. A real launch should compute them on the server, and run draws server-side.
- No email verification, password reset emails, or rate limiting beyond a short delay on failed logins.
- Photos are Unsplash stand-ins. Geom Graphic needs an Adobe Fonts kit ID (`YOUR_KIT_ID` in each page head).
- If the API is unreachable (for example a page opened from a file), the site falls back to browser-only accounts.
