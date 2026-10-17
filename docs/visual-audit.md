# Mega Rewards — visual audit and asset plan

Scope: all 11 pages of the repository (`index`, `giveaways`, `tipping`, `rewards`, `plus`, `store`, `community`, `winners`, `partner`, `account`, `profile`). `testing.html` is a leftover push-test page and was excluded.

## 1. Method, and what could not be verified

- **Code audit (complete):** every `<img>`, every JavaScript data array that feeds images (prize cards, partner tiles, products, winners, moments, tips), alt text and video/embed usage were inventoried per page.
- **Instagram and Facebook (blocked):** `instagram.com/mega_rewards` and `facebook.com/megarewardsau` return *robots disallowed* to automated tools, as do the other Facebook pages. No reel, post or image from those accounts could be opened, watched or verified. **No post URLs are listed in this document because none could be verified.**
- **Image content (not visually verified):** the image CDN is not reachable from the audit environment, so the current photos could not be viewed. Subjects below come from the site's own labels and alt text in the code, not from looking at the pictures. Please eyeball the top-reused photos on a live device.
- **Replacement photos (none swapped in):** searches for free-licence photos of Australian rules football and rugby league returned only paid editorial libraries (Getty, iStock) and no free photo with a verifiable ID. Nothing unverified was substituted. See section 6.

## 2. Verified brand context (public official sources)

| Fact | Source |
|---|---|
| Adelaide 36ers named Mega Rewards Major Partner (front-of-jersey, activations at every home game, courtside eight-seater box giveaway) | https://www.adelaide36ers.com/news/adelaide-36ers-unveil-mega-rewards-as-new-major-partner |
| Perth Wildcats: Mega Rewards Half Court Shot, $10,000 at home games (RAC Arena) | https://wildcats.com.au/news/mega-rewards-10k-half-court-shot-returns-for-nbl26 |
| Tickford Racing partnership announced 16 Feb 2026 (Supercars "money can't buy" experiences) | https://www.tickfordracing.com.au/news/mega-rewards-joins-tickford-racing |
| SA Business Chamber bp Adelaide Grand Final luncheon support | https://sabusinesschamber.com.au/news/mega-rewards-helping-sa-businesses-get-noticed-engage-customers-give-back |

Images on those club sites are press imagery and are **not** licensed for reuse by default. As official partner, Mega Rewards should ask each club for its approved media kit (status: *requires approval*).

## 3. Most important problems found

1. **25 photos power the whole site, and a handful are reused everywhere.** The top photo appears 12 times on 8 pages. Matrix below.
2. **Wrong-sport imagery.** The AFL tipping tile uses a photo the code labels basketball, and the NRL tile uses another basketball photo (both labelled in `community.html` as JackJumpers and NBL).
3. **"Mega Moments" look like video but are not.** `community.html` shows play badges on stock photos that linked to `#`. Captions describe real social posts (sim session, Bendigo Blitz, DJ Vasiljevic), but the thumbnails are generic stock. The heading says "34 moments. Hover to watch." while 5 cards render and nothing plays on hover.
4. **Testimonials and winner cards use stock portraits.** Alt text on `winners.html` literally says "(placeholder portrait)" for named winners (Kitty, Mark, Kate and others). Use real, consented photos or initials only.
5. **Confirmed partnerships under-represented.** Adelaide 36ers (Major Partner) and Perth Wildcats (half-court shot) are confirmed by the clubs but appear only in a tipping list, while the partner tiles feature Adelaide United and Tasmania JackJumpers. I could not confirm those two from public sources (Facebook is blocked), so treat them as unverified, not wrong.
6. **Fragile image dependency.** Every photo is an Unsplash CDN ID. Nothing checks they still exist. A missing photo used to show a broken-image icon.
7. **Generic CTA and background reuse.** Closing "Start unlocking Mega value" banners and page headers rotate the same few photos, so pages feel interchangeable.

### Photo reuse matrix (top reused)

| Photo ID | Placements | Pages | What it is used for |
|---|---:|---:|---|
| `1545525201-e1a5a2a18293` | 12 | 8 | Labelled basketball in code (Tasmania JackJumpers tile, Mega Shot for Cash). Also used for the AFL tipping tile, a DJ Vasiljevic moment, the Plus "Pick your level" tile and a profile "Level up" card. |
| `1629217855633-79a6925d6c47` | 13 | 7 | Labelled basketball (NBL tile, VIP Game-Day, NBL tickets). Also used for the NRL tipping tile and a profile "Tip this round" card. |
| `1527269534026-c86f4009eace` | 9 | 7 | Used for Mega Daily cash, a Bendigo Blitz winner moment, the dining category and several closing CTA backgrounds. |
| `1679391029864-d46f366a456b` | 7 | 6 | Alt text "Stadium crowd under lights". Home hero, Adelaide United (football) tile, A-League tipping tile, account/rewards/partner backgrounds. |
| `1534452203293-494d7ddbf7e0` | 9 | 6 | Alt text "Shopping bag". Used for gift cards, the Returnify finance tile, the Mega tier and Plus savings cards. |
| `1690984651796-6bbb102fbf30` | 8 | 5 | Labelled motorsport (bp Adelaide Grand Final). Also the "$1,000" prize tile and Winners/Tipping backgrounds. |
| `1610229452706-666ac2d49c45` | 7 | 5 | Mega tier, streak card, profile and rewards backgrounds. |
| `1560692830-04adc2f31119` | 6 | 4 | Labelled motorsport (Supercars). Also used for the "Win" tile, the Supercheap Auto voucher and a sim moment. |
| `1503266980949-bd30d04d0b7a` | 5 | 4 | Alt text "Confetti celebration". Account, giveaways and a Bendigo Blitz winner moment. |
| `1561715276-a2d087060f1d` | 5 | 4 | Utilities and My Money House (finance) tiles. |
| `1576696058573-12b47c49559e` | 7 | 3 | Alt text "Family on a beach". Free tier, tickets and travel, Plus background. |

Run `node scripts/check-images.cjs --list` for all 25 IDs and `node scripts/check-images.cjs` (needs internet) to confirm each still loads.

## 4. Page-by-page audit and asset plan

Status key: **Keep**, **Approval** (needs written permission), **Restricted** (access blocked), **Candidate** (no verified asset found yet).

| Page / route | Section | Current asset | Proposed | Source | Status |
|---|---|---|---|---|---|
| `/index.html` | Hero | `1679391029864` stadium crowd under lights | Keep; later swap to a real Mega Rewards activation (36ers courtside or Tickford) | Club media kit | Keep / Approval |
| `/index.html` | Experience carousel (4 cards) | Reused motor, basketball, travel and cash photos | One distinct authentic image per card | Club media kit, Mega Rewards channels | Approval / Restricted |
| `/index.html` | Win / Save tiles, $1,000 and $2,500 tiles | Motorsport and shopping photos reused from the carousel | Distinct prize and savings imagery | Candidate search needed | Candidate |
| `/index.html` | Level tiles (Free / Plus / Mega) | Family-on-a-beach photo for Free; unlabelled lifestyle photos for Plus and Mega | Keep; confirm visually | Existing | Keep |
| `/giveaways.html` | Hero, featured and grid cards (Mega Shot, VIP Game-Day, bp Grand Final, fuel, Mega Daily, vouchers) | Basketball and motorsport photos reused 3 to 4 times; voucher cards reuse sport photos | Real prize photos (court, track, partner product shots) | Club and partner media kits | Approval |
| `/tipping.html` | Sport tiles (Supercars, A-League, AFL, NRL) | AFL and NRL tiles use basketball photos | AFL and NRL specific photos | No free-licence match verified | Candidate |
| `/rewards.html` | Header, closing CTA | Reused backgrounds | Distinct hero image per page | Existing / Candidate | Keep |
| `/plus.html` | Hero, plan tiles | Beach and lifestyle photos, one basketball photo on the "Pick your level" tile | Keep; confirm visually | Existing | Keep |
| `/store.html` | Category tiles and products | Product photos plus reused lifestyle photos | Keep | Existing | Keep |
| `/community.html` | Partner tiles | Reused sport photos | Official partner imagery, add 36ers and Wildcats | Club media kits | Approval |
| `/community.html` | Mega Moments (5 cards) | Stock photos with play badges | Real post thumbnails and reel embeds | `instagram.com/mega_rewards` | **Restricted** |
| `/winners.html` | Winner cards, testimonials | Stock portraits with "placeholder" alt text | Real consented winner photos or initials | Mega Rewards | Approval |
| `/partner.html` | Hero, CTA | Reused sport and stadium photos | Partner activation photography | Club media kits | Approval |
| `/account.html` | Background, side image | Stadium and confetti | Keep | Existing | Keep |
| `/profile.html` | Header, "Picked for you" cards | Reused photos | Keep; cards inherit global reuse issue | Existing | Keep |

Decorative images correctly use `alt=""` because their meaning is carried by adjacent text; no content image is missing alt text.

## 5. Instagram reels and video

Status: **Restricted.** No reel could be listed, opened or watched, and none has been downloaded or rehosted.

The five captions already on `/community.html` look like the posts to track down. Each should be matched to its exact post URL by someone with access:

| Caption on the site | Suggested placement | Format |
|---|---|---|
| Cam Waters and Thomas Randle on the Mega Rewards sims, setting the time to beat | Home carousel, Winners (Supercars) | Embedded reel |
| Played a sim. Won a real race car ride. Explain that. | Winners, Giveaways (motorsport) | Embedded reel |
| Bendigo Blitz 2026 wrap, Logan takes the $500 daily prize | Winners | Video card |
| DJ Vasiljevic at the Mega Rewards stand | Community | Video card |
| Congrats to Allo, day 1 winner at the Bendigo Blitz | Winners | Video card |

Implementation (done): each moment accepts a third value with the exact post URL in `community.html`. Instagram reel and post URLs open in an accessible, lazy-loaded official embed dialog (one at a time, Escape and close button, focus returns to the card, nothing loads until clicked). Without a URL a card opens the official Instagram profile in a new tab.

## 6. Replacement imagery: what was and was not possible

- Free-licence option verified to be usable: Unsplash (its licence allows free commercial use without permission). Its photo pages expose the exact CDN ID, title and tags, so replacements can be verified one by one.
- A US NBA fan photo was the only verified basketball result and is irrelevant to an Australian brand, so it was not used.
- Getty and iStock results are paid editorial and not usable.
- **Recommended next step:** supply approved club imagery, or short-list candidate photo pages and each will be verified and swapped in with its ID, licence and crop.

## 7. Implemented in this change

- Instagram and Facebook chips on `/community.html` now link to the official accounts. TikTok stays plain text because no handle was provided.
- Mega Moments cards: real links instead of `#`, accessible embed dialog, new-tab fallback.
- All pages: failed images are hidden instead of showing a broken-image icon.
- `scripts/check-images.cjs`: lists and checks every photo ID.
- This document.

## 8. Manual actions needed

1. Provide the exact URLs for the five reels above (or any others) so they can be wired in.
2. Request an approved media kit from the Adelaide 36ers, Perth Wildcats, Tickford Racing, Adelaide United and Tasmania JackJumpers, and confirm usage terms.
3. Replace stock winner portraits with real consented photos, or switch to initials.
4. Confirm the "34 moments" figure or change the heading to match what is shown.
5. Run `node scripts/check-images.cjs` on a networked machine and replace any missing photos.
6. Confirm the Tasmania JackJumpers and Adelaide United partnerships, and consider adding Adelaide 36ers and Perth Wildcats.
7. Provide a TikTok handle if it should be linked.
