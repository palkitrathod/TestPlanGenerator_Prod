let currentStep = 1;
const totalSteps = 5;

document.addEventListener('DOMContentLoaded', () => {
    initWizard();
    updateStepUI();
});

function initWizard() {
    // Nav buttons
    document.querySelectorAll('[data-next-step]').forEach(btn => {
        btn.addEventListener('click', () => nextStep());
    });
    
    document.querySelectorAll('[data-prev-step]').forEach(btn => {
        btn.addEventListener('click', () => prevStep());
    });
}

function nextStep() {
    if (currentStep < totalSteps) {
        if (validateStep(currentStep)) {
            currentStep++;
            updateStepUI();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepUI();
    }
}

function updateStepUI() {
    // Update step visibility
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
    });
    document.querySelector(`.step-content[data-step="${currentStep}"]`).classList.add('active');
    
    // Update indicators
    document.querySelectorAll('.step-indicator').forEach(ind => {
        const stepNum = parseInt(ind.dataset.step);
        ind.classList.remove('active', 'completed');
        if (stepNum === currentStep) {
            ind.classList.add('active');
        } else if (stepNum < currentStep) {
            ind.classList.add('completed');
            ind.innerHTML = '<i class="fas fa-check"></i>';
        } else {
            ind.innerText = stepNum;
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(step) {
    const stepEl = document.querySelector(`.step-content[data-step="${step}"]`);
    const inputs = stepEl.querySelectorAll('[required]');
    let valid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            valid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });
    
    return valid;
}

// Jira Toggle
function toggleJiraPanel() {
    const body = document.getElementById('jiraPanelBody');
    const chevron = document.getElementById('jiraChevron');
    body.classList.toggle('open');
    chevron.classList.toggle('fa-chevron-up');
    chevron.classList.toggle('fa-chevron-down');
}

// Generate Preview (Aggregates form data and calls server)
async function generatePreview() {
    const form = document.getElementById('planForm');
    const formData = new FormData(form);
    
    // Show loading
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    try {
        const response = await fetch('/preview', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        renderPreview(data);
        
        // Switch to preview section
        document.getElementById('inputSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'block';
    } catch (error) {
        console.error('Preview failed:', error);
        alert('Failed to generate preview.');
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

function renderPreview(data) {
    // Mapping logic to fill the editable preview
    document.getElementById('previewContent').innerHTML = `
        <div class="doc-paper">
            <h1 class="doc-title">${data.project_name} - Test Plan</h1>
            
            <h2 class="doc-heading">1. Introduction</h2>
            <textarea class="doc-textarea" name="overview">${data.objective || ''}</textarea>
            
            <h2 class="doc-heading">2. Scope</h2>
            <h3 class="doc-heading">2.1 In Scope</h3>
            <textarea class="doc-textarea" name="inscope">${data.in_scope || ''}</textarea>
            <h3 class="doc-heading">2.2 Out of Scope</h3>
            <textarea class="doc-textarea" name="outscope">${data.out_scope || ''}</textarea>
            <h3 class="doc-heading">2.3 Assumptions</h3>
            <textarea class="doc-textarea" name="assumptions">${data.assumptions || ''}</textarea>
            
            <h2 class="doc-heading">3. Strategy</h2>
            <h3 class="doc-heading">3.1 Methodology</h3>
            <textarea class="doc-textarea" name="methodology">${data.methodology || ''}</textarea>
            <h3 class="doc-heading">3.2 Test Levels</h3>
            <textarea class="doc-textarea" name="levels">${data.levels || 'Integration, System, UAT'}</textarea>
            <h3 class="doc-heading">3.3 Automation</h3>
            <textarea class="doc-textarea" name="automation">${data.automation || ''}</textarea>
            
            <h2 class="doc-heading">4. Environment & Data</h2>
            <h3 class="doc-heading">4.1 Environment</h3>
            <textarea class="doc-textarea" name="env">${data.test_env || ''}</textarea>
            <h3 class="doc-heading">4.2 Test Data</h3>
            <textarea class="doc-textarea" name="test_data">${data.test_data || ''}</textarea>
            
            <h2 class="doc-heading">5. Governance</h2>
            <textarea class="doc-textarea" name="roles">${data.roles || ''}</textarea>
            
            <h2 class="doc-heading">6. Schedule & Deliverables</h2>
            <h3 class="doc-heading">6.1 Schedule</h3>
            <textarea class="doc-textarea" name="schedule">Planned Start: ${data.start_date}\nPlanned End: ${data.end_date}</textarea>
            <h3 class="doc-heading">6.2 Deliverables</h3>
            <textarea class="doc-textarea" name="deliverables">${data.deliverables || ''}</textarea>

            <h2 class="doc-heading">7. Risks</h2>
            <textarea class="doc-textarea" name="risks">${data.risks || ''}</textarea>
        </div>
    `;
}

function showForm() {
    document.getElementById('inputSection').style.display = 'block';
    document.getElementById('previewSection').style.display = 'none';
}

async function downloadDocx() {
    // Get edited data from textareas
    const previewData = {};
    document.querySelectorAll('.doc-textarea').forEach(ta => {
        previewData[ta.name] = ta.value;
    });
    
    // Add other hidden or static info
    previewData.project_name = document.querySelector('[name="project_name"]').value;

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
    document.body.appendChild(a);
    a.click();
    a.remove();
}
