# Mega Rewards: front-end prototype

Static site. No build step. `index.html` is the home page.

Pages: index, giveaways, tipping, winners, store, plus, rewards, community, partner, account, profile.

## Opening state
The site opens already logged in as the demo member (Alex Morgan, Plus, sample activity).
Log out from the profile page to see the logged-out site. Demo login: alex@example.com / Mega1234!

To ship the logged-out version, find `AUTO=true` in each page and change it to `AUTO=false`.

## Notes for developers
- Accounts, points, entries, cart and plan are stored in the visitor's browser (localStorage). They do not sync across devices and are not secure. All of this logic sits in one script block (`window.MR`) at the bottom of each page, so it can be replaced with API calls.
- Photos are Unsplash stand-ins loaded from images.unsplash.com. Replace with the client's own photography.
- Geom Graphic needs an Adobe Fonts web project: replace `YOUR_KIT_ID` in the `<head>` of each page. Montserrat is the fallback.
