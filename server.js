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
const fs = require('fs');
// using legacy build for node environment compatibility
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
const mammoth = require('mammoth');
const { generateTestPlan } = require('./tools/generate_plan');
const { fetchJiraTicket } = require('./tools/jira_reader');

const app = express();
const port = 3000;

// Configure Multer for uploads (Use 'tmp/' for local/windows compatibility)
const upload = multer({ dest: 'tmp/' });

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
app.post('/preview', upload.array('project_files'), async (req, res) => {
    try {
        const formData = req.body;
        let fileContent = "";

        // Handle File Upload Parsing for Multiple Files
        if (req.files && req.files.length > 0) {
            console.log(`Processing ${req.files.length} uploaded files...`);
            
            for (const file of req.files) {
                console.log(`Parsing: ${file.originalname} (${file.mimetype})`);
                const filePath = file.path;

                if (file.mimetype === 'application/pdf') {
                    const dataBuffer = fs.readFileSync(filePath);
                    const loadingTask = pdfjsLib.getDocument({
                        data: new Uint8Array(dataBuffer),
                        disableFontFace: true,
                    });
                    const doc = await loadingTask.promise;
                    let extractedText = `--- Context from PDF: ${file.originalname} ---\n`;

                    for (let i = 1; i <= doc.numPages; i++) {
                        const page = await doc.getPage(i);
                        const content = await page.getTextContent();
                        const strings = content.items.map(item => item.str);
                        extractedText += strings.join(" ") + "\n";
                    }
                    fileContent += extractedText + "\n\n";

                } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    const result = await mammoth.extractRawText({ path: filePath });
                    fileContent += `--- Context from DOCX: ${file.originalname} ---\n${result.value}\n\n`;
                } else {
                    const text = fs.readFileSync(filePath, 'utf8');
                    fileContent += `--- Context from File: ${file.originalname} ---\n${text}\n\n`;
                }

                // Clean up uploaded file
                fs.unlinkSync(filePath);
            }
        }

        // Smart Extraction Logic for the Test Plan
        const extractField = (patterns, fallback) => {
            for (const regex of patterns) {
                const match = fileContent.match(regex);
                if (match && match[1]) return match[1].trim();
            }
            return fallback;
        };

        const projectName = extractField([
            /Project:\s*(.*)/i, 
            /Project Title:\s*(.*)/i, 
            /Requirement Name:\s*(.*)/i,
            /Document Name:\s*(.*)/i
        ], formData.project_name || "Enterprise Project");

        const objective = extractField([
            /Objective:\s*(.*)/i, 
            /Goals:\s*(.*)/i, 
            /Purpose:\s*(.*)/i,
            /Introduction:\s*(.*)/i
        ], "The goal is to verify systemic logic and ensure user requirements are met.");

        const scenarios = extractField([
            /Scenario:\s*(.*)/ig, 
            /Steps:\s*(.*)/ig, 
            /Use Cases:\s*(.*)/ig
        ], "1. Success Flow\n2. Validation Checks\n3. Negative Input Handling\n4. Performance Check");

        const risks = extractField([
            /Risk:\s*(.*)/i, 
            /Mitigation:\s*(.*)/i, 
            /Assumptions:\s*(.*)/i
        ], "Potential delays in API integration, Hardware environment availability.");

        const inScope = extractField([
            /In Scope:\s*(.*)/i, 
            /Scope Description:\s*(.*)/i, 
            /Features:\s*(.*)/i
        ], "All core functional modules mentioned in the BRD context.");

        // Return JSON for the frontend to render
        res.json({
            ...formData,
            project_name: projectName,
            objective: objective,
            in_scope: inScope,
            scenarios: scenarios,
            risks: risks,
            criteria: "Entry: Environment Ready & Approved build. Exit: All TCs executed & Defects closed.",
            uploaded_file_content: fileContent
        });

    } catch (error) {
        console.error("Error generating preview:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Error during file processing: " + error.message 
        });
    }
});

// New Connection Validation Endpoint
app.post('/validate-connection', async (req, res) => {
    const { tool, url, user, token } = req.body;
    try {
        if (tool === 'jira') {
            const testUrl = `${url.replace(/\/$/, '')}/rest/api/2/myself`;
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`,
                    'Accept': 'application/json'
                }
            });
            if (response.ok) {
                return res.json({ success: true });
            } else {
                return res.json({ success: false, error: `Auth failed (${response.status}). Check email/token.` });
            }
        }
        // Mock success for other tools for now
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});


// Step 1b: Sync Tool Data (Jira, ADO, etc.) & Map to Test Plan
app.post('/sync-tool-data', upload.none(), async (req, res) => {
    try {
        const { tool, url, user, token, id } = req.body;

        let planData = {
            project_name: "External Sync Project",
            objective: "Requirements fetched from external tool.",
            in_scope: "Core features defined in ticket/task.",
            scenarios: "1. Main Success Path\n2. Exception Handling",
            risks: "Dependency on third-party service availability."
        };

        if (tool === 'jira' && id) {
            const jiraData = await fetchJiraTicket(url, user, token, id);
            planData = {
                project_name: jiraData.fields.project.name + " - " + jiraData.key,
                objective: jiraData.fields.summary + "\n\n" + (jiraData.fields.description || ""),
                in_scope: "Testing requirements for " + jiraData.key,
                scenarios: "Verify: " + jiraData.fields.summary,
                risks: "Extracted from Jira priority: " + (jiraData.fields.priority?.name || 'Medium')
            };
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
