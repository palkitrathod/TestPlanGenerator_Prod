let currentStep = 0;
const totalSteps = 5;
let selectedEntryMode = 'manual';
let extractedData = null;
let latestPreviewData = null;

function showLoader(text) {
    const overlay = document.getElementById('loadingOverlay');
    const loaderText = document.getElementById('loaderText');
    if (loaderText && text) loaderText.innerText = text;
    if (overlay) overlay.style.display = 'flex';
}

function hideLoader() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

function normalizeToArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
}

document.addEventListener('DOMContentLoaded', () => {
    initWizard();
    initializeRewriteActions();
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

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMultilineText(value) {
    const safeText = escapeHtml(value);
    if (!safeText.trim()) {
        return '<p class="preview-empty">Not provided</p>';
    }

    const lines = safeText.split('\n').map(line => line.trim()).filter(Boolean);
    const isList = lines.every(line => /^(\d+\.|[-*])\s/.test(line));

    if (isList) {
        const items = lines.map(line => line.replace(/^(\d+\.|[-*])\s*/, '').trim());
        return `<ol class="preview-list">${items.map(item => `<li>${item}</li>`).join('')}</ol>`;
    }

    return lines.map(line => `<p>${line}</p>`).join('');
}

function getFieldLabel(field) {
    const labels = {
        project_name: 'Project Name',
        version: 'Document Version',
        objective: 'Project Objective',
        in_scope: 'In Scope',
        out_scope: 'Out of Scope',
        reviewers: 'Reviewers',
        approvers: 'Approvers',
        methodology: 'Methodology',
        metrics: 'Metric Description',
        scenarios: 'Test Scenarios',
        test_env: 'Test Environment',
        roles: 'Roles & Responsibilities',
        risks: 'Risks & Mitigation',
        criteria: 'Entry & Exit Criteria',
        deliverables: 'Deliverables'
    };
    return labels[field] || field;
}

function rewriteTextLocally(text, fieldName = '') {
    const cleanText = String(text || '').trim();
    if (!cleanText) return '';

    const lines = cleanText
        .replace(/\r/g, '')
        .split(/\n+/)
        .map(line => line.trim())
        .filter(Boolean);

    const leadMap = {
        objective: 'The objective of this test plan is to',
        in_scope: 'This test plan covers',
        out_scope: 'This test plan excludes',
        metrics: 'Success metrics include',
        scenarios: 'Key validation scenarios include',
        test_env: 'Testing will be executed in',
        risks: 'Primary risks and mitigations include',
        criteria: 'Entry and exit criteria are defined as',
        deliverables: 'Planned deliverables include'
    };

    if (lines.length === 1 && leadMap[fieldName] && !/[.!?]$/.test(cleanText)) {
        return `${leadMap[fieldName]} ${cleanText.charAt(0).toLowerCase()}${cleanText.slice(1)}.`;
    }

    return lines.map(line => {
        if (/^(\d+\.|[-*])\s/.test(line)) return line;
        const normalized = line.charAt(0).toUpperCase() + line.slice(1);
        return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
    }).join('\n');
}

function initializeRewriteActions() {
    const fields = document.querySelectorAll('#planForm input[type="text"], #planForm textarea');
    fields.forEach(field => {
        if (field.dataset.rewriteReady === 'true') return;
        if (!field.name) return;

        const group = field.closest('.col-12, .col-md-6, .col-md-8, .mb-3, .mb-4') || field.parentElement;
        if (!group) return;

        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'rewrite-btn';
        action.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Rewrite with AI';
        action.addEventListener('click', () => rewriteField(field, action));

        group.classList.add('field-with-ai');
        group.appendChild(action);
        field.dataset.rewriteReady = 'true';
    });
}

async function rewriteField(field, button) {
    const text = field.value.trim();
    if (!text) {
        alert('Enter some text first so it can be rewritten.');
        return;
    }

    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rewriting...';

    try {
        const payload = JSON.stringify({
            text,
            fieldName: field.name
        });

        let response = await fetch('/api/rewrite-field', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
        });

        if (response.status === 404) {
            response = await fetch('/rewrite-field', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            });
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
            throw new Error(data.error || `Failed to rewrite content (${response.status}).`);
        }

        field.value = data.rewritten;
        field.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (error) {
        field.value = rewriteTextLocally(text, field.name);
        field.dispatchEvent(new Event('input', { bubbles: true }));
    } finally {
        button.disabled = false;
        button.innerHTML = originalLabel;
    }
}

function initWizard() {
    document.querySelectorAll('[data-next-step]').forEach(btn => {
        btn.addEventListener('click', () => nextStep());
    });
    document.querySelectorAll('[data-prev-step]').forEach(btn => {
        btn.addEventListener('click', () => prevStep());
    });
    initValidationCleanup();
}

function clearFieldValidation(input) {
    input.classList.remove('is-invalid');

    if (input.type === 'checkbox') {
        const group = document.querySelectorAll(`[name="${input.name}"]`);
        const isGroupValid = Array.from(group).some(checkbox => checkbox.checked);

        if (isGroupValid) {
            group.forEach(checkbox => checkbox.classList.remove('is-invalid'));
            group.forEach(checkbox => {
                const feedback = checkbox.parentNode.querySelector('.invalid-feedback');
                if (feedback) feedback.remove();
            });
        }
        return;
    }

    const feedback = input.parentNode.querySelector('.invalid-feedback');
    if (feedback) feedback.remove();
}

function isFieldValid(input) {
    if (input.type === 'checkbox') {
        const group = document.querySelectorAll(`[name="${input.name}"]`);
        return Array.from(group).some(checkbox => checkbox.checked);
    }

    return Boolean(input.value && input.value.trim());
}

function initValidationCleanup() {
    document.querySelectorAll('#planForm input, #planForm textarea, #planForm select').forEach(input => {
        const eventName = input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'date' ? 'change' : 'input';
        input.addEventListener(eventName, () => {
            if (isFieldValid(input)) {
                clearFieldValidation(input);
            }
        });
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
    latestPreviewData = null;

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
    const urlInput = document.getElementById('toolUrl');
    const issueIdInput = document.getElementById('issueId');

    fields.classList.remove('d-none');

    const config = {
        jira: { 
            url: 'Atlassian URL', 
            key: 'API Token', 
            urlPlaceholder: 'https://org.atlassian.net', 
            idLabel: 'Jira Issue Key', 
            idPlaceholder: 'PROJ-123' 
        },
        azure: { 
            url: 'ADO Org URL', 
            key: 'Personal Access Token', 
            urlPlaceholder: 'https://dev.azure.com/org', 
            idLabel: 'Work Item ID', 
            idPlaceholder: '456' 
        },
        asana: { 
            url: 'Workspace Name (Optional)', 
            key: 'Access Token', 
            urlPlaceholder: 'Workspace ID', 
            idLabel: 'Task ID', 
            idPlaceholder: '123456789' 
        },
        notion: { 
            url: 'Database ID (Optional)', 
            key: 'Integration Secret', 
            urlPlaceholder: 'Database UUID', 
            idLabel: 'Page ID', 
            idPlaceholder: 'a8b9c... (32 chars)' 
        }
    };

    const toolConfig = config[tool] || { url: 'Connection URL', key: 'API Key', urlPlaceholder: '', idLabel: 'Item ID', idPlaceholder: '' };
    
    urlLabel.innerText = toolConfig.url;
    keyLabel.innerText = toolConfig.key;
    urlInput.placeholder = toolConfig.urlPlaceholder;
    
    // Find the ID label span if it exists or use generic
    const idLabelEl = document.querySelector('label[for="issueId"]') || document.querySelector('#issueId').previousElementSibling;
    if (idLabelEl) {
        idLabelEl.innerText = toolConfig.idLabel;
    }
    issueIdInput.placeholder = toolConfig.idPlaceholder;
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
        const formEl = document.getElementById('planForm');
        formData = new FormData(formEl);
        const files = document.getElementById('fileInput').files;
        if (files.length === 0) {
            hideLoader();
            alert('Please select at least one file');
            return;
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
        fillFormFields(extractedData);
        finalizeFromAuto();
    } catch (err) {
        hideLoader();
        alert('Extraction failed: ' + err.message);
    }
}

function fillFormFields(data) {
    if (!data) return;
    const form = document.getElementById('planForm');
    Object.keys(data).forEach(key => {
        const inputs = form.querySelectorAll(`[name="${key}"]`);
        if (!inputs.length) return;

        const value = data[key];

        if (inputs[0].type === 'checkbox') {
            const selectedValues = normalizeToArray(value);
            inputs.forEach(input => {
                input.checked = selectedValues.includes(input.value);
            });
            return;
        }

        const input = inputs[0];
        if (input) {
            input.value = Array.isArray(value) ? value.join(', ') : (value || '');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });
}

function showEnhancementPrompt(source) {
    document.getElementById('extractionSource').innerText = source;
    document.getElementById('enhancementPrompt').classList.remove('d-none');
}

function startEnhancement() {
    document.getElementById('enhancementPrompt').classList.add('d-none');
    fillFormFields(extractedData);
    currentStep = 1;
    updateStepUI();
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
        const hasContent = selectedEntryMode === 'upload'
            ? document.querySelector('[name="project_files"]').files.length > 0
            : (document.getElementById('selectedToolInput').value &&
               document.getElementById('toolUrl').value &&
               document.getElementById('toolKey').value);
            
        if (hasContent && !extractedData) {
            handleAutoProcessing(selectedEntryMode);
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
    latestPreviewData = {
        ...data,
        overview: data.overview || data.objective,
        inscope: data.inscope || data.in_scope,
        outscope: data.outscope || data.out_scope,
        env: data.env || data.test_env
    };

    const testingTypes = normalizeToArray(latestPreviewData.testing_types);
    const schedule = latestPreviewData.schedule || `Start Date: ${latestPreviewData.start_date || 'TBD'}\nEnd Date: ${latestPreviewData.end_date || 'TBD'}`;

    document.getElementById('previewContent').innerHTML = `
        <div class="preview-shell">
            <aside class="preview-sidebar glass-card">
                <p class="preview-eyebrow">Preview Mode</p>
                <h3>${escapeHtml(latestPreviewData.project_name || 'Untitled Project')}</h3>
                <div class="preview-meta-stack">
                    <div>
                        <span>Version</span>
                        <strong>${escapeHtml(latestPreviewData.version || '1.0.0')}</strong>
                    </div>
                    <div>
                        <span>Date</span>
                        <strong>${new Date().toLocaleDateString()}</strong>
                    </div>
                    <div>
                        <span>Methodology</span>
                        <strong>${escapeHtml(latestPreviewData.methodology || 'Not provided')}</strong>
                    </div>
                </div>
                <div class="preview-chip-group">
                    ${testingTypes.map(type => `<span class="preview-chip">${escapeHtml(type)}</span>`).join('') || '<span class="preview-chip muted">Testing types pending</span>'}
                </div>
            </aside>

            <div class="doc-paper preview-document">
                <div class="document-hero">
                    <div>
                        <p class="document-kicker">Software Test Plan</p>
                        <h1>${escapeHtml(latestPreviewData.project_name || 'Untitled Project')}</h1>
                    </div>
                    <div class="document-badge">
                        <span>Confidential</span>
                        <strong>Version ${escapeHtml(latestPreviewData.version || '1.0.0')}</strong>
                    </div>
                </div>

                <section class="preview-section">
                    <div class="section-heading">
                        <span>0</span>
                        <h2>Document Control</h2>
                    </div>
                    <div class="preview-grid two-up">
                        <article class="preview-card">
                            <h3>Reviewers</h3>
                            ${formatMultilineText(latestPreviewData.reviewers)}
                        </article>
                        <article class="preview-card">
                            <h3>Approvers</h3>
                            ${formatMultilineText(latestPreviewData.approvers)}
                        </article>
                    </div>
                </section>

                <section class="preview-section">
                    <div class="section-heading">
                        <span>1</span>
                        <h2>Introduction</h2>
                    </div>
                    <article class="preview-card">
                        <h3>Project Objective</h3>
                        ${formatMultilineText(latestPreviewData.overview)}
                    </article>
                </section>

                <section class="preview-section">
                    <div class="section-heading">
                        <span>2</span>
                        <h2>Scope</h2>
                    </div>
                    <div class="preview-grid two-up">
                        <article class="preview-card">
                            <h3>In Scope</h3>
                            ${formatMultilineText(latestPreviewData.inscope)}
                        </article>
                        <article class="preview-card">
                            <h3>Out of Scope</h3>
                            ${formatMultilineText(latestPreviewData.outscope)}
                        </article>
                    </div>
                </section>

                <section class="preview-section">
                    <div class="section-heading">
                        <span>3</span>
                        <h2>Strategy & Scenarios</h2>
                    </div>
                    <div class="preview-grid">
                        <article class="preview-card">
                            <h3>Methodology</h3>
                            ${formatMultilineText(latestPreviewData.methodology)}
                        </article>
                        <article class="preview-card">
                            <h3>Metrics</h3>
                            ${formatMultilineText(latestPreviewData.metrics)}
                        </article>
                        <article class="preview-card full-width">
                            <h3>Test Scenarios</h3>
                            ${formatMultilineText(latestPreviewData.scenarios)}
                        </article>
                    </div>
                </section>

                <section class="preview-section">
                    <div class="section-heading">
                        <span>4</span>
                        <h2>Environment & Governance</h2>
                    </div>
                    <div class="preview-grid">
                        <article class="preview-card">
                            <h3>Test Environment</h3>
                            ${formatMultilineText(latestPreviewData.env)}
                        </article>
                        <article class="preview-card">
                            <h3>Roles & Responsibilities</h3>
                            ${formatMultilineText(latestPreviewData.roles)}
                        </article>
                        <article class="preview-card">
                            <h3>Risks & Mitigation</h3>
                            ${formatMultilineText(latestPreviewData.risks)}
                        </article>
                        <article class="preview-card">
                            <h3>Entry & Exit Criteria</h3>
                            ${formatMultilineText(latestPreviewData.criteria)}
                        </article>
                    </div>
                </section>

                <section class="preview-section">
                    <div class="section-heading">
                        <span>5</span>
                        <h2>Deliverables & Schedule</h2>
                    </div>
                    <div class="preview-grid two-up">
                        <article class="preview-card">
                            <h3>Deliverables</h3>
                            ${formatMultilineText(latestPreviewData.deliverables)}
                        </article>
                        <article class="preview-card">
                            <h3>Schedule</h3>
                            ${formatMultilineText(schedule)}
                        </article>
                    </div>
                </section>
            </div>
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
    const previewData = latestPreviewData || {
        project_name: document.querySelector('[name="project_name"]').value,
        version: document.querySelector('[name="version"]').value,
        objective: document.querySelector('[name="objective"]')?.value || '',
        in_scope: document.querySelector('[name="in_scope"]')?.value || '',
        out_scope: document.querySelector('[name="out_scope"]')?.value || '',
        reviewers: document.querySelector('[name="reviewers"]')?.value || '',
        approvers: document.querySelector('[name="approvers"]')?.value || '',
        methodology: document.querySelector('[name="methodology"]')?.value || '',
        metrics: document.querySelector('[name="metrics"]')?.value || '',
        scenarios: document.querySelector('[name="scenarios"]')?.value || '',
        test_env: document.querySelector('[name="test_env"]')?.value || '',
        roles: document.querySelector('[name="roles"]')?.value || '',
        risks: document.querySelector('[name="risks"]')?.value || '',
        criteria: document.querySelector('[name="criteria"]')?.value || '',
        deliverables: document.querySelector('[name="deliverables"]')?.value || '',
        start_date: document.querySelector('[name="start_date"]')?.value || '',
        end_date: document.querySelector('[name="end_date"]')?.value || ''
    };
    
    // Add testing_types if not manually overridden by latestPreviewData
    if (!latestPreviewData) {
        const types = Array.from(document.querySelectorAll('[name="testing_types"]:checked')).map(cb => cb.value);
        if (types.length) previewData.testing_types = types;
    }
    
    // Ensure schedule is compiled if missing
    if (!previewData.schedule && previewData.start_date) {
        previewData.schedule = `Start Date: ${previewData.start_date}\nEnd Date: ${previewData.end_date || 'TBD'}`;
    }
    
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

function handleFileSelect(input) {
    const list = document.getElementById('fileList');
    if (!list) return;
    list.innerHTML = Array.from(input.files).map(f => `<div class='text-primary mb-1'><i class='fas fa-check-circle me-2'></i>${f.name}</div>`).join('');
}
