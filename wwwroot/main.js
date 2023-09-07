import { initViewer, loadModel } from './viewer.js';



initViewer(document.getElementById('preview')).then(async viewer => {
    const urn = window.location.hash?.substring(1);
    setupModelSelection(viewer, urn);

    try {
        const resp = await fetch('/api/state');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const serverState = await resp.json();
        if (serverState?.mode !== 'Demonstration') {
            setupModelUpload(viewer);
        }
    } catch (err) {
        console.error('Cannot get demo server state', err);
    }

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

        let areaPlansExt = viewer.getExtension('Autodesk.Das.AreaPlansExtension');
        areaPlansExt.showEditorWidgets();
    };

    cancelAreaPlanChangesBtn.onclick = () => {
        addAreaPlansBtn.style.display = 'none';
        saveAreaPlanChangesBtn.style.display = 'none';
        cancelAreaPlanChangesBtn.style.display = 'none';

        let areaPlansExt = viewer.getExtension('Autodesk.Das.AreaPlansExtension');
        areaPlansExt.reloadMarkups();
    };

    saveAreaPlanChangesBtn.onclick = () => {
        addAreaPlansBtn.style.display = 'none';
        saveAreaPlanChangesBtn.style.display = 'none';
        cancelAreaPlanChangesBtn.style.display = 'none';

        let areaPlansExt = viewer.getExtension('Autodesk.Das.AreaPlansExtension');
        areaPlansExt.saveChanges();
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

    upload.style.display = '';
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
                resetAreaPlanButtonState();

                loadModel(viewer, urn).then(async () => {
                    let areaPlansExt = await viewer.loadExtension('Autodesk.Das.AreaPlansExtension', { autoLoad: false });

                    viewer.addEventListener(
                        Autodesk.Das.AreaPlans.MARKUP_LOADED_EVENT,
                        (event) => {
                            const manageAreaPlansBtn = document.getElementById('manageAreaPlans');
                            manageAreaPlansBtn.style.display = '';
                        },
                        { once: true });

                    viewer.addEventListener(
                        Autodesk.Das.AreaPlans.MODE_CHANGED_EVENT,
                        (event) => {
                            const addAreaPlansBtn = document.getElementById('addAreaPlans');

                            if (event.mode == 'create') {
                                addAreaPlansBtn.innerText = 'Exit Adding Area';
                            } else {
                                addAreaPlansBtn.innerText = 'Add Area';
                            }
                        });

                    viewer.addEventListener(
                        Autodesk.Das.AreaPlans.ERROR_OCCURRED_EVENT,
                        (event) => {
                            let message = event.message;
                            if (event.internalError && event.internalError.code == 403)
                                message = `${event.internalError.detail} (Refresh page to continue playing this demo)`;

                            showNotification(message);
                            //console.warn(`Error Occurred (${event.code}):`, event.message, event.detail, event.internalError);
                        });

                    await areaPlansExt.loadMarkups();
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

function resetAreaPlanButtonState() {
    const manageAreaPlansBtn = document.getElementById('manageAreaPlans');
    const addAreaPlansBtn = document.getElementById('addAreaPlans');
    const saveAreaPlanChangesBtn = document.getElementById('saveAreaPlanChanges');
    const cancelAreaPlanChangesBtn = document.getElementById('cancelAreaPlanChanges');

    manageAreaPlansBtn.style.display = 'none';
    addAreaPlansBtn.style.display = 'none';
    saveAreaPlanChangesBtn.style.display = 'none';
    cancelAreaPlanChangesBtn.style.display = 'none';
}
