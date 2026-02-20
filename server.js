const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { generateTestPlan } = require('./tools/generate_plan');

const app = express();
const port = 3000;

// Configure Multer for uploads
const upload = multer({ dest: '.tmp/uploads/' });

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Allow JSON for the final generation step

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Step 1: Preview Endpoint
app.post('/preview', upload.single('project_file'), async (req, res) => {
    try {
        const formData = req.body;
        let fileContent = "";

        // Handle File Upload Parsing
        if (req.file) {
            console.log(`File uploaded: ${req.file.originalname} (${req.file.mimetype})`);
            const filePath = req.file.path;

            if (req.file.mimetype === 'application/pdf') {
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdfParse(dataBuffer);
                fileContent = data.text;
            } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const result = await mammoth.extractRawText({ path: filePath });
                fileContent = result.value;
            } else {
                // Fallback for text files or similar
                fileContent = fs.readFileSync(filePath, 'utf8');
            }

            // Clean up uploaded file
            fs.unlinkSync(filePath);
        }

        // Return JSON for the frontend to render vertically
        res.json({
            ...formData,
            uploaded_file_content: fileContent
        });

    } catch (error) {
        console.error("Error generating preview:", error);
        res.status(500).json({ error: "Error generating preview." });
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
