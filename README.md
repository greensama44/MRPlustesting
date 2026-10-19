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

## Website Media Manager
Open `/admin/media.html` on the deployed site (or through `vercel dev`) to review the image references actually used by the root website pages. The catalog covers the 25 distinct Unsplash photo IDs found in the 11 media-bearing pages, including images generated dynamically by the storefront, community and winner lists; it does not treat the unreferenced `MR Imagery` and archived `version` folders as live media. There are currently no video elements on the root public pages.

The media manager is intentionally public and does not require an administrator login. Anyone who can access `/admin/media.html` can view the media library, upload files, and save replacements that appear on the public website. Do not use this mode for a site where media changes must be restricted.

The manager still needs the existing `BLOB_READ_WRITE_TOKEN` configured on Vercel to store media mappings and uploads. Storage credentials remain server-side. The manager accepts JPG, PNG, WebP, MP4 and WebM uploads up to 4 MB; direct HTTPS video URLs are also supported. A replacement is applied across every occurrence of its photo ID, matching the page/location list in the manager.

Typing a URL, selecting a library item, or uploading a file only creates a pending replacement. Use **Preview on page** to see pending media in the existing public page at desktop or mobile width, then select **Save Changes** to publish the media mapping. **Discard** restores the current saved choices. Uploaded library files remain reusable if pending mappings are discarded. Media mappings and library metadata are stored separately from member records in the private Blob store. Revision checks detect stale editor tabs; use one editor at a time because Blob storage does not provide atomic compare-and-swap writes.

The APIs require the Vercel runtime and configured Blob storage; opening the HTML files directly with `file://` will not provide uploads or persistent saving.
