let template = {};
const valueMap = new Map();

// Load template from external JSON file
async function loadTemplate(url = 'template.json') {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load template');
        template = await response.json();
        return template;
    } catch (err) {
        console.error(err);
        alert('Could not load template!');
    }
}
