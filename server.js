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

// Configure Multer for uploads (Use /tmp for Vercel/Serverless)
const upload = multer({ dest: '/tmp/' });

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Allow JSON for the final generation step

// Routes
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

        // Return JSON for the frontend to render
        res.json({
            ...formData,
            uploaded_file_content: fileContent
        });

    } catch (error) {
        console.error("Error generating preview:", error);
        res.status(500).json({ error: "Error during file processing." });
    }
});


// Step 1b: Fetch JIRA Ticket & Map to Test Plan
app.post('/fetch-jira', async (req, res) => {
    try {
        const { jira_url, email, api_token, issue_key } = req.body;

        if (!jira_url || !email || !api_token || !issue_key) {
            return res.status(400).json({ error: 'Missing required fields: jira_url, email, api_token, issue_key' });
        }

        console.log(`Fetching JIRA ticket: ${issue_key} from ${jira_url}`);
        const planData = await fetchJiraTicket(jira_url, email, api_token, issue_key);

        res.json(planData);
    } catch (error) {
        console.error('Error fetching JIRA ticket:', error.message);
        res.status(500).json({ error: error.message || 'Failed to fetch JIRA ticket.' });
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
