// ---------------------------------------------------------
// SERVERLESS FIX: Mock 'canvas' to prevent Vercel crashes
// ---------------------------------------------------------
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    // Block these specific IDs that cause Vercel to fail
    if (id === 'canvas' || id === '@napi-rs/canvas') {
        // Return a dummy object to satisfy the require without loading binary
        return {};
    }
    return originalRequire.apply(this, arguments);
};
// ---------------------------------------------------------

const express = require('express');
const multer = require('multer');
const path = require('path');
// using legacy build for node environment compatibility
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const mammoth = require('mammoth');
const { generateTestPlan } = require('./tools/generate_plan');
const { fetchJiraTicket } = require('./tools/jira_reader');
const { fetchAdoWorkItem, fetchAsanaTask, fetchNotionPage } = require('./tools/external_readers');
const { rewriteText, analyzeDocumentWithAI } = require('./tools/rewrite_text');

const app = express();
const port = 3000;

function buildDefaultPlanData(overrides = {}) {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);

    return {
        project_name: "External Sync Project",
        objective: "Requirements fetched from external tool.",
        in_scope: "Core features defined in ticket/task.",
        out_scope: "Items not explicitly captured in the source artifact.",
        reviewers: "QA Lead",
        approvers: "Product Owner",
        methodology: "Agile (Scrum)",
        testing_types: ["Functional", "Regression"],
        metrics: "Test coverage > 90%\nCritical defects closed before sign-off.",
        scenarios: "1. Main Success Path\n2. Exception Handling",
        test_env: "QA/Staging environment aligned with the latest stable build.",
        roles: "QA Lead: Planning\nQA Engineer: Execution\nDeveloper: Fix validation",
        risks: "Dependency on third-party service availability.",
        criteria: "Entry: Approved build deployed to QA.\nExit: Critical defects closed and planned tests executed.",
        deliverables: "Test Plan, Test Cases, Defect Report, Execution Summary",
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        ...overrides
    };
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 5
    }
});

function runUpload(req, res, middleware) {
    return new Promise((resolve, reject) => {
        middleware(req, res, (error) => {
            if (error) {
                return reject(error);
            }
            resolve();
        });
    });
}

async function extractTextFromUpload(file) {
    const fileName = file.originalname || 'uploaded-file';
    const mimeType = file.mimetype || 'application/octet-stream';
    const buffer = file.buffer;

    if (!buffer || !buffer.length) {
        return '';
    }

    if (mimeType === 'application/pdf') {
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
            disableFontFace: true,
        });
        const doc = await loadingTask.promise;
        let extractedText = `--- Context from PDF: ${fileName} ---\n`;

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            extractedText += strings.join("\n") + "\n";
        }

        return extractedText;
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        return `--- Context from DOCX: ${fileName} ---\n${result.value}\n`;
    }

    return `--- Context from File: ${fileName} ---\n${buffer.toString('utf8')}\n`;
}

// Middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Allow JSON for the final generation step

// Routes
app.get('/ping', (req, res) => {
    res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Step 1: Preview Endpoint
app.post('/preview', async (req, res) => {
    try {
        await runUpload(req, res, upload.array('project_files'));
        console.log(`Processing preview request. Files: ${req.files ? req.files.length : 0}`);
        const formData = req.body;
        let fileContent = "";

        // Handle File Upload Parsing for Multiple Files
        if (req.files && req.files.length > 0) {
            console.log(`Processing ${req.files.length} uploaded files...`);
            
            for (const file of req.files) {
                console.log(`Parsing: ${file.originalname} (${file.mimetype})`);
                fileContent += await extractTextFromUpload(file);
                fileContent += "\n";
            }
        }

        // Smart Extraction Logic for the Test Plan
        const extractField = (patterns, fallback) => {
            if (!fileContent || !fileContent.trim()) return fallback;
            for (const regex of patterns) {
                const match = fileContent.match(regex);
                if (match && match[1]) return match[1].trim();
            }
            return fallback;
        };

        let projectName = extractField([
            /Project:\s*(.*)/i, 
            /Project Title:\s*(.*)/i, 
            /Requirement Name:\s*(.*)/i,
            /Document Name:\s*(.*)/i
        ], formData.project_name || "Enterprise Project");

        let objective = extractField([
            /Objective:\s*(.*)/i, 
            /Goals:\s*(.*)/i, 
            /Purpose:\s*(.*)/i,
            /Introduction:\s*(.*)/i
        ], formData.objective || "The goal is to verify systemic logic and ensure user requirements are met.");

        let scenarios = extractField([
            /Scenario:\s*(.*)/ig, 
            /Steps:\s*(.*)/ig, 
            /Use Cases:\s*(.*)/ig
        ], formData.scenarios || "1. Success Flow\n2. Validation Checks\n3. Negative Input Handling\n4. Performance Check");

        let risks = extractField([
            /Risk:\s*(.*)/i, 
            /Mitigation:\s*(.*)/i, 
            /Assumptions:\s*(.*)/i
        ], formData.risks || "Potential delays in API integration, Hardware environment availability.");

        let inScope = extractField([
            /Scope Description:\s*(.*)/i, 
            /Features:\s*(.*)/i
        ], formData.in_scope || "All core functional modules mentioned in the BRD context.");

        const isDefault = (projectName === "Enterprise Project") || (objective && objective.includes("verify systemic logic"));
        if (isDefault && fileContent.length > 50) {
            console.log("Regex results sparse. Triggering AI document analysis...");
            const aiData = await analyzeDocumentWithAI(fileContent);
            if (aiData) {
                if (aiData.project_name) projectName = aiData.project_name;
                if (aiData.objective) objective = aiData.objective;
                if (aiData.scenarios) scenarios = aiData.scenarios;
                if (aiData.risks) risks = aiData.risks;
                if (aiData.in_scope) inScope = aiData.in_scope;
            }
        }

        // Return JSON for the frontend to render
        res.json(buildDefaultPlanData({
            ...formData,
            project_name: projectName,
            objective: objective,
            in_scope: inScope,
            scenarios: scenarios,
            risks: risks,
            criteria: projectName.includes("Sync") ? "Entry: Jira Ticket Ready. Exit: All criteria met." : (formData.criteria || "Entry: Build Deployed. Exit: All TCs Passed."),
            uploaded_file_content: fileContent
        }));

    } catch (error) {
        console.error("Error generating preview:", error);
        if (error instanceof multer.MulterError) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'Each uploaded file must be 10 MB or smaller.'
                : error.code === 'LIMIT_FILE_COUNT'
                    ? 'You can upload up to 5 files at a time.'
                    : `Upload failed: ${error.message}`;
            return res.status(400).json({
                success: false,
                error: message
            });
        }
        return res.status(500).json({ 
            success: false, 
            error: "Error during file processing: " + error.message 
        });
    }
});

// New Connection Validation Endpoint
app.post('/validate-connection', async (req, res) => {
    const { tool, url, user, token } = req.body;
    console.log(`Validating connection for ${tool} - URL: ${url}`);

    try {
        const cleanUrl = (url || '').replace(/\/$/, '');
        
        if (tool === 'jira') {
            const testUrl = `${cleanUrl}/rest/api/2/myself`;
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`,
                    'Accept': 'application/json'
                }
            });
            const body = await response.json().catch(() => ({}));

            if (response.ok && (body.accountId || body.emailAddress || body.name)) {
                return res.json({ success: true });
            }
            return res.json({ success: false, error: `Auth failed (${response.status}). Ensure URL and credentials match a valid Jira account.` });
        }

        if (tool === 'azure') {
            const testUrl = `${cleanUrl}/_apis/projects?api-version=2.0`;
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`,
                    'Accept': 'application/json'
                }
            });
            const body = await response.json().catch(() => ({}));
            
            if (response.ok && body.value) {
                return res.json({ success: true });
            }
            return res.json({ success: false, error: `Azure DevOps Auth failed (${response.status}). Verify PAT and Org URL.` });
        }

        if (tool === 'asana') {
            const response = await fetch('https://app.asana.com/api/1.0/users/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const body = await response.json().catch(() => ({}));
            
            if (response.ok && body.data && body.data.gid) {
                return res.json({ success: true });
            }
            return res.json({ success: false, error: `Asana Auth failed (${response.status}). Token might be invalid.` });
        }

        if (tool === 'notion') {
            const response = await fetch('https://api.notion.com/v1/users/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Notion-Version': '2022-06-28',
                    'Accept': 'application/json'
                }
            });
            const body = await response.json().catch(() => ({}));
            
            if (response.ok && body.object === 'user') {
                return res.json({ success: true });
            }
            return res.json({ success: false, error: `Notion API error (${response.status}). Check Integration Token and permissions.` });
        }

        res.json({ success: false, error: 'Unrecognized tool: ' + tool });
    } catch (error) {
        console.error('Validation Connection Error:', error);
        res.json({ success: false, error: 'Connection error: ' + error.message });
    }
});

async function handleRewriteField(req, res) {
    try {
        const { text, fieldName } = req.body;
        if (!String(text || '').trim()) {
            return res.status(400).json({ success: false, error: 'Text is required for rewrite.' });
        }

        const rewritten = await rewriteText(text, fieldName);
        res.json({ success: true, rewritten });
    } catch (error) {
        console.error('Error rewriting field:', error.message);
        res.status(500).json({ success: false, error: error.message || 'Failed to rewrite field.' });
    }
}

app.post('/rewrite-field', handleRewriteField);
app.post('/api/rewrite-field', handleRewriteField);


// Step 1b: Sync Tool Data (Jira, ADO, etc.) & Map to Test Plan
app.post('/sync-tool-data', upload.none(), async (req, res) => {
    try {
        const { tool, url, user, token, id } = req.body;

        let planData = buildDefaultPlanData();

        if (tool === 'jira' && id) {
            const jiraData = await fetchJiraTicket(url, user, token, id);
            planData = buildDefaultPlanData({
                project_name: jiraData.project_name || id,
                objective: jiraData.overview || jiraData.objective,
                in_scope: jiraData.inscope || jiraData.in_scope,
                out_scope: jiraData.outscope || jiraData.out_scope,
                methodology: "Agile (Scrum)",
                testing_types: ["Functional", "Regression", "API"],
                metrics: "Acceptance criteria coverage = 100%\nCritical and high defects resolved before sign-off.",
                scenarios: jiraData.strategy || jiraData.scenarios,
                test_env: jiraData.env || jiraData.test_env,
                risks: jiraData.risks,
                criteria: jiraData.process || jiraData.criteria,
                reviewers: jiraData.meta?.reporter || "QA Lead",
                approvers: "QA Lead / Product Owner",
                deliverables: "Test Plan, Linked Jira defects, Execution Summary",
                roles: "QA Lead: Planning and sign-off\nQA Engineer: Test execution\nDeveloper: Defect fixes",
                schedule: jiraData.schedule
            });
        } else if (tool === 'azure' && id) {
            planData = await fetchAdoWorkItem(url, token, id);
        } else if (tool === 'asana' && id) {
            planData = await fetchAsanaTask(token, id);
        } else if (tool === 'notion' && id) {
            planData = await fetchNotionPage(token, id);
        }

        res.json({ success: true, data: planData });
    } catch (error) {
        console.error(`Error fetching ${req.body.tool} data:`, error.message);
        res.status(500).json({ error: error.message || `Failed to fetch ${req.body.tool} data.` });
    }
});


// Step 2: Generate Final DOCX Endpoint
app.post('/generate-final', async (req, res) => {
    try {
        const planData = req.body; // Expects the full JSON object including edits

        // Generate the DOCX buffer
        const buffer = await generateTestPlan(planData);

        // Send the file to the user
        const filename = `Test_Plan_${planData.project_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(buffer);

    } catch (error) {
        console.error("Error generating final plan:", error);
        res.status(500).send("Error generating Test Plan.");
    }
});


// Only start the server if running directly
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Test Plan Generator running at http://localhost:${port}`);
    });
}

module.exports = app;
