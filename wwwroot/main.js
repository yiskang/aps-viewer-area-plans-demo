import { initViewer, loadModel } from './viewer.js';

initViewer(document.getElementById('preview')).then(viewer => {
    const urn = window.location.hash?.substring(1);
    setupModelSelection(viewer, urn);
    setupModelUpload(viewer);
    setupAreaPlans(viewer);
});

function setupAreaPlans(viewer) {
    const manageAreaPlansBtn = document.getElementById('manageAreaPlans');
    const addAreaPlansBtn = document.getElementById('addAreaPlans');
    const saveAreaPlanChangesBtn = document.getElementById('saveAreaPlanChanges');
    const cancelAreaPlanChangesBtn = document.getElementById('cancelAreaPlanChanges');

    manageAreaPlansBtn.onclick = () => {
        addAreaPlansBtn.style.display = '';
        saveAreaPlanChangesBtn.style.display = '';
        cancelAreaPlanChangesBtn.style.display = '';
    };

    cancelAreaPlanChangesBtn.onclick = () => {
        addAreaPlansBtn.style.display = 'none';
        saveAreaPlanChangesBtn.style.display = 'none';
        cancelAreaPlanChangesBtn.style.display = 'none';
    };

    saveAreaPlanChangesBtn.onclick = () => {
        addAreaPlansBtn.style.display = 'none';
        saveAreaPlanChangesBtn.style.display = 'none';
        cancelAreaPlanChangesBtn.style.display = 'none';
    };

    addAreaPlansBtn.onclick = function () {
        let areaPlansExt = viewer.getExtension('Autodesk.Das.AreaPlansExtension');

        areaPlansExt.toggleCreateMode();
    };
}

async function setupModelSelection(viewer, selectedUrn) {
    const dropdown = document.getElementById('models');
    dropdown.innerHTML = '';
    try {
        const resp = await fetch('/api/models');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const models = await resp.json();
        dropdown.innerHTML = models.map(model => `<option value=${model.urn} ${model.urn === selectedUrn ? 'selected' : ''}>${model.name}</option>`).join('\n');
        dropdown.onchange = () => onModelSelected(viewer, dropdown.value);
        if (dropdown.value) {
            onModelSelected(viewer, dropdown.value);
        }
    } catch (err) {
        alert('Could not list models. See the console for more details.');
        console.error(err);
    }
}

async function setupModelUpload(viewer) {
    const upload = document.getElementById('upload');
    const input = document.getElementById('input');
    const models = document.getElementById('models');
    upload.onclick = () => input.click();
    input.onchange = async () => {
        const file = input.files[0];
        let data = new FormData();
        data.append('model-file', file);
        if (file.name.endsWith('.zip')) { // When uploading a zip file, ask for the main design file in the archive
            const entrypoint = window.prompt('Please enter the filename of the main design inside the archive.');
            data.append('model-zip-entrypoint', entrypoint);
        }
        upload.setAttribute('disabled', 'true');
        models.setAttribute('disabled', 'true');
        showNotification(`Uploading model <em>${file.name}</em>. Do not reload the page.`);
        try {
            const resp = await fetch('/api/models', { method: 'POST', body: data });
            if (!resp.ok) {
                throw new Error(await resp.text());
            }
            const model = await resp.json();
            setupModelSelection(viewer, model.urn);
        } catch (err) {
            alert(`Could not upload model ${file.name}. See the console for more details.`);
            console.error(err);
        } finally {
            clearNotification();
            upload.removeAttribute('disabled');
            models.removeAttribute('disabled');
            input.value = '';
        }
    };
}

async function onModelSelected(viewer, urn) {
    if (window.onModelSelectedTimeout) {
        clearTimeout(window.onModelSelectedTimeout);
        delete window.onModelSelectedTimeout;
    }
    window.location.hash = urn;
    try {
        const resp = await fetch(`/api/models/${urn}/status`);
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const status = await resp.json();
        switch (status.status) {
            case 'n/a':
                showNotification(`Model has not been translated.`);
                break;
            case 'inprogress':
                showNotification(`Model is being translated (${status.progress})...`);
                window.onModelSelectedTimeout = setTimeout(onModelSelected, 5000, viewer, urn);
                break;
            case 'failed':
                showNotification(`Translation failed. <ul>${status.messages.map(msg => `<li>${JSON.stringify(msg)}</li>`).join('')}</ul>`);
                break;
            default:
                clearNotification();
                loadModel(viewer, urn).then(() => {
                    const manageAreaPlansBtn = document.getElementById('manageAreaPlans');
                    manageAreaPlansBtn.style.display = '';

                    let areaPlansExt = viewer.getExtension('Autodesk.Das.AreaPlansExtension');
                    areaPlansExt.addEventListener(
                        Autodesk.Das.AreaPlans.MODE_CHANGED_EVENT,
                        (event) => {
                            const addAreaPlansBtn = document.getElementById('addAreaPlans');

                            if (event.mode == 'create') {
                                addAreaPlansBtn.innerText = 'Exit Adding Area';
                            } else {
                                addAreaPlansBtn.innerText = 'Add Area';
                            }
                        });
                });
                break;
        }
    } catch (err) {
        alert('Could not load model. See the console for more details.');
        console.error(err);
    }
}

function showNotification(message) {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = `<div class="notification">${message}</div>`;
    overlay.style.display = 'flex';
}

function clearNotification() {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '';
    overlay.style.display = 'none';
}
