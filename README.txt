HOB OPPORTUNITIES — SPREADSHEET-ALIGNED CLOUDFLARE PAGES PACKAGE

This is the website frontend package. It is aligned to the spreadsheet headings supplied for the current HOB Opportunities sheet.

WHERE TO ADD YOUR API URL
1. Open assets/config.js in Notepad or a code editor.
2. Replace PASTE_YOUR_APPS_SCRIPT_WEB_APP_EXEC_URL_HERE with the deployed Apps Script Web App URL ending in /exec.
3. Save the file and upload the full extracted website contents to the existing Cloudflare Pages project.

SPREADSHEET FIELD MAPPING
The frontend reads these exact headers:
ID; Title; Organization; Category; Webpage Caption; Short Caption;
Eligibility and Eligible Countries; Funding and Benefits; Required Qualifications;
Required Documents; Step-by-Step Application Instructions; Direct Application Link;
Deadline and Time Zone; Source Verification Date and Evidence; Full Opportunity Guide;
Publication Status and Public Webpage Link; Last Checked Date and Expiry Status; Date Added.

PUBLICATION STATUS
The frontend recognises Approved, Published, Live, Approved for Publication, Approved - Public, and similar explicit approved/public values. The endpoint should return only fields and rows that are approved for public display.

IMPORTANT SECURITY
The Apps Script code provided earlier returns every row from the spreadsheet. Do not deploy that doGet endpoint publicly unchanged, because it could expose draft/internal rows. Update the API to filter approved records on the server and return only the public fields needed by the site. Never place Gemini API keys in assets/config.js. If a Gemini API key was exposed in shared code, revoke it and replace it using Script Properties.

PAGES
Home, opportunity directory, opportunity details, category directory, saved opportunities, submit opportunity, About, Contact, Privacy, and publishing guidance.

LIMITATIONS
The admin page is public publishing guidance, not a private admin dashboard. The submission page requires a server-side submission endpoint before it can store submissions. Saved opportunities are stored in each visitor's browser.

BRAND ASSET
The header uses assets/hob-logo-approved.png, cropped from the approved Hands on Blue Brand Kit supplied by the user. The visual palette is aligned to the kit's deep navy, ocean blue, and cyan/teal accents.
