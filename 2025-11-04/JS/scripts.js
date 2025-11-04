<script>
window.addEventListener('DOMContentLoaded', () => {
  // ===============================
  // Persistent storage (localStorage)
  // ===============================
  const STORAGE_KEY = 'editableRewardsSnapshot_v3'; // versioned

  function saveToLocal(snap) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snap)); }
    catch (e) { console.warn('LocalStorage save failed', e); }
  }
  function loadFromLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('LocalStorage load failed', e);
      return null;
    }
  }
  function clearLocal() {
    try { localStorage.removeItem(STORAGE_KEY); }
    catch (e) { /* noop */ }
  }

  // ===== Banner & cards nodes =====
  const card = document.getElementById('rewardsCard');
  let logoImg = document.getElementById('logoImg'); // rebind after replacement
  const logoBox = card.querySelector('[data-edit="logo"]');
  const ribbonEl = card.querySelector('[data-edit="ribbon"]');
  const pillEl = card.querySelector('[data-edit="badge"]');
  const headlineEl = card.querySelector('[data-edit="headline"]');
  const copyEl = card.querySelector('[data-edit="copy"]');
  const tncTextEl = card.querySelector('[data-edit="tncText"]');
  const tncUrlControl = card.querySelector('[data-urlcontrol="tnc"]'); // single source of truth
  const ctaTextEl = card.querySelector('[data-edit="ctaText"]');
  const ctaLinkEl = card.querySelector('[data-edit="ctaLink"]');

  const modalCard = document.getElementById('modalCard');
  const signupCard = document.getElementById('signupCard');
  const successCard = document.getElementById('successCard');

  // ===== Meta form inputs =====
  const metaForm = document.querySelector('.meta-form');
  const metaGrid = metaForm ? metaForm.querySelector('.meta-grid') : null;
  const metaNicheInput = document.getElementById('metaNiche');
  const metaProductIdInput = document.getElementById('metaProductId');
  const metaProductNameInput = document.getElementById('metaProductName');
  const metaProviderNameInput = document.getElementById('metaProviderName');

  // ===== Controls =====
  const generateBtn = document.getElementById('generateBtn');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const resetBtn = document.getElementById('resetBtn');
  const loadJsonBtn = document.getElementById('loadJsonBtn');
  const loadJsonFile = document.getElementById('loadJsonFile');
  const saveJsonBtn = document.getElementById('saveJsonBtn');
  const jsonOutput = document.getElementById('jsonOutput');

  // Fields with rich HTML rendering (preserve innerHTML)
  const HTML_KEYS = new Set([
    'headline',
    'copy',
    'step1Sub','step2Sub','step3Sub',
    'signSubtitle',
    'successSub'
  ]);
  // Only these keys decode literal tags typed by users
  const RICH_EDIT_KEYS = new Set(['copy','step1Sub','step2Sub','step3Sub','signSubtitle','successSub']);

  // ===== Helpers =====
  function enableInlineEdit(el, {selectAll=true}={}){
    if(!el || el.getAttribute('contenteditable')==='true') return;
    el.setAttribute('contenteditable','true');
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    if(selectAll){ sel.removeAllRanges(); sel.addRange(range); }
    el.focus();
  }
  function disableInlineEdit(el){ if(el) el.removeAttribute('contenteditable'); }

  // Only normalize image URLs (logo). Do NOT prepend https for CTA/Terms.
  function normalizeImageUrl(url){
    let u = (url || '').trim();
    if(!u) return '';
    if(/^\/\//.test(u)) u = 'https:' + u;
    if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }

  // Convert literal tags (<b>...</b>) typed as text into real HTML for rich fields
  function decodeLiteralTags(el){
    if (!el || el.getAttribute('contenteditable') !== 'true') return;
    const key = el.dataset.edit;
    if (!RICH_EDIT_KEYS.has(key)) return;
    const txt = el.textContent;
    if (/[<>]/.test(txt)) {
      el.innerHTML = txt; // let the browser parse minimal inline HTML
    }
  }

  // Hard-swap the <img> node to guarantee repaint on logo change
  function setLogo(url){
    if(!logoBox) return;
    const incoming = normalizeImageUrl(url);

    const newImg = document.createElement('img');
    newImg.alt = 'Logo';
    newImg.id = 'logoImg';
    newImg.referrerPolicy = 'no-referrer';
    newImg.style.maxHeight = '60%';
    newImg.style.maxWidth = '80%';
    newImg.style.objectFit = 'contain';
    newImg.style.display = 'block';

    const current = logoImg?.getAttribute('src') || '';
    let finalUrl = incoming;
    if (incoming && current === incoming) {
      const sep = incoming.includes('?') ? '&' : '?';
      finalUrl = `${incoming}${sep}_cb=${Date.now()}`;
    }

    newImg.src = finalUrl || '';
    if (logoImg && logoImg.parentNode === logoBox) {
      logoBox.replaceChild(newImg, logoImg);
    } else {
      logoBox.innerHTML = '';
      logoBox.appendChild(newImg);
    }
    logoImg = newImg;
  }

  // ===== URL popover =====
  const pop = document.getElementById('urlPopover');
  const popInput = document.getElementById('popoverInput');
  const popSave = document.getElementById('popoverSave');
  const popCancel = document.getElementById('popoverCancel');
  const popTitle = document.getElementById('popoverTitle');
  let currentPopoverTarget = null;

  function positionPopover(anchorEl){
    pop.style.visibility='hidden'; pop.style.display='block';
    const rect = anchorEl.getBoundingClientRect();
    const pw = pop.offsetWidth || 320; const ph = pop.offsetHeight || 64;
    let top = rect.bottom + 8 + window.scrollY; let left = rect.left + window.scrollX;
    left = Math.min(left, window.scrollX + window.innerWidth - pw - 12);
    left = Math.max(left, window.scrollX + 12);
    if(top + ph > window.scrollY + window.innerHeight){ top = rect.top - ph - 8 + window.scrollY; }
    pop.style.top = `${top}px`; pop.style.left = `${left}px`; pop.style.visibility='visible';
  }
  function openUrlPopover({title, value, onSave, anchorEl}){
    currentPopoverTarget = { onSave };
    popTitle.textContent = title || 'Set URL';
    popInput.value = value || '';
    if(anchorEl){ positionPopover(anchorEl); } else { pop.style.display = 'block'; }
    popInput.focus(); popInput.select();
  }
  function closeUrlPopover(){ pop.style.display='none'; currentPopoverTarget=null; }
  pop.addEventListener('mousedown', (e)=> e.stopPropagation());
  pop.addEventListener('click', (e)=> e.stopPropagation());
  popSave.addEventListener('click', ()=>{ if(currentPopoverTarget){ currentPopoverTarget.onSave(popInput.value.trim()); } closeUrlPopover(); autosave(); });
  popCancel.addEventListener('click', closeUrlPopover);
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && pop.style.display==='block'){ closeUrlPopover(); } });
  document.addEventListener('mousedown', (e)=>{
    if(pop.style.display==='block' && !pop.contains(e.target) && !e.target.closest('[data-edit="logo"],[data-urlcontrol="tnc"],[data-edit="ctaLink"]')){ closeUrlPopover(); }
  });

  // ===== Click handling for all cards =====
  function attachInlineEditor(root){
    if(!root) return;
    root.addEventListener('click', (e)=>{
      // 1) T&Cs URL popover when clicking the container (not the text span)
      const tncContainer = e.target.closest('[data-urlcontrol="tnc"]');
      if (tncContainer && !e.target.closest('[data-edit="tncText"]')) {
        e.preventDefault();
        openUrlPopover({
          title:'Set Terms URL',
          value: tncContainer.getAttribute('data-href') || '',
          onSave:(url)=>tncContainer.setAttribute('data-href', url), // relative is OK
          anchorEl: tncContainer
        });
        return;
      }
      // 2) Inner editable (including CTA label, T&Cs text, step titles/subs)
      let target = e.target.closest('[data-edit]:not([data-edit="logo"]):not([data-edit="ctaLink"])');
      if(target){
        const key = target.dataset.edit || '';
        if (/^step\d+$/.test(key)) {
          const title = target.querySelector('[data-edit$="Title"]');
          const sub   = target.querySelector('[data-edit$="Sub"]');
          target = title || sub || target;
        }
        e.preventDefault();
        enableInlineEdit(target);
        return;
      }
      // 3) URL controls (logo, CTA link)
      const urlControl = e.target.closest('[data-edit="logo"],[data-edit="ctaLink"]');
      if(urlControl){
        e.preventDefault();
        if(urlControl.matches('[data-edit="logo"]')){
          openUrlPopover({
            title:'Set image URL',
            value: logoImg?.getAttribute('src') || '',
            onSave:(url)=>{ setLogo(url); },
            anchorEl: urlControl
          });
          return;
        }
        if(urlControl.matches('[data-edit="ctaLink"]')){
          openUrlPopover({
            title:'Set button URL e.g. redirect/us/niche/product-redirect-url-us-secure.html',
            value: ctaLinkEl.getAttribute('href')||'',
            onSave:(url)=>ctaLinkEl.setAttribute('href', url), // relative is OK
            anchorEl: urlControl
          });
          return;
        }
      }
    });
    // Save on Enter/Escape/blur for inline edits
    root.addEventListener('keydown', (e)=>{
      const el = e.target;
      if(el && el.getAttribute && el.getAttribute('contenteditable')==='true'){
        if(e.key==='Enter'){
          e.preventDefault();
          decodeLiteralTags(el);   // convert literal tags into HTML for rich fields
          disableInlineEdit(el);
          autosave();
        }
        if(e.key==='Escape'){
          e.preventDefault();
          document.execCommand('undo');
          disableInlineEdit(el);
          autosave();
        }
      }
    });
    root.addEventListener('focusout', (e)=>{
      const el = e.target;
      if(el && el.getAttribute && el.getAttribute('contenteditable')==='true'){
        decodeLiteralTags(el);     // convert literal tags into HTML for rich fields
        disableInlineEdit(el);
        autosave();
      }
    });
  }
  attachInlineEditor(card);
  attachInlineEditor(modalCard);
  attachInlineEditor(signupCard);
  attachInlineEditor(successCard);

  // Disable clicks on modal/success/google buttons (text still editable via spans)
  ['.modal-card [data-nourl]', '.success-card [data-nourl]', '.sign-card .google-btn[data-nourl]'].forEach(sel => {
    document.querySelectorAll(sel).forEach(btn => {
      btn.addEventListener('click', (e)=>{ 
        if (!e.target.closest('[data-edit]')) { e.preventDefault(); e.stopPropagation(); }
      });
    });
  });

  // Keyboard access to open T&Cs popover
  if(tncUrlControl){
    tncUrlControl.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' '){
        e.preventDefault();
        openUrlPopover({
          title:'Set Terms URL',
          value: tncUrlControl.getAttribute('data-href') || '',
          onSave:(url)=>tncUrlControl.setAttribute('data-href', url), // relative is OK
          anchorEl: tncUrlControl
        });
      }
    });
  }

  // ===== Meta form helpers =====
  function readMetaFromForm(){
    return {
      niche: (metaNicheInput?.value || '').trim(),
      productId: (metaProductIdInput?.value || '').trim(),
      productName: (metaProductNameInput?.value || '').trim(),
      providerName: (metaProviderNameInput?.value || '').trim()
    };
  }
  function writeMetaToForm(meta = {}){
    if(metaNicheInput) metaNicheInput.value = meta.niche || '';
    if(metaProductIdInput) metaProductIdInput.value = meta.productId || '';
    if(metaProductNameInput) metaProductNameInput.value = meta.productName || '';
    if(metaProviderNameInput) metaProviderNameInput.value = meta.providerName || '';
  }
  // autosave on meta form input
  [metaNicheInput, metaProductIdInput, metaProductNameInput, metaProviderNameInput].forEach(inp=>{
    if(!inp) return;
    inp.addEventListener('input', ()=> autosave());
  });

  // ===== Helpers for full JSON =====
  function extractStepsForWelcome(root) {
    const steps = [];
    root.querySelectorAll('.steps .step').forEach(stepEl => {
      const titleEl = stepEl.querySelector('[data-edit$="Title"]');
      const subEl   = stepEl.querySelector('[data-edit$="Sub"]');
      steps.push({
        text: (titleEl ? titleEl.textContent.trim() : ''),
        // keep innerHTML in JSON so formatting is preserved
        description: (subEl ? subEl.innerHTML.trim() : '')
      });
    });
    return steps;
  }

  function splitFooterCopyAndTerms(footerText) {
    let copyText = footerText.trim();
    let termsText = "";
    const tcRegex = /\bT&Cs?\s*apply\b\.?/i;
    const match = copyText.match(tcRegex);
    if (match) {
      termsText = match[0].replace(/\.$/, '').trim();
      copyText = copyText.replace(tcRegex, '').trim();
      copyText = copyText.replace(/[.,;:]\s*$/, '').trim();
    }
    return { copyText, termsText };
  }

  // Build FULL JSON (modal + banner + common)
  function buildFullJson() {
    const meta = readMetaFromForm();
    const banner = {
      mode: 'modal',
      title: headlineEl.textContent.trim(),
      ctaText: ctaTextEl.textContent.trim(),
      iconUrl: logoImg?.getAttribute('src') || '',
      // include HTML for banner copy
      copyText: (copyEl ? copyEl.innerHTML.trim() : ''),
      metaData: {
        niche: meta.niche || 'example-niche',
        productId: meta.productId || 'example-product-id',
        productName: meta.productName || 'Example Product',
        redirectUrl: ctaLinkEl.getAttribute('href') || '#', // keep as entered (can be relative)
        providerName: meta.providerName || 'Example Provider'
      },
      badgeText: ribbonEl.textContent.trim().toUpperCase(),
      // Pill text goes here
      nicheText: pillEl ? pillEl.textContent.trim() : '',
      termsText: (tncTextEl ? tncTextEl.textContent.trim() : ''),
      titleHighlight: headlineEl.querySelector('.amount') ? headlineEl.querySelector('.amount').textContent.trim() : ''
    };

    const members_steps = extractStepsForWelcome(modalCard);
    const footerEl = modalCard.querySelector('[data-edit="modalFooter"]');
    const footerText = footerEl ? footerEl.textContent.trim() : '';
    const split = splitFooterCopyAndTerms(footerText);

    const members_detailStep = {
      title: modalCard.querySelector('[data-edit="modalTitle"]')?.textContent.trim() || '',
      ctaText: successCard.querySelector('[data-edit="successCtaText"]')?.textContent.trim() || '',
      // include HTML from sign-note in JSON
      subtitleText: signupCard.querySelector('[data-edit="signSubtitle"]')?.innerHTML.trim() || ''
    };

    const members_welcomeStep = {
      items: members_steps,
      title: modalCard.querySelector('[data-edit="modalTitle"]')?.textContent.trim() || '',
      copyText: split.copyText,
      abortText: modalCard.querySelector('[data-edit="modalSecondaryText"]')?.textContent.trim() || '',
      termsText: split.termsText,
      continueText: modalCard.querySelector('[data-edit="modalPrimaryText"]')?.textContent.trim() || '',
      subtitleText: ''
    };

    const members_redirectStep = {
      title: successCard.querySelector('[data-edit="successTitle"]')?.textContent.trim() || '',
      ctaText: successCard.querySelector('[data-edit="successCtaText"]')?.textContent.trim() || '',
      // include HTML from success-sub in JSON
      subtitleText: successCard.querySelector('[data-edit="successSub"]')?.innerHTML.trim() || ''
    };

    const anonymous_loginStep = {
      title: signupCard.querySelector('[data-edit="signTitle"]')?.textContent.trim() || '',
      // include HTML from sign-note in JSON
      subtitleText: signupCard.querySelector('[data-edit="signSubtitle"]')?.innerHTML.trim() || ''
    };

    const anonymous_welcomeStep = {
      items: members_steps,
      title: modalCard.querySelector('[data-edit="modalTitle"]')?.textContent.trim() || '',
      copyText: footerText,
      abortText: modalCard.querySelector('[data-edit="modalSecondaryText"]')?.textContent.trim() || '',
      termsText: '',
      continueText: modalCard.querySelector('[data-edit="modalPrimaryText"]')?.textContent.trim() || '',
      subtitleText: ''
    };

    const common = {
      termsUrl: (tncUrlControl?.getAttribute('data-href')) || '' // keep as entered (can be relative)
    };

    return {
      modal: {
        members: {
          detailStep: members_detailStep,
          welcomeStep: members_welcomeStep,
          redirectStep: members_redirectStep
        },
        anonymous: {
          loginStep: anonymous_loginStep,
          welcomeStep: anonymous_welcomeStep
        }
      },
      banner,
      common
    };
  }

  // ===== Inverse: apply a FULL JSON into the UI =====
  function setHeadlineWithHighlight(title, highlight){
    if(!headlineEl) return;
    if(!title){ headlineEl.textContent = ''; return; }
    if(highlight){
      const esc = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(esc);
      const replaced = title.replace(re, `<span class="amount">${highlight}</span>`);
      headlineEl.innerHTML = replaced;
    }else{
      headlineEl.textContent = title;
    }
  }

  function setStep(idx, item){
    const n = idx + 1;
    const titleEl = modalCard.querySelector(`[data-edit="step${n}Title"]`);
    const subEl   = modalCard.querySelector(`[data-edit="step${n}Sub"]`);
    if(titleEl) titleEl.textContent = (item && item.text) ? item.text : '';
    // render description with HTML if provided
    if(subEl)   subEl.innerHTML   = (item && item.description) ? item.description : '';
  }

  function applyFullJson(cfg){
    if(!cfg || typeof cfg !== 'object') return;

    // --- Banner ---
    if(cfg.banner){
      const b = cfg.banner;
      setHeadlineWithHighlight(b.title || '', b.titleHighlight || '');
      if(ctaTextEl) ctaTextEl.textContent = b.ctaText || '';
      if(b.iconUrl) setLogo(b.iconUrl);
      // render banner copy with HTML
      if(copyEl) copyEl.innerHTML = b.copyText || '';
      // pill text comes from nicheText (not metaData.niche)
      if(pillEl && typeof b.nicheText === 'string') pillEl.textContent = b.nicheText;
      if(b.metaData){
        // populate meta form from JSON
        writeMetaToForm({
          niche: b.metaData.niche,
          productId: b.metaData.productId,
          productName: b.metaData.productName,
          providerName: b.metaData.providerName
        });
        if(ctaLinkEl && b.metaData.redirectUrl !== undefined) ctaLinkEl.setAttribute('href', b.metaData.redirectUrl);
      }
      if(ribbonEl && b.badgeText !== undefined) ribbonEl.textContent = (b.badgeText || '').toUpperCase();
      if(tncTextEl && b.termsText !== undefined) tncTextEl.textContent = b.termsText || '';
    }

    // --- Common ---
    if(cfg.common && tncUrlControl && cfg.common.termsUrl !== undefined){
      tncUrlControl.setAttribute('data-href', cfg.common.termsUrl);
    }

    // --- Modal flows ---
    const modalCfg = cfg.modal || {};

    // Members.welcomeStep (steps + footer + buttons + title)
    const members = modalCfg.members || {};
    const welcome = members.welcomeStep || {};
    if(welcome.items && Array.isArray(welcome.items)){
      for(let i=0;i<3;i++){ setStep(i, welcome.items[i] || {}); }
    }
    const modalTitle = modalCard.querySelector('[data-edit="modalTitle"]');
    if(modalTitle && welcome.title !== undefined) modalTitle.textContent = welcome.title || '';
    const modalFooter = modalCard.querySelector('[data-edit="modalFooter"]');
    if(modalFooter){
      const copyPart  = welcome.copyText ? welcome.copyText.trim() : '';
      const termsPart = welcome.termsText ? (' ' + welcome.termsText.trim()) : '';
      modalFooter.textContent = (copyPart + termsPart).trim();
    }
    const primarySpan = modalCard.querySelector('[data-edit="modalPrimaryText"]');
    const secondarySpan = modalCard.querySelector('[data-edit="modalSecondaryText"]');
    if(primarySpan && welcome.continueText !== undefined) primarySpan.textContent = welcome.continueText || '';
    if(secondarySpan && welcome.abortText !== undefined) secondarySpan.textContent = welcome.abortText || '';

    // Members.detailStep
    const detail = members.detailStep || {};
    if(modalTitle && detail.title !== undefined) {
      modalTitle.textContent = detail.title || modalTitle.textContent;
    }
    const signSub = signupCard.querySelector('[data-edit="signSubtitle"]');
    // render sign-note with HTML
    if(signSub && detail.subtitleText !== undefined) signSub.innerHTML = detail.subtitleText || '';

    // Members.redirectStep -> success card
    const redirect = members.redirectStep || {};
    const successTitle = successCard.querySelector('[data-edit="successTitle"]');
    const successSub = successCard.querySelector('[data-edit="successSub"]');
    const successCta = successCard.querySelector('[data-edit="successCtaText"]');
    if(successTitle && redirect.title !== undefined) successTitle.textContent = redirect.title || '';
    // render success-sub with HTML
    if(successSub && redirect.subtitleText !== undefined) successSub.innerHTML = redirect.subtitleText || '';
    if(successCta && redirect.ctaText !== undefined) successCta.textContent = redirect.ctaText || '';

    // Anonymous.loginStep -> sign title/subtitle
    const anon = (modalCfg.anonymous || {});
    const login = anon.loginStep || {};
    const signTitle = signupCard.querySelector('[data-edit="signTitle"]');
    const signSubtitle = signupCard.querySelector('[data-edit="signSubtitle"]');
    if(signTitle && login.title !== undefined) signTitle.textContent = login.title || '';
    // render sign-note with HTML
    if(signSubtitle && login.subtitleText !== undefined) signSubtitle.innerHTML = login.subtitleText || '';

    // Persist & refresh JSON view immediately after load
    autosave();
    showJson();
  }

  // ===== JSON output helpers =====
  function showJson() {
    const json = buildFullJson();
    jsonOutput.textContent = JSON.stringify(json, null, 2);
    jsonOutput.style.display = 'block';
    return json;
  }

  // Buttons: Generate / Copy
  generateBtn?.addEventListener('click', () => { showJson(); saveToLocal(snapshot()); });

  copyJsonBtn?.addEventListener('click', async ()=>{
    const json = showJson();
    try{
      await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
      copyJsonBtn.textContent = 'Copied!';
      setTimeout(()=> copyJsonBtn.textContent = 'Copy JSON', 1200);
    }catch(_){}
  });

  // Load from JSON (file -> UI)
  loadJsonBtn?.addEventListener('click', ()=> loadJsonFile?.click());
  loadJsonFile?.addEventListener('change', async (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    try{
      const text = await file.text();
      const cfg = JSON.parse(text);
      applyFullJson(cfg);
      // clear input so selecting same file again still triggers change
      loadJsonFile.value = '';
    }catch(err){
      console.error('Failed to load JSON', err);
      alert('Could not parse JSON file. Please check the file and try again.');
    }
  });

  // Save JSON to disk
  saveJsonBtn?.addEventListener('click', () => {
    const json = buildFullJson();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    a.download = `rewards-config-${yyyy}-${mm}-${dd}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Ctrl/Cmd + S => generate JSON + persist
  document.addEventListener('keydown', (e)=>{
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='s'){
      e.preventDefault();
      showJson();
      saveToLocal(snapshot());
    }
  });

  // ===== Autosave / Restore / Reset =====
  function snapshot(){
    const fields = {};
    document.querySelectorAll('[data-edit]').forEach(el=>{
      const key = el.dataset.edit;
      if (key==='logo' || key==='ctaLink') return;     // skip structural URL holders
      if (/^step\d+$/.test(key)) return;               // keep step wrapper out
      // store innerHTML for rich keys
      fields[key] = HTML_KEYS.has(key) ? el.innerHTML : el.textContent;
    });
    return {
      fields,
      urls:{
        logo: logoImg?.getAttribute('src') || '',
        cta: ctaLinkEl.getAttribute('href') || '',
        tnc: tncUrlControl?.getAttribute('data-href') || ''
      },
      meta: readMetaFromForm()
    };
  }

  function applySnapshot(snap, {resave=true} = {}){
    if(!snap) return;
    Object.entries(snap.fields||{}).forEach(([key,val])=>{
      const el = document.querySelector(`[data-edit="${key}"]`);
      if(el){
        if (HTML_KEYS.has(key)) { el.innerHTML = val; }
        else { el.textContent = val; }
      }
    });
    if(snap.urls){
      if(snap.urls.logo !== undefined) setLogo(snap.urls.logo);
      if(snap.urls.cta  !== undefined) ctaLinkEl.setAttribute('href', snap.urls.cta || '');
      if(tncUrlControl && snap.urls.tnc !== undefined) tncUrlControl.setAttribute('data-href', snap.urls.tnc || '');
    }
    if(snap.meta) writeMetaToForm(snap.meta);
    if(resave) saveToLocal(snap);
  }

  function autosave(){ saveToLocal(snapshot()); }

  function restore(){
    const saved = loadFromLocal();
    if(saved){
      applySnapshot(saved, {resave:false});
    }
  }

  function resetAll(){
    clearLocal();
    applySnapshot(defaultSnapshot, {resave:false});
    jsonOutput.style.display='none';
  }

  // Save after edits to any editable node
  document.addEventListener('input', (e)=>{
    if(e.target && e.target.closest('[data-edit]')) autosave();
  });

  // Reset button
  resetBtn?.addEventListener('click', resetAll);

  // Capture defaults (incl. empty meta form)
  const defaultSnapshot = snapshot();

  // Initial restore (applies autosaved state if present)
  restore();

  // ===============================
  // META FORM: remove stray <br> and empty text nodes (prevent stacking)
  // ===============================
  function cleanMetaForm() {
    if (!metaForm) return;

    // Remove ALL <br> tags inside meta-form
    metaForm.querySelectorAll('br').forEach(br => br.remove());

    // Remove empty text nodes directly under meta-form and its children
    const pruneEmptyTextNodes = (root) => {
      [...root.childNodes].forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
          node.remove();
        }
      });
    };
    pruneEmptyTextNodes(metaForm);
    metaForm.querySelectorAll('.meta-grid, .meta-field, .meta-label').forEach(pruneEmptyTextNodes);
  }

  // Run once now
  cleanMetaForm();

  // Keep it clean if something injects nodes later
  if (metaForm) {
    const mo = new MutationObserver(cleanMetaForm);
    mo.observe(metaForm, { childList: true, subtree: true });
  }

  // Also ensure the grid itself has no <br> as direct children
  function stripMetaGridBRs() {
    if (!metaGrid) return;
    metaGrid.querySelectorAll(':scope > br').forEach(br => br.remove());
  }
  stripMetaGridBRs();
});
</script>
