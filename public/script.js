let currentStep = 0;
const totalSteps = 5;
let selectedEntryMode = 'manual';
let extractedData = null;

document.addEventListener('DOMContentLoaded', () => {
    initWizard();
    updateStepUI();

    // File list display logic
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    if (fileInput && fileList) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                fileList.innerHTML = `<div class="mb-2"><i class="fas fa-file-alt me-2 text-primary"></i>Selected files:</div>` +
                    files.map(f => `<div class="ms-4">• ${f.name}</div>`).join('');
            } else {
                fileList.innerHTML = '';
            }
        });
    }
});

function initWizard() {
    document.querySelectorAll('[data-next-step]').forEach(btn => {
        btn.addEventListener('click', () => nextStep());
    });
    document.querySelectorAll('[data-prev-step]').forEach(btn => {
        btn.addEventListener('click', () => prevStep());
    });
}

function setEntryMode(mode) {
    selectedEntryMode = mode;
    currentStep = 0;
    extractedData = null; // Clear previous state

    const toolSyncSection = document.getElementById('toolSyncSection');
    const uploadContextArea = document.getElementById('uploadContextArea');

    if (mode === 'sync') {
        toolSyncSection.classList.remove('d-none');
        uploadContextArea.classList.add('d-none');
        nextStep();
    } else if (mode === 'upload') {
        uploadContextArea.classList.remove('d-none');
        toolSyncSection.classList.add('d-none');
        nextStep();
    } else {
        toolSyncSection.classList.add('d-none');
        uploadContextArea.classList.add('d-none');
        nextStep();
    }
}

function resetToSelection() {
    currentStep = 0;
    selectedEntryMode = 'manual';
    extractedData = null;

    // Hide all conditional sections
    document.getElementById('toolSyncSection').classList.add('d-none');
    document.getElementById('uploadContextArea').classList.add('d-none');
    document.getElementById('toolFields').classList.add('d-none');

    // Reset form
    document.getElementById('planForm').reset();

    updateStepUI();
}

function selectTool(tool) {
    if (!tool) {
        document.getElementById('toolFields').classList.add('d-none');
        return;
    }

    const fields = document.getElementById('toolFields');
    const urlLabel = document.getElementById('toolUrlLabel');
    const keyLabel = document.getElementById('toolKeyLabel');

    fields.classList.remove('d-none');

    const labels = {
        jira: { url: 'Atlassian URL', key: 'API Token' },
        azure: { url: 'Org/Project URL', key: 'PAT Token' },
        asana: { url: 'Workspace Name', key: 'Personal Access Token' },
        notion: { url: 'Workspace Link', key: 'Integration Secret' }
    };

    const config = labels[tool] || { url: 'URL / Workspace', key: 'API Key' };
    urlLabel.innerText = config.url;
    keyLabel.innerText = config.key;
}

async function testToolConnection() {
    const tool = document.getElementById('selectedToolInput').value;
    const url = document.getElementById('toolUrl').value;
    const user = document.getElementById('toolUser').value;
    const token = document.getElementById('toolKey').value;

    if (!tool || !url || !token) {
        alert('Please fill in Tool, URL, and Token first.');
        return;
    }

    showLoader('Validating connection...');
    try {
        const res = await fetch('/validate-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool, url, user, token })
        });
        const data = await res.json();
        
        hideLoader();
        if (data.success) {
            alert('Connection successful! You can now proceed to sync.');
        } else {
            alert('Connection failed: ' + (data.error || 'Check your credentials.'));
        }
    } catch (err) {
        hideLoader();
        alert('Connection error: ' + err.message);
    }
}

// Logic for smart processing
async function handleAutoProcessing(type) {
    showLoader(type === 'upload' ? 'Analyzing documents...' : 'Fetching ticket data...');
    let formData = new FormData();
    let url = type === 'upload' ? '/preview' : '/sync-tool-data';
    let sourceName = "your source";

    if (type === 'upload') {
        const files = document.getElementById('fileInput').files;
        if (files.length === 0) {
            hideLoader();
            alert('Please select at least one file');
            return;
        }
        for (let file of files) {
            formData.append('project_files', file); 
        }
        sourceName = files.length === 1 ? files[0].name : `${files.length} documents`;
    } else {
        const toolSelect = document.getElementById('selectedToolInput');
        sourceName = toolSelect.options[toolSelect.selectedIndex].text;
        formData.append('tool', toolSelect.value);
        formData.append('url', document.getElementById('toolUrl').value);
        formData.append('user', document.getElementById('toolUser').value);
        formData.append('token', document.getElementById('toolKey').value); 
        formData.append('id', document.getElementById('issueId')?.value || '');
    }

    try {
        const res = await fetch(url, { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.error || data.success === false) {
            throw new Error(data.error || 'Processing failed');
        }

        extractedData = data.data || data; 
        
        hideLoader();
        finalizeFromAuto(); // Go directly to preview
    } catch (err) {
        hideLoader();
        alert('Extraction failed: ' + err.message);
    }
}

function showEnhancementPrompt(source) {
    document.getElementById('extractionSource').innerText = source;
    document.getElementById('enhancementPrompt').classList.remove('d-none');
}

function startEnhancement() {
    document.getElementById('enhancementPrompt').classList.add('d-none');
    // Pre-fill form with extracted data
    if (extractedData) {
        const form = document.getElementById('planForm');
        Object.keys(extractedData).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input && (!input.value || input.value === '')) {
                input.value = extractedData[key];
            }
        });
        
        // Move to Step 1 of the wizard
        currentStep = 1;
        updateStepUI();
    }
}

function finalizeFromAuto() {
    if (extractedData) {
        renderPreview(extractedData);
        document.getElementById('enhancementPrompt')?.classList.add('d-none');
        document.getElementById('inputSection').classList.add('d-none');
        document.getElementById('previewSection').classList.remove('d-none');
        
        // Ensure steps are updated in background if user clicks Edit
        currentStep = 1;
        updateStepUI();
    }
}

function nextStep() {
    if (currentStep === 1 && (selectedEntryMode === 'upload' || selectedEntryMode === 'sync')) {
        // Special case: if we are in auto mode and have files/tool info, process it
        const hasContent = selectedEntryMode === 'upload' ? 
            document.querySelector('[name="project_files"]').files.length > 0 :
            document.querySelector('[name="tool_url"]').value;
            
        if (hasContent && !extractedData) {
            handleAutoProcessing();
            return;
        }
    }

    if (currentStep < totalSteps) {
        if (validateStep(currentStep)) {
            currentStep++;
            updateStepUI();
        }
    }
}

function prevStep() {
    if (currentStep > 0) {
        currentStep--;
        updateStepUI();
    }
}

function updateStepUI() {
    document.querySelectorAll('.step-content').forEach(step => step.classList.toggle('active', parseInt(step.dataset.step) === currentStep));
    
    document.querySelectorAll('.step-indicator').forEach(ind => {
        const stepNum = parseInt(ind.dataset.step);
        const numberEl = ind.querySelector('.step-number');
        ind.classList.toggle('active', stepNum === currentStep);
        ind.classList.toggle('completed', stepNum < currentStep);
        
        if (numberEl) {
            numberEl.innerHTML = stepNum < currentStep ? '<i class="fas fa-check"></i>' : stepNum;
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(step) {
    if (step === 0) return true;
    const stepEl = document.querySelector(`.step-content[data-step="${step}"]`);
    if (!stepEl) return true;

    const requiredInputs = stepEl.querySelectorAll('[required]:not(.d-none *)');
    let isValid = true;

    stepEl.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    stepEl.querySelectorAll('.invalid-feedback').forEach(el => el.remove());

    requiredInputs.forEach(input => {
        let fieldValid = true;
        if (input.type === 'checkbox') {
            const group = stepEl.querySelectorAll(`[name="${input.name}"]`);
            fieldValid = Array.from(group).some(c => c.checked);
        } else if (!input.value.trim()) {
            fieldValid = false;
        }

        if (!fieldValid) {
            isValid = false;
            input.classList.add('is-invalid');
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.innerText = 'This field is required';
            input.parentNode.appendChild(feedback);
        }
    });

    if (!isValid) stepEl.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return isValid;
}

async function generatePreview() {
    const formData = new FormData(document.getElementById('planForm'));
    showLoader("Finalizing your structured test plan...");
    
    try {
        const response = await fetch('/preview', { method: 'POST', body: formData });
        const data = await response.json();
        renderPreview(data);
        document.getElementById('inputSection').classList.add('d-none');
        document.getElementById('previewSection').classList.remove('d-none');
    } catch (error) {
        alert('Generation failed.');
    } finally {
        hideLoader();
    }
}

function renderPreview(data) {
    document.getElementById('previewContent').innerHTML = `
        <div class="doc-paper glass-card">
            <div class="mb-5 text-end opacity-50">
                <p>Version: ${data.version || '1.0.0'} | Confidential</p>
                <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
            <h1 class="text-center mb-5">${data.project_name}</h1>
            
            <section class="mb-4">
                <h2 class="h5 border-bottom pb-2">0. Document Control</h2>
                <div class="table-responsive">
                    <table class="table table-bordered border-secondary text-white small">
                        <thead><tr><th>Reviewers</th><th>Approvers</th></tr></thead>
                        <tbody><tr>
                            <td><textarea class="doc-textarea" name="reviewers">${data.reviewers || ''}</textarea></td>
                            <td><textarea class="doc-textarea" name="approvers">${data.approvers || ''}</textarea></td>
                        </tr></tbody>
                    </table>
                </div>
            </section>

            <section class="mb-4">
                <h2 class="h5 border-bottom pb-2">1. Introduction</h2>
                <textarea class="doc-textarea" name="overview">${data.objective || ''}</textarea>
            </section>
            
            <section class="mb-4">
                <h2 class="h5 border-bottom pb-2">2. Scope</h2>
                <h6 class="mt-3">2.1 In Scope</h6>
                <textarea class="doc-textarea" name="inscope">${data.in_scope || ''}</textarea>
                <h6 class="mt-3">2.2 Out of Scope</h6>
                <textarea class="doc-textarea" name="outscope">${data.out_scope || ''}</textarea>
            </section>
            
            <section class="mb-4">
                <h2 class="h5 border-bottom pb-2">3. Strategy & Scenarios</h2>
                <h6 class="mt-3">3.1 Methodology</h6>
                <textarea class="doc-textarea" name="methodology">${data.methodology || ''}</textarea>
                <h6 class="mt-3">3.2 Metrics (KPIs)</h6>
                <textarea class="doc-textarea" name="metrics">${data.metrics || ''}</textarea>
                <h6 class="mt-3">3.3 Test Scenarios</h6>
                <textarea class="doc-textarea" name="scenarios" rows="6">${data.scenarios || ''}</textarea>
            </section>
            
            <section class="mb-4">
                <h2 class="h5 border-bottom pb-2">4. Governance & Environment</h2>
                <h6 class="mt-3">4.1 Test Environment</h6>
                <textarea class="doc-textarea" name="env">${data.test_env || ''}</textarea>
                <h6 class="mt-3">4.2 Risks & Mitigation</h6>
                <textarea class="doc-textarea" name="risks">${data.risks || ''}</textarea>
                <h6 class="mt-3">4.3 Entry & Exit Criteria</h6>
                <textarea class="doc-textarea" name="criteria">${data.criteria || ''}</textarea>
            </section>
        </div>
    `;
}

function showForm() {
    document.getElementById('inputSection').classList.remove('d-none');
    document.getElementById('previewSection').classList.add('d-none');
}

function showLoader(text) {
    document.getElementById('loaderText').innerText = text || 'Processing...';
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

async function downloadDocx() {
    const previewData = { project_name: document.querySelector('[name="project_name"]').value, version: document.querySelector('[name="version"]').value };
    document.querySelectorAll('.doc-textarea').forEach(ta => previewData[ta.name] = ta.value);
    
    const response = await fetch('/generate-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewData)
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Test_Plan_${previewData.project_name.replace(/\s+/g, '_')}.docx`;
    a.click();
}
