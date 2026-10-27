HOB OPPORTUNITIES — MANUAL SHEET FEEDS / CLOUDFLARE RELEASE

The Google Sheet is the content source. The Apps Script serves typed public feeds and stores newsletter consent. Cloudflare Pages hosts this ocean-themed static front end. There are no Gemini, Claude, or OpenAI API calls in this version.

DEPLOY IN THIS ORDER
1. In the Apps Script project for the /exec URL in assets/config.js, replace the website-feed code with HOB_Manual_Content_Website_Feeds_20261026.gs and save.
2. In Deploy > Manage deployments, edit the Web App deployment whose URL is in config.js, choose New version, and deploy. Execute as the sheet owner; access must allow the public site to read published feeds and receive newsletter signups. If you create a new deployment instead, update API_URL in assets/config.js to its new /exec URL before the Cloudflare upload.
3. Confirm each endpoint is returning its own feed: /exec?type=services, /exec?type=stories, and /exec?type=blueminutes. A typed endpoint must return rows from its matching tab or an empty array. If it returns Main opportunities, the old Apps Script version is still serving that URL; do not upload/diagnose the front end until this is corrected.
4. Confirm the default /exec endpoint returns approved opportunities. Review Status must be exactly Approved; Needs Review, Pending Review and Auto-checked are not human-approved.
5. Upload the contents of this ZIP to the existing Cloudflare Pages project. The site already uses the Apps Script URL in config.js; no Cloudflare hosting/provider change is needed. Purge Cloudflare cache if the old front-end JS persists.
6. Confirm services, stories and Blue Minutes on their pages. A newsletter signup writes the email and consent to the Subscriptions tab; it does not send newsletter emails.

OPPORTUNITY LINKS / SEO
Cards link by URL Slug using a readable path such as /opportunity/nnpcsnepco-scholarship-2026/. HOB ID remains in the data as a stable record identifier. Old ?id= links and /opportunities/:id links remain supported for existing bookmarks. The detail page updates its canonical URL and title after it loads the matching listing.

FEEDS AND PUBLIC DATA
- Default endpoint: approved, unexpired opportunities from Main.
- ?type=services: public services rows from Services/Service.
- ?type=stories: published success stories from Success_Stories/Success Stories/Stories/Testimonials.
- ?type=blueminutes: published Blue Minutes from Blue_Minutes/Blue Minutes/BlueMinutes.
- Secondary feeds are filtered by recognized public status columns when present. Status, review/publication state, verification notes, processing errors and internal fields are not returned to the browser.
- The front end blocks opportunity-shaped records in the other feeds rather than displaying scholarships as stories or ocean facts.
- Blue Minutes rotate through published sheet records. If there are none or the feed is unavailable, locally bundled NOAA-sourced facts appear. The homepage popup opens once per browser session; the button can open the next item. No “Read the source” link is shown.

CONTACT / SUBMISSIONS / NEWSLETTER
Contact: officialhandsonblue@gmail.com. Opportunity submissions open the official Google Form. Newsletter signups are stored in Subscriptions after the visitor checks consent. Configure a mailing service separately before sending email campaigns.

ADSENSE
AdSense remains disabled in this release (ADS_ENABLED=false; client ID blank). You can set up the account now; request site review when the site and its content are ready. After approval, enable formats in AdSense gradually and keep ads away from the Blue Minute dialog and Apply controls.
