// main.js

document.addEventListener('DOMContentLoaded', async () => {
    // Load template first
    await loadTemplate('template.json');  

    // Redraw the form once template is available
    redrawForm();  

    // Wire Load NB Data button AFTER redraw
    const loadNBBtn = document.getElementById("loadNBData");
    if (loadNBBtn) {
        loadNBBtn.addEventListener("click", () => {
            window.pullNBData(); // populate banner inputs from #nb-data
        });
    }
});
