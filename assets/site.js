/* HOB Opportunities frontend for the current multi-tab Apps Script API. */
(function () {
  'use strict';
  const cfg = window.HOB_SITE_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = { opportunities: [], services: [], stories: [], blueMinutes: [], errors: {} };
  const API_FIELDS = {
    id: ['ID'], title: ['Title', 'Story Title', 'Service Name', 'Name'], slug: ['URL Slug'],
    org: ['Organization', 'Organisation', 'Provider'], cat: ['Category'],
    caption: ['Webpage Caption', 'Short Caption', 'Summary', 'Description', 'Excerpt'],
    eligibility: ['Eligibility and Eligible Countries'], funding: ['Funding and Benefits'],
    qualifications: ['Required Qualifications'], documents: ['Required Documents'],
    steps: ['Step-by-Step Application Instructions'], apply: ['Direct Application Link'],
    deadline: ['Deadline and Time Zone'], guide: ['Full Opportunity Guide'],
    official: ['Official Opportunity URL'], added: ['Date Added']
  };
  const LOCAL_FACTS = [
    { Title: 'The ocean is Earth’s largest living space', Content: 'The ocean covers about 70% of Earth’s surface.', Source: 'NOAA Ocean Exploration', 'Source URL': 'https://oceanexplorer.noaa.gov/ocean-fact/explored/' },
    { Title: 'Most of Earth’s water is in the ocean', Content: 'The ocean holds about 97% of Earth’s water.', Source: 'NOAA Ocean Service', 'Source URL': 'https://oceanservice.noaa.gov/facts/wherewater.html' },
    { Title: 'Tiny ocean life has a major role', Content: 'Scientists estimate roughly half of Earth’s oxygen production comes from the ocean, much of it from plankton.', Source: 'NOAA Ocean Service', 'Source URL': 'https://oceanservice.noaa.gov/facts/ocean-oxygen.html' },
    { Title: 'There is still much to map', Content: 'More than 23% of the seafloor has been mapped in high resolution; much remains to be explored.', Source: 'NOAA Ocean Exploration', 'Source URL': 'https://oceanexplorer.noaa.gov/explainers/mapping/' }
  ];
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  function field(record, names) {
    for (const name of (Array.isArray(names) ? names : [names])) {
      if (record && record[name] != null && String(record[name]).trim()) return String(record[name]).trim();
    }
    return '';
  }
  function safeUrl(raw) {
    try { const u = new URL(String(raw || ''), location.origin); return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? u.href : ''; }
    catch (_) { return ''; }
  }
  function endpoint(type) {
    const base = String(cfg.API_URL || '').trim();
    if (!/^https:\/\//i.test(base) || base.includes('PASTE_YOUR_')) throw new Error('Set the deployed Apps Script /exec URL in assets/config.js.');
    const url = new URL(base); if (type && type !== 'opportunities') url.searchParams.set('type', type); return url.href;
  }
  async function fetchFeed(type) {
    const url = endpoint(type);
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('The Apps Script endpoint did not return a JSON array.');
    // Fail closed if an older Apps Script deployment ignores a content type.
    // Opportunity records must never appear in a services, stories, or ocean feed.
    if (type !== 'opportunities') {
      const isOpportunity = (r) => Boolean(
        /scholar|grant|fellow|intern|training|undergraduate|\bjob\b/i.test(field(r, ['Category'])) ||
        field(r, ['Funding and Benefits']) || field(r, ['Eligibility and Eligible Countries']) ||
        field(r, ['Direct Application Link'])
      );
      if (data.some(isOpportunity)) throw new Error(`The ${type} endpoint returned opportunity listings. Check the Apps Script deployment and the matching sheet tab.`);
      if (type === 'blueminutes') return data.filter((r) => isFeedRowPublished(r) &&
        field(r, ['Title','Headline','Name','Fact Title','News Title']) &&
        field(r, ['Content','Fact','Body','Summary','Description','News','Text','Blue Minute']));
      if (type === 'stories') return data.filter((r) =>
        field(r, ['Title','Story Title','Headline','Name','Beneficiary Name','Person Name']) &&
        field(r, ['Story','Success Story','Testimonial','Story Text','Content','Description','Outcome','Message','Summary','Excerpt']));
      if (type === 'services') return data.filter((r) =>
        field(r, ['Title','Service Name','Name','Service']) &&
        (field(r, ['Description','Summary','Details','Service Description','Content']) || field(r, ['URL','Link','Service URL','Website'])));
      throw new Error(`Unsupported feed type: ${type}`);
    }
    return data;
  }
  function isFeedRowPublished(record) {
    const status = field(record, ['Status','Publication Status','Review Status','Publication Status and Public Webpage Link']);
    return !status || /^(active|published|live|approved|public|visible|yes|true)(\b|\s|[-|])/i.test(status);
  }
  function categoryLabel(raw) {
    const t = String(raw || '').toLowerCase();
    if (t.includes('undergraduate')) return 'Undergraduate opportunities';
    if (t.includes('scholar')) return 'Scholarships';
    if (t.includes('grant') || t.includes('funding') || t.includes('research')) return 'Grants';
    if (t.includes('fellow')) return 'Fellowships';
    if (t.includes('intern')) return 'Internships';
    if (t.includes('blue economy') || (t.includes('blue') && t.includes('job')) || t.includes('career')) return 'Blue jobs';
    if (t.includes('job')) return 'Jobs';
    if (t.includes('training') || t.includes('sponsor')) return 'Trainings & sponsorships';
    return raw || 'Opportunity';
  }
  function recordId(r) { return field(r, API_FIELDS.id) || `${field(r, API_FIELDS.title)}|${field(r, API_FIELDS.org)}`; }
  function slug(r) {
    const supplied=field(r,API_FIELDS.slug); if(supplied)return supplied.toLowerCase();
    return field(r,API_FIELDS.title).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
  function detailUrl(r) { const s=slug(r); return s?`/opportunity/${encodeURIComponent(s)}/`:`/opportunity/?id=${encodeURIComponent(recordId(r))}`; }
  function imageIndex(record) {
    const c = categoryLabel(field(record, API_FIELDS.cat)).toLowerCase();
    let pool = [0,1,2,3,4,5,6,7,8,9];
    if (c.includes('scholar')) pool = [1,5,6,0];
    else if (c.includes('grant')) pool = [3,7,9,4];
    else if (c.includes('fellow')) pool = [2,6,8,1];
    else if (c.includes('intern')) pool = [2,6,1,8];
    else if (c.includes('blue job') || c === 'jobs') pool = [4,2,6,8];
    else if (c.includes('undergraduate')) pool = [1,5,6,2];
    const key = recordId(record) || field(record, API_FIELDS.title) || 'hob';
    let hash = 0; for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    return pool[Math.abs(hash) % pool.length];
  }
  function scene(record, extra) {
    const n = imageIndex(record);
    const alt = `${field(record, API_FIELDS.title) || 'Ocean and opportunity'} — ocean-inspired HOB artwork`;
    return `<div class="ocean-photo scene-${n}${extra ? ` ${extra}` : ''}" role="img" aria-label="${escapeHtml(alt)}"></div>`;
  }
  function savedIds() { try { return JSON.parse(localStorage.getItem('hobSavedOpportunities') || '[]'); } catch (_) { return []; } }
  function toggleSaved(id) {
    const current = savedIds(); const next = current.includes(id) ? current.filter((x) => x !== id) : current.concat(id);
    localStorage.setItem('hobSavedOpportunities', JSON.stringify(next)); renderOpportunityViews();
  }
  function bindSaves(root = document) {
    $$('[data-save]', root).forEach((b) => b.addEventListener('click', () => toggleSaved(b.dataset.save)));
  }
  function cleanListingText(text) {
    const s = String(text || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
    if (!s) return '';
    const low = s.toLowerCase();
    const signals = ['close menu home', 'search asia africa', 'deadlines approaching', 'join our mailing list', 'privacy policy disclaimer contact', 'od live series young person'];
    if (signals.some((x) => low.includes(x))) return '';
    const words = low.match(/[a-z]{3,}/g) || [];
    const navWords = ['home','scholarships','fellowships','jobs','internships','search','contact','grants','blog','specials'];
    if (words.length > 36 && navWords.filter((w) => words.filter((x) => x === w).length >= 3).length >= 3) return '';
    return s;
  }
  function generatedGuide(text) {
    const t = String(text || '').toLowerCase();
    return /(?:^|\n)\s*(overview|eligibility|funding(?: and benefits)?|qualifications|documents|application steps|how to apply)\s*:/m.test(t) ||
      (t.includes('overview:') && t.includes('eligibility:') && t.includes('funding and benefits:'));
  }
  function guideIsRepeated(guide, sections) {
    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const g = normalize(guide); if (!g) return true;
    const sourceParts = sections.map(normalize).filter((s) => s.length > 28);
    return sourceParts.some((s) => g === s || g.includes(s));
  }
  function card(r) {
    const id = recordId(r); const saved = savedIds().includes(id);
    const title = field(r, API_FIELDS.title) || 'Opportunity';
    const cat = categoryLabel(field(r, API_FIELDS.cat));
    const desc = cleanListingText(field(r, API_FIELDS.caption)) || 'Open the listing to review eligibility and official application information.';
    const org = field(r, API_FIELDS.org); const deadline = field(r, API_FIELDS.deadline) || 'See official page';
    return `<article class="op-card">${scene(r,'op-card-photo')}<div class="op-card-body"><div class="card-topline"><span class="tag">${escapeHtml(cat)}</span><span class="mini-wave" aria-hidden="true">〰</span></div><h3><a href="${detailUrl(r)}">${escapeHtml(title)}</a></h3>${org ? `<p class="card-org">${escapeHtml(org)}</p>` : ''}<p class="card-description">${escapeHtml(desc.slice(0,190))}${desc.length>190?'…':''}</p><div class="card-meta"><span>◷ ${escapeHtml(deadline)}</span></div><div class="card-actions"><a class="text-link" href="${detailUrl(r)}">View opportunity <span aria-hidden="true">→</span></a><button class="save-btn ${saved?'saved':''}" type="button" data-save="${escapeHtml(id)}" aria-label="${saved?'Remove saved opportunity':'Save opportunity'}">${saved?'♥ Saved':'♡ Save'}</button></div></div></article>`;
  }
  function draw(target, rows, empty) {
    if (!target) return;
    target.innerHTML = rows.length ? rows.map(card).join('') : `<div class="empty">${escapeHtml(empty || 'No published opportunities are available yet.')}</div>`;
    bindSaves(target);
  }
  function publicFields(record) {
    const sections = [
      ['Eligibility & eligible countries', cleanListingText(field(record, API_FIELDS.eligibility)), '◎'],
      ['Funding & benefits', cleanListingText(field(record, API_FIELDS.funding)), '✦'],
      ['Required qualifications', cleanListingText(field(record, API_FIELDS.qualifications)), '✓'],
      ['Required documents', cleanListingText(field(record, API_FIELDS.documents)), '▤'],
      ['How to apply', cleanListingText(field(record, API_FIELDS.steps)), '→']
    ];
    const guide = cleanListingText(field(record, API_FIELDS.guide));
    const guideExtra = guide && !generatedGuide(guide) && !guideIsRepeated(guide, sections.map((x) => x[1]))
      ? `<details class="guide-toggle"><summary>Read the full opportunity guide</summary><div class="section-copy">${escapeHtml(guide)}</div></details>` : '';
    return sections.filter((x) => x[1]).map(([label,text,icon]) => `<section class="opportunity-section"><span class="section-icon" aria-hidden="true">${icon}</span><div><h2>${escapeHtml(label)}</h2><div class="section-copy">${escapeHtml(text)}</div></div></section>`).join('') + guideExtra;
  }
  function renderDetail() {
    const root = $('#detailRoot'); if (!root) return;
    const p = new URLSearchParams(location.search); const id = p.get('id');
    let pathSlug='';
    const pathMatch=location.pathname.match(/^\/opportunity\/([^/]+)\/?$/i);
    if(pathMatch){try{pathSlug=decodeURIComponent(pathMatch[1]);}catch(_){pathSlug=pathMatch[1];}}
    const querySlug = p.get('slug') || pathSlug;
    const record = state.opportunities.find((r) => (id && recordId(r) === id) || (querySlug && slug(r) === querySlug));
    if (!record) { root.innerHTML = '<div class="empty">This opportunity is unavailable or has been closed. <a href="/opportunities/">Browse current opportunities.</a></div>'; return; }
    const title = field(record, API_FIELDS.title) || 'Opportunity details'; const category = categoryLabel(field(record, API_FIELDS.cat));
    const deadline = field(record, API_FIELDS.deadline) || 'Check the official page';
    const summary = cleanListingText(field(record, ['Webpage Caption','Short Caption']));
    const app = safeUrl(field(record, API_FIELDS.apply)); const official = safeUrl(field(record, API_FIELDS.official)); const apply = app || official;
    const guideOnly = !publicFields(record);
    const applyLabel = apply && apply.toLowerCase().startsWith('mailto:') ? 'Email to apply ↗' : 'Apply on official website ↗';
    const source = official ? `<a class="source-link" href="${escapeHtml(official)}" target="_blank" rel="noopener noreferrer">Official opportunity page ↗</a>` : '';
    root.innerHTML = `<div class="detail-shell"><div class="detail-breadcrumb"><a href="/opportunities/">Opportunities</a><span>›</span><span>${escapeHtml(category)}</span></div><section class="detail-hero">${scene(record,'detail-photo')}<div class="detail-hero-shade"></div><div class="detail-hero-copy"><span class="tag">${escapeHtml(category)}</span><h1>${escapeHtml(title)}</h1><p class="provider">${escapeHtml(field(record,API_FIELDS.org))}</p>${summary?`<p class="detail-summary">${escapeHtml(summary)}</p>`:''}<div class="detail-chips"><span>◷ ${escapeHtml(deadline)}</span><span>✦ HOB opportunity</span></div><div class="detail-hero-actions">${apply?`<a class="btn apply-btn" href="${escapeHtml(apply)}" target="_blank" rel="noopener noreferrer">${applyLabel}</a>`:'<span class="btn apply-btn is-disabled" aria-disabled="true">Application link unavailable</span>'}<button class="save-btn detail-save ${savedIds().includes(recordId(record))?'saved':''}" data-save="${escapeHtml(recordId(record))}">${savedIds().includes(recordId(record))?'♥ Saved':'♡ Save'}</button></div></div></section><div class="journey" aria-label="Application journey"><div class="journey-step current"><i>01</i><span>Explore</span></div><span class="journey-line"></span><div class="journey-step"><i>02</i><span>Prepare</span></div><span class="journey-line"></span><div class="journey-step"><i>03</i><span>Apply</span></div></div><div class="detail-columns"><article class="detail-main">${publicFields(record)||'<div class="empty">More information is available on the official opportunity page.</div>'}</article><aside class="detail-side"><div class="verified-label"><span>✓</span><div><strong>Opportunity details</strong><small>Always confirm the latest criteria with the provider.</small></div></div><div class="side-fact"><span>Category</span><strong>${escapeHtml(category)}</strong></div>${apply?`<a class="btn apply-btn side-apply" href="${escapeHtml(apply)}" target="_blank" rel="noopener noreferrer">${applyLabel}</a>`:''}${source}</aside></div></div>`;
    document.title = `${title} | HOB Opportunities`;
    const canonical=$('link[rel="canonical"]'); if(canonical)canonical.href=`${cfg.DOMAIN||location.origin}${detailUrl(record)}`;
    const ogTitle=$('meta[property="og:title"]'); if(ogTitle)ogTitle.content=`${title} | HOB Opportunities`;
    bindSaves(root);
  }
  function renderOpportunityViews() {
    const all = state.opportunities;
    draw($('#featuredCards'), all.slice(0,6), 'New verified opportunities will appear here.');
    draw($('#directoryCards'), filteredOpportunities(), 'No opportunities match those filters.');
    draw($('#categoryCards'), filteredOpportunities(), 'No opportunities in this category yet.');
    draw($('#savedCards'), all.filter((r) => savedIds().includes(recordId(r))), 'Save an opportunity and it will appear here.');
    const count = $('#resultsCount'); if (count) count.textContent = `${filteredOpportunities().length} opportunities found`;
    const categoryHeading=$('#categoryHeading'); if(categoryHeading) categoryHeading.textContent=new URLSearchParams(location.search).get('name')||'All categories';
    renderDetail();
  }
  function filteredOpportunities() {
    const q = ($('#dirSearch')?.value || new URLSearchParams(location.search).get('q') || '').trim().toLowerCase();
    const cat = ($('#dirCategory')?.value || new URLSearchParams(location.search).get('name') || '').trim().toLowerCase();
    const country = ($('#dirCountry')?.value || '').trim().toLowerCase(); const funding = ($('#dirFunding')?.value || '').trim().toLowerCase();
    return state.opportunities.filter((r) => {
      const text = [field(r,API_FIELDS.title),field(r,API_FIELDS.org),field(r,API_FIELDS.cat),field(r,['Webpage Caption','Short Caption']),field(r,API_FIELDS.eligibility),field(r,API_FIELDS.funding)].join(' ').toLowerCase();
      const category = categoryLabel(field(r,API_FIELDS.cat)).toLowerCase();
      return (!q || text.includes(q)) && (!cat || category === categoryLabel(cat).toLowerCase() || text.includes(cat)) && (!country || field(r,API_FIELDS.eligibility).toLowerCase().includes(country)) && (!funding || field(r,API_FIELDS.funding).toLowerCase().includes(funding));
    });
  }
  function storyTitle(r) { return field(r,['Title','Story Title','Headline','Name','Beneficiary Name','Person Name']) || 'A HOB community story'; }
  function storyBody(r) { return field(r,['Story','Success Story','Testimonial','Story Text','Content','Description','Outcome','Message']); }
  function storyCard(r,i) {
    const person=field(r,['Name','Person Name','Beneficiary Name','Author']); const opportunity=field(r,['Opportunity','Opportunity Title','Programme','Program']);
    const body=storyBody(r); const photo=scene({ID:field(r,['ID'])||storyTitle(r),Title:storyTitle(r),Category:field(r,['Category'])},'story-photo');
    return `<article class="story-card">${photo}<div class="story-card-copy"><span class="story-mark" aria-hidden="true">“</span><h2>${escapeHtml(storyTitle(r))}</h2>${person?`<p class="story-byline">${escapeHtml(person)}${field(r,['Country'])?` · ${escapeHtml(field(r,['Country']))}`:''}</p>`:''}${opportunity?`<p class="story-opportunity">${escapeHtml(opportunity)}</p>`:''}<p>${escapeHtml(body||field(r,['Summary','Excerpt'])||'A story from the HOB community.')}</p></div></article>`;
  }
  function renderStories() {
    const target=$('#storiesCards'); if(!target)return;
    target.innerHTML=state.stories.length?state.stories.map(storyCard).join(''):`<div class="empty"><strong>Success stories are coming soon.</strong><br>When published by HOB, they will appear here.</div>`;
  }
  function serviceTitle(r) { return field(r,['Title','Service Name','Name','Service']) || 'HOB service'; }
  function renderServices() {
    const target=$('#servicesCards'); if(!target)return;
    if(state.errors.services){target.innerHTML='<div class="empty"><strong>Services could not be loaded.</strong><br>Check the deployed Apps Script feed and the Services sheet tab.</div>';return;}
    target.innerHTML=state.services.length?state.services.map((r)=>{
      const desc=field(r,['Description','Summary','Details','Service Description','Content']); const url=safeUrl(field(r,['URL','Link','Service URL','Website']));
      return `<article class="service-card">${scene({ID:serviceTitle(r),Title:serviceTitle(r),Category:field(r,['Category'])},'service-photo')}<div class="service-copy"><span class="tag">Hands on Blue</span><h2>${escapeHtml(serviceTitle(r))}</h2><p>${escapeHtml(desc||'Learn more about this Hands on Blue service.')}</p>${url?`<a class="text-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Learn more ↗</a>`:''}</div></article>`;
    }).join(''):'<div class="empty">No active services are listed yet.</div>';
  }
  function minuteTitle(r) { return field(r,['Title','Headline','Name','Fact Title','News Title']) || 'Blue Minute'; }
  function minuteDate(r) { return field(r,['Date','Published Date','Date Published','Date Added','Timestamp']); }
  function minuteBody(r) { return field(r,['Content','Fact','Body','Summary','Description','News','Text','Blue Minute']).replace(/\s*Read more:\s*https?:\/\/\S+/gi,'').trim(); }
  function minuteCard(r) {
    const body=minuteBody(r);
    return `<article class="minute-card"><div class="minute-icon" aria-hidden="true">🌊</div><div class="minute-copy"><div class="minute-meta">${escapeHtml(minuteDate(r)||'BLUE MINUTE')}</div><h2>${escapeHtml(minuteTitle(r))}</h2><p>${escapeHtml(body||'A new ocean fact or story from HOB.')}</p></div></article>`;
  }
  function renderMinutes() {
    const target=$('#minutesCards'); if(!target)return;
    const items=state.blueMinutes.length?state.blueMinutes:LOCAL_FACTS;
    target.innerHTML=items.map(minuteCard).join('');
  }
  function nextBlueMinute() {
    const feed=state.blueMinutes.length?state.blueMinutes:LOCAL_FACTS;
    const day=Math.floor(Date.now()/86400000); let cursor=0;
    try { cursor=Number(localStorage.getItem('hobBlueMinuteCursor')||0)||0; localStorage.setItem('hobBlueMinuteCursor',String(cursor+1)); } catch (_) {}
    return feed[((day+cursor)%feed.length+feed.length)%feed.length];
  }
  function showBlueMinute(dialog, item) {
    dialog.querySelector('.blue-minute-title').textContent=minuteTitle(item);
    dialog.querySelector('.blue-minute-fact').textContent=minuteBody(item);
    if(!dialog.open){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
  }
  function setupBlueMinuteDialog() {
    let dialog=$('#blueMinuteDialog'); if(!dialog || !$('.blue-minute-modal',dialog)){
      if(dialog)dialog.remove();
      dialog=document.createElement('dialog'); dialog.id='blueMinuteDialog'; dialog.className='blue-minute-dialog';
      dialog.innerHTML='<div class="blue-minute-modal"><button class="blue-minute-close" type="button" aria-label="Close">×</button><span class="blue-minute-kicker">HOB · BLUE MINUTE</span><h2 class="blue-minute-title"></h2><p class="blue-minute-fact"></p><p class="blue-minute-note">A little ocean knowledge, shared by Hands on Blue.</p></div>';
      document.body.appendChild(dialog);
    }
    dialog.querySelector('.blue-minute-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',(e)=>{if(e.target===dialog)dialog.close();});
    $$('[data-blue-minute]').forEach((button)=>button.addEventListener('click',async()=>{
      button.disabled=true;
      let items=state.blueMinutes;
      if(!items.length){try{items=await fetchFeed('blueminutes');state.blueMinutes=items;}catch(_){items=[];}}
      if(!items.length)state.blueMinutes=[];
      showBlueMinute(dialog,nextBlueMinute());
      button.disabled=false;
    }));
    const isHome=location.pathname==='/'||location.pathname==='/index.html';
    if(isHome){
      const openOnce=()=>{
        try { if(sessionStorage.getItem('hobBlueMinuteShown'))return; sessionStorage.setItem('hobBlueMinuteShown','1'); } catch (_) {}
        showBlueMinute(dialog,nextBlueMinute());
      };
      window.hobOpenBlueMinuteWhenReady=openOnce;
    }
  }
  function setupNav() {
    const nav=$('#navLinks'); if(nav){
      nav.innerHTML='<a href="/opportunities/">Opportunities</a><a href="/category/">Categories</a><a href="/services/">Services</a><a href="/blue-minutes/">Blue Minutes</a><a href="/stories/">Success Stories</a><a href="/submit/">Submit</a><a class="btn small" href="/contact/">Contact HOB</a>';
      const active=location.pathname;$$('a',nav).forEach((a)=>{if(a.getAttribute('href')===active)a.setAttribute('aria-current','page');});
    }
    const menu=$('#menuToggle'); if(menu&&nav)menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
    $$('#year').forEach((el)=>el.textContent=String(new Date().getFullYear()));
  }
  function setupFooter() {
    const footer=$('footer.site-footer'); if(!footer)return;
    footer.innerHTML='<div class="wrap"><div class="footer-grid"><div><a class="brand footer-brand" href="/"><img class="brand-logo" src="/assets/hob-logo-approved.png?v=20261026-a" alt="Hands on Blue logo"><span>Opportunities</span></a><p>Discover opportunities for growth, connected to a healthier blue world.</p></div><div><h3>Explore</h3><div class="footer-links"><a href="/opportunities/">All opportunities</a><a href="/category/">Browse categories</a><a href="/services/">Services</a><a href="/submit/">Submit an opportunity</a></div></div><div><h3>Ocean & community</h3><div class="footer-links"><a href="/stories/">Success stories</a><a href="/blue-minutes/">Blue Minutes</a><a href="/about/">About HOB</a><a href="/contact/">Contact</a></div></div></div><section class="newsletter-signup"><div><span class="eyebrow">HOB NOTES</span><h2>Good opportunities, straight to your inbox.</h2><p>Sign up for occasional updates from Hands on Blue. We’ll only use your email for HOB updates.</p></div><form data-newsletter-form><label class="sr-only" for="newsletterEmail">Email address</label><input id="newsletterEmail" name="email" type="email" autocomplete="email" placeholder="Your email address" required><label class="newsletter-consent"><input type="checkbox" name="consent" required> I agree to receive email updates from HOB.</label><button class="btn" type="submit">Subscribe</button><p class="newsletter-status" aria-live="polite"></p></form></section><div class="copyright"><span>© <span id="year"></span> HOB Opportunities</span><span>Confirm opportunity details with the official provider.</span></div></div>';
    const year=$('#year',footer);if(year)year.textContent=String(new Date().getFullYear());
  }
  function setupFilters() {
    ['#dirSearch','#dirCategory','#dirCountry','#dirFunding'].forEach((sel)=>{const el=$(sel);if(el)el.addEventListener(el.tagName==='INPUT'?'input':'change',renderOpportunityViews);});
    const q=new URLSearchParams(location.search).get('q');if(q&&$('#dirSearch'))$('#dirSearch').value=q;
    const name=new URLSearchParams(location.search).get('name');if(name&&$('#dirCategory'))$('#dirCategory').value=categoryLabel(name);
    const form=$('#homeSearch');if(form)form.addEventListener('submit',(e)=>{e.preventDefault();location.href=`/opportunities/?q=${encodeURIComponent($('#homeSearchInput')?.value||'')}`;});
  }
  async function init() {
    setupNav(); setupFooter(); setupBlueMinuteDialog(); setupFilters(); setupNewsletter();
    const isHome=location.pathname==='/'||location.pathname==='/index.html';
    if($('#minutesCards')||isHome){
      try{state.blueMinutes=await fetchFeed('blueminutes');}catch(e){state.errors.blueMinutes=e.message;state.blueMinutes=[];}
      renderMinutes();
      if(isHome&&window.hobOpenBlueMinuteWhenReady){
        let seen=false;try{seen=!!sessionStorage.getItem('hobBlueMinuteShown');}catch(_){}
        if(!seen)window.setTimeout(window.hobOpenBlueMinuteWhenReady,900);
      }
    }
    if ($('#featuredCards')||$('#directoryCards')||$('#categoryCards')||$('#savedCards')||$('#detailRoot')) {
      try { state.opportunities=await fetchFeed('opportunities'); } catch(e) { state.errors.opportunities=e.message; }
      if(state.errors.opportunities){const n='<div class="notice">Opportunity listings are temporarily unavailable. Please try again soon.</div>';['#featuredCards','#directoryCards','#categoryCards','#savedCards','#detailRoot'].forEach((s)=>{const el=$(s);if(el)el.innerHTML=n;});}
      else renderOpportunityViews();
    }
    if($('#storiesCards')){try{state.stories=await fetchFeed('stories');}catch(e){state.errors.stories=e.message;}renderStories();}
    if($('#servicesCards')){try{state.services=await fetchFeed('services');}catch(e){state.errors.services=e.message;}renderServices();}
  }
  function setupNewsletter(){
    $$('[data-newsletter-form]').forEach((form)=>form.addEventListener('submit',async(e)=>{
      e.preventDefault();const status=$('.newsletter-status',form);const button=$('button[type="submit"]',form);const email=$('input[name="email"]',form)?.value.trim();const consent=$('input[name="consent"]',form)?.checked;
      if(!email||!consent){if(status)status.textContent='Enter your email and confirm consent to subscribe.';return;}
      if(!cfg.API_URL){if(status)status.textContent='Newsletter signup is temporarily unavailable.';return;}
      button.disabled=true;if(status)status.textContent='Sending…';
      try{await fetch(cfg.API_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({email:email,consent:true,source:'HOB website newsletter'})});form.reset();if(status)status.textContent='Signup request sent. Please check the Subscriptions tab to confirm it was recorded; no confirmation email is sent yet.';}
      catch(_){if(status)status.textContent='We could not send that just now. Please try again later.';}
      finally{button.disabled=false;}
    }));
  }
  document.addEventListener('DOMContentLoaded',init);
})();


