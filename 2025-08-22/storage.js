// storage.js
document.addEventListener('DOMContentLoaded', () => {

    // Copy JSON button
    const copyBtn = document.getElementById("copyBtn");
    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            const outputEl = document.getElementById("output");
            if (!outputEl || !outputEl.textContent) return;
            navigator.clipboard.writeText(outputEl.textContent)
                .then(() => { showToast("Copied to clipboard!"); })
                .catch(() => { alert("Copy failed!"); });
        });
    }

// Save current form to localStorage and rebuild JSON output
function saveToLocal() {
    const currentData = buildTemplateFromForm();
    localStorage.setItem("savedJSON", JSON.stringify(currentData));
    showToast("Saved locally!");

    // Rebuild JSON output
    const outputEl = document.getElementById("output");
    outputEl.textContent = JSON.stringify(currentData, null, 4);
    document.getElementById("outputContainer").style.display = "block";
}

    // Load saved JSON from localStorage
    function loadFromLocal() {
        const saved = localStorage.getItem("savedJSON");
        if (!saved) {
            showToast("No saved data found.");
            return;
        }

        try {
            const data = JSON.parse(saved);

            // Update template with saved data
            Object.assign(template, data);

            // Re-render form with updated template
            redrawForm();

            // Update output box
            const outputEl = document.getElementById("output");
            outputEl.textContent = JSON.stringify(template, null, 4);
            document.getElementById("outputContainer").style.display = "block";

            showToast("Loaded saved data!");
        } catch (err) {
            console.error(err);
            alert("Failed to load saved data.");
        }
    }

    // Clear form and revert to original template
    function clearFormLocal() {
        localStorage.removeItem("savedJSON");

        // Reload template from JSON file to revert to original
        loadTemplate('template.json').then(() => {
            redrawForm();
            const outputEl = document.getElementById("output");
            outputEl.textContent = "";
            document.getElementById("outputContainer").style.display = "none";
            showToast("Form reverted to original template!");
        });
    }

    // Build template object from form inputs
    function buildTemplateFromForm() {
        const updatedJSON = JSON.parse(JSON.stringify(template));

        // Update all title fields except redirectStep.title
        const mainTitleInput = document.querySelector("input[data-field-id='banner.title']");
        const mainTitleValue = mainTitleInput?.value || template.banner.title;

        function updateTitles(obj) {
            for (let key in obj) {
                if (key === "title" && obj !== updatedJSON.modal.members.redirectStep) obj[key] = mainTitleValue;
                else if (typeof obj[key] === "object") updateTitles(obj[key]);
            }
        }
        updateTitles(updatedJSON);

        // Update all other fields from inputs
        document.querySelectorAll("[data-field-id]").forEach(inp => {
            valueMap.forEach((data) => {
                if (data.id === inp.dataset.fieldId) {
                    data.paths.forEach(path => {
                        let ref = updatedJSON;
                        for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
                        if (!ref[path[path.length - 1]] || inp.value !== "") ref[path[path.length - 1]] = inp.value;
                    });
                }
            });
        });

        return updatedJSON;
    }

    // Attach buttons
    const saveBtn = document.getElementById("saveLocalBtn");
    if (saveBtn) saveBtn.addEventListener("click", saveToLocal);

    const loadBtn = document.getElementById("loadLocalBtn");
    if (loadBtn) loadBtn.addEventListener("click", loadFromLocal);

    const clearBtn = document.getElementById("clearFormBtn");
    if (clearBtn) clearBtn.addEventListener("click", clearFormLocal);

});
