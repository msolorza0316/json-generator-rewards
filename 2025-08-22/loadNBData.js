// loadNBData.js

function loadNBDataIntoForm() {
    const nbData = {
        productName: document.querySelector("#nb-data #productName")?.textContent.trim() || "",
        redirectUrl: document.querySelector("#nb-data #redirectURL")?.textContent.trim() || "",
        providerId: document.querySelector("#nb-data #nb-providerID")?.textContent.trim() || "",
    };

    // Mapping to data-field-id in form
    const mappings = {
        productName: "banner.productName",
        redirectUrl: "banner.redirectUrl",
        providerId: "banner.providerId"
    };

    Object.keys(nbData).forEach(key => {
        const fieldSelector = `input[data-field-id="${mappings[key]}"]`;
        const inputEl = document.querySelector(fieldSelector);
        if (inputEl) {
            inputEl.value = nbData[key];
            // Dispatch input event so any bindings update the JSON
            inputEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
    });

    console.log("NB Data loaded:", nbData);
}

// Hook button after DOM and form are ready
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("loadNBData");
    if (!btn) return;

    // Attach event listener
    btn.addEventListener("click", () => {
        // Ensure form inputs exist
        if (document.querySelector('input[data-field-id="banner.productName"]')) {
            loadNBDataIntoForm();
        } else {
            // If form not yet rendered, wait a short time and try again
            const tryInterval = setInterval(() => {
                if (document.querySelector('input[data-field-id="banner.productName"]')) {
                    clearInterval(tryInterval);
                    loadNBDataIntoForm();
                }
            }, 50);
        }
    });
});
