function buildTemplateFromForm() {
    const updatedJSON = JSON.parse(JSON.stringify(template));

    let mainTitleInput = document.querySelector("input[data-field-id='banner.title']");
    const mainTitleValue = mainTitleInput.value || template.banner.title;

    function updateTitles(obj) {
        for (let key in obj) {
            if (key === "title" && obj !== updatedJSON.modal.members.redirectStep) obj[key] = mainTitleValue;
            else if (typeof obj[key] === "object") updateTitles(obj[key]);
        }
    }
    updateTitles(updatedJSON);

    document.querySelectorAll("[data-field-id]").forEach(inp => {
        valueMap.forEach((data)=>{
            if(data.id===inp.dataset.fieldId){
                data.paths.forEach(path=>{
                    let ref=updatedJSON;
                    for(let i=0;i<path.length-1;i++) ref=ref[path[i]];
                    if(!ref[path[path.length-1]] || inp.value!=="") ref[path[path.length-1]]=inp.value;
                });
            }
        });
    });

    return updatedJSON;
}

document.getElementById("generateBtn").addEventListener("click", ()=>{
    const outputEl=document.getElementById("output");
    outputEl.textContent=JSON.stringify(buildTemplateFromForm(),null,4);
    document.getElementById("outputContainer").style.display="block";
});

document.getElementById("copyBtn").addEventListener("click", ()=>{
    const jsonText=document.getElementById("output").textContent;
    if(!jsonText) return;
    navigator.clipboard.writeText(jsonText)
        .then(()=>{ showToast("Copied to clipboard!"); })
        .catch(()=>{ alert("Copy failed!"); });
});
