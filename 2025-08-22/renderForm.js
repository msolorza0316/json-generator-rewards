// renderForm.js

window.sameCopyState = window.sameCopyState || "No";  
window.sameCopyHandlers = window.sameCopyHandlers || {};  
window.expanderState = window.expanderState || {}; // top-level expander states

function ensureFormCSS() {
    if (document.getElementById("form-extra-css")) return;
    const css = `
    .same-copy-row{ display:flex; align-items:center; gap:10px; margin:10px 0 5px 0; }
    .same-copy-label{ font-weight:600; color:#333; }
    .switch{ position:relative; display:inline-block; width:46px; height:24px; }
    .switch input{ display:none; }
    .slider{ position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:#ccc; transition:.2s; border-radius:9999px; }
    .slider:before{ position:absolute; content:""; height:18px; width:18px; left:3px; top:3px; background:#fff; transition:.2s; border-radius:50%; box-shadow:0 1px 2px rgba(0,0,0,0.15); }
    .switch input:checked + .slider{ background:#28a745; }
    .switch input:checked + .slider:before{ transform:translateX(22px); }
    .same-copy-status{ min-width:24px; text-align:left; color:#555; font-size:13px; }

    .expander-header { cursor:pointer; display:flex; justify-content: space-between; align-items:center; background: #f1f1f1; padding: 5px 10px; border-radius: 4px; margin: 5px 0; }
    .expander-content { display:block; margin-left: 0; }
    .expander-header span { font-weight:600; }
    .expander-header .arrow { transition: transform 0.2s; }
    .collapsed .expander-content { display:none; }
    .collapsed .expander-header .arrow { transform: rotate(-90deg); }

    .toast{ position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#333; color:#fff; padding:10px 20px; border-radius:5px; opacity:0; pointer-events:none; z-index:1000; transition:opacity 0.5s ease; }
    `;
    const style = document.createElement("style");
    style.id = "form-extra-css";
    style.textContent = css;
    document.head.appendChild(style);
}

const FIELDS_TO_MIRROR = ["copyText", "abortText", "termsText", "continueText", "subtitleText"];

function applyMembersSameCopy() {
    const isSame = (window.sameCopyState === "Yes");
    FIELDS_TO_MIRROR.forEach(field => {
        const anonSel = `input[data-field-id="modal.anonymous.welcomeStep.${field}"]`;
        const memSel  = `input[data-field-id="modal.members.welcomeStep.${field}"]`;
        const anonInput = document.querySelector(anonSel);
        const memInput  = document.querySelector(memSel);
        if (!anonInput || !memInput) return;

        const memWrapper = memInput.parentElement;
        if (!memWrapper) return;

        if (isSame) {
            memInput.value = anonInput.value;
            memInput.classList.remove("placeholder");
            memWrapper.style.display = "none";

            const prev = window.sameCopyHandlers[field];
            if (prev && prev.anonEl) {
                try { prev.anonEl.removeEventListener("input", prev.fn); } catch(e) {}
            }

            const fn = () => {
                const curAnon = document.querySelector(anonSel);
                const curMem  = document.querySelector(memSel);
                if (curAnon && curMem) {
                    curMem.value = curAnon.value;
                    curMem.classList.remove("placeholder");
                }
            };
            anonInput.addEventListener("input", fn);
            window.sameCopyHandlers[field] = { fn, anonEl: anonInput };

        } else {
            memWrapper.style.display = "";
            const prev = window.sameCopyHandlers[field];
            if (prev && prev.anonEl) {
                try { prev.anonEl.removeEventListener("input", prev.fn); } catch(e) {}
            }
            delete window.sameCopyHandlers[field];
        }
    });
}

// --- NB Data Puller ---
window.pullNBData = function() {
    if (!window.template || !window.template.banner) return;

    const nbName = document.querySelector("#nb-data #productName")?.textContent.trim();
    const nbRedirect = document.querySelector("#nb-data #redirectURL")?.textContent.trim();
    const nbProvider = document.querySelector("#nb-data #nb-providerID")?.textContent.trim();

    let updated = false;

    if (nbName) {
        const input = document.querySelector('input[data-field-id="banner.productName"]');
        if (input) input.value = nbName;
        window.template.banner.productName = nbName;
        updated = true;
    }
    if (nbRedirect) {
        const input = document.querySelector('input[data-field-id="banner.redirectUrl"]');
        if (input) input.value = nbRedirect;
        window.template.banner.redirectUrl = nbRedirect;
        updated = true;
    }
    if (nbProvider) {
        const input = document.querySelector('input[data-field-id="banner.providerId"]');
        if (input) input.value = nbProvider;
        window.template.banner.providerId = nbProvider;
        updated = true;
    }

    if (updated) showToast("NB data loaded successfully!");
};

// --- Toast ---
function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.opacity = "1";
    setTimeout(() => { toast.style.opacity = "0"; }, 2000);
}

// --- Main redraw ---
function redrawForm() {
    ensureFormCSS();
    const formContainer = document.getElementById("formContainer");
    formContainer.innerHTML = "";

    formContainer.appendChild(renderSection("Banner", template.banner, ["banner"], false, true));
    formContainer.appendChild(renderSection("Modal - Anonymous", template.modal.anonymous, ["modal","anonymous"], true, true));
    formContainer.appendChild(renderSection("Modal - Members", template.modal.members, ["modal","members"], true, true));

    // Wire same copy toggle
    const sameToggle = document.getElementById("sameCopyToggle");
    const sameStatus = document.getElementById("sameCopyStatus");
    if (sameToggle) {
        sameToggle.checked = (window.sameCopyState === "Yes");
        if (sameStatus) sameStatus.textContent = sameToggle.checked ? "Yes" : "No";
        sameToggle.addEventListener("change", () => {
            window.sameCopyState = sameToggle.checked ? "Yes" : "No";
            if (sameStatus) sameStatus.textContent = window.sameCopyState;
            applyMembersSameCopy();
        });
    }

    // Wire Load NB Data button
    const loadNBBtn = document.getElementById("loadNBData");
    if (loadNBBtn) {
        loadNBBtn.addEventListener("click", () => {
            window.pullNBData();
        });
    }

    applyMembersSameCopy();
}


// --- Recursive Section Renderer ---
function renderSection(sectionName, obj, prefix = [], startCollapsed = false, topLevel = false) {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "form-section";

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "expander-content";

    // Top-level expander only
    if (sectionName && topLevel) {
        const header = document.createElement("div");
        header.className = "expander-header";
        const titleSpan = document.createElement("span");
        titleSpan.textContent = sectionName;
        const arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.textContent = "▶";
        header.appendChild(titleSpan);
        header.appendChild(arrow);

        if (window.expanderState[sectionName] === undefined) {
            sectionDiv.classList.toggle("collapsed", sectionName !== "Banner"); // Banner expanded
            window.expanderState[sectionName] = sectionDiv.classList.contains("collapsed");
        } else {
            sectionDiv.classList.toggle("collapsed", window.expanderState[sectionName]);
        }

        header.addEventListener("click", () => {
            sectionDiv.classList.toggle("collapsed");
            window.expanderState[sectionName] = sectionDiv.classList.contains("collapsed");
        });

        sectionDiv.appendChild(header);
    }

    // Members toggle in Anonymous section
    if (sectionName === "Modal - Anonymous") {
        const row = document.createElement("div");
        row.className = "same-copy-row";
        const label = document.createElement("span");
        label.className = "same-copy-label";
        label.textContent = "Members is same copy";

        const switchWrap = document.createElement("label");
        switchWrap.className = "switch";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = "sameCopyToggle";
        const slider = document.createElement("span");
        slider.className = "slider";
        switchWrap.appendChild(cb);
        switchWrap.appendChild(slider);

        const status = document.createElement("span");
        status.id = "sameCopyStatus";
        status.className = "same-copy-status";
        status.textContent = window.sameCopyState === "Yes" ? "Yes" : "No";

        row.appendChild(label);
        row.appendChild(switchWrap);
        row.appendChild(status);
        contentWrapper.appendChild(row);
    }

    // Render banner fields with metadata
    if (prefix.join(".") === "banner") {
        const bannerOrder = ["modal", "niche", "productId", "productName", "providerId", "providerName", "mode", "redirectUrl"];
        bannerOrder.forEach(key => {
            if (obj[key] !== undefined) {
                const fieldId = [...prefix, key].join(".");
                valueMap.set(fieldId, { paths: [[...prefix,key]], id: fieldId });

                const inputEl = renderInput(key, fieldId, obj[key], key === "mode");
                contentWrapper.appendChild(inputEl);

                if (key === "mode" && obj.metaData) {
                    for (let metaKey in obj.metaData) {
                        const metaId = [...prefix,"metaData",metaKey].join(".");
                        valueMap.set(metaId, { paths: [[...prefix,"metaData",metaKey]], id: metaId });
                        contentWrapper.appendChild(renderInput(metaKey, metaId, obj.metaData[metaKey]));
                    }
                }
            }
        });
    }

    // Render remaining fields recursively
    for (let key in obj) {
        if (prefix.join(".") === "banner" && ["modal","niche","productId","productName","providerId","providerName","mode","redirectUrl","metaData"].includes(key)) continue;
        const value = obj[key];
        const path = [...prefix,key];

        if (Array.isArray(value) && key === "items") {
            contentWrapper.appendChild(renderBulletPoints(value, path));
        } else if (typeof value === "object" && value !== null) {
            contentWrapper.appendChild(renderSection(key, value, path, false, false));
        } else {
            const fieldId = path.join(".");
            valueMap.set(fieldId, { paths: [path], id: fieldId });
            contentWrapper.appendChild(renderInput(key, fieldId, value));
        }
    }

    sectionDiv.appendChild(contentWrapper);
    return sectionDiv;
}
