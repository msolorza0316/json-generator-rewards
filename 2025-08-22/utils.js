// utils.js

// --- Toast ---
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = "toast show";
    setTimeout(() => { toast.className = "toast"; }, 2000);
}

// --- Input renderer ---
function renderInput(label, fieldId, defaultValue = "", readOnly = false) {
    const wrapper = document.createElement("div");
    wrapper.className = "input-wrapper";

    const lbl = document.createElement("label");
    lbl.textContent = label;

    const inp = document.createElement("input");
    inp.type = "text";
    inp.dataset.fieldId = fieldId;
    inp.value = "";
    inp.placeholder = defaultValue;
    inp.className = "placeholder";

    if (readOnly) {
        inp.readOnly = true;
        inp.tabIndex = -1;
    } else {
        inp.onfocus = () => { inp.classList.remove("placeholder"); if(inp.value === "") inp.value = ""; };
        inp.onblur = () => { if(inp.value === "") inp.classList.add("placeholder"); };
    }

    wrapper.appendChild(lbl);
    wrapper.appendChild(inp);
    return wrapper;
}

// --- Bullet points renderer ---
function renderBulletPoints(array, path) {
    const container = document.createElement("div");

    array.forEach((item, index) => {
        const bulletDiv = document.createElement("div");
        bulletDiv.className = "bullet-item";

        // Dynamic label above each bullet (does NOT affect JSON)
        const bulletLabel = document.createElement("div");
        bulletLabel.className = "bullet-label";
        bulletLabel.textContent = `Bullet point - ${index + 1}`;
        bulletDiv.appendChild(bulletLabel);

        let mainId = `${path.join(".")}.${index}.text`;
        let secId = `${path.join(".")}.${index}.description`;

        valueMap.set(mainId, { paths: [[...path, index, "text"]], id: mainId });
        valueMap.set(secId, { paths: [[...path, index, "description"]], id: secId });

        bulletDiv.appendChild(renderInput("Main text (bold)", mainId, item.text));
        bulletDiv.appendChild(renderInput("Secondary text", secId, item.description));

        const btnDiv = document.createElement("div");
        btnDiv.className = "item-buttons";

        const addBtn = document.createElement("button");
        addBtn.textContent = "+";
        addBtn.onclick = () => {
            array.splice(index + 1, 0, { text: "", description: "" });
            redrawForm();
        };

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "-";
        removeBtn.onclick = () => {
            if (array.length > 1) {
                array.splice(index, 1);
                redrawForm();
            }
        };

        btnDiv.appendChild(addBtn);
        btnDiv.appendChild(removeBtn);

        bulletDiv.appendChild(btnDiv);
        container.appendChild(bulletDiv);
    });

    return container;
}
