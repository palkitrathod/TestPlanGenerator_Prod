const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;

// Helper function for body text with line breaks
function createParagraph(text) {
    if (!text) return new Paragraph("");
    const lines = text.split('\n');
    const runs = [];
    lines.forEach((line, index) => {
        runs.push(new TextRun({
            text: line,
            font: "Calibri",
            size: 22 // 11pt
        }));
        if (index < lines.length - 1) {
            runs.push(new TextRun({ break: 1 }));
        }
    });

    return new Paragraph({
        children: runs,
        spacing: { after: 200, line: 276 }, // 1.15 line spacing
    });
}

// Helper for professional headings
function createHeading(text, level) {
    const isMain = level === HeadingLevel.HEADING_1;
    return new Paragraph({
        children: [
            new TextRun({
                text: text,
                font: "Calibri",
                bold: true,
                size: isMain ? 32 : 26, // 16pt or 13pt
                color: isMain ? "1F4E78" : "2E74B5"
            })
        ],
        heading: level,
        spacing: { before: isMain ? 400 : 300, after: 150 },
        border: isMain ? {
            bottom: { color: "1F4E78", space: 1, value: "single", size: 6 }
        } : undefined
    });
}

async function generateTestPlan(data) {
    console.log("Generating Enhanced Test Plan for:", data.project_name);

    // Document Control Table
    const controlTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Reviewers", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Approvers", bold: true })] })] }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({ children: [createParagraph(data.reviewers || "QA Manager, Project Manager")] }),
                    new TableCell({ children: [createParagraph(data.approvers || "Stakeholders")] }),
                ],
            }),
        ],
    });

    const doc = new Document({
        title: "Test Plan - " + data.project_name,
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
                }
            },
            children: [
                // 1. COVER PAGE
                new Paragraph({
                    children: [new TextRun({ text: "SOFTWARE TEST PLAN", font: "Calibri", size: 56, bold: true, color: "1F4E78" })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 2400 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: data.project_name, font: "Calibri", size: 40, bold: true })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 400, after: 4000 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Version: ${data.version || '1.0.0'}`, font: "Calibri", size: 24 }),
                        new TextRun({ text: "\n", break: 1 }),
                        new TextRun({ text: `Date: ${new Date().toISOString().split('T')[0]}`, font: "Calibri", size: 24 }),
                        new TextRun({ text: "\n", break: 1 }),
                        new TextRun({ text: `Status: Final`, font: "Calibri", size: 24 })
                    ],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "", pageBreakBefore: true }),

                // 2. DOCUMENT CONTROL
                createHeading("0. Document Control", HeadingLevel.HEADING_1),
                controlTable,
                new Paragraph({ text: "", spacing: { after: 400 } }),

                // 3. INTRODUCTION
                createHeading("1. Introduction", HeadingLevel.HEADING_1),
                createHeading("1.1 Project Objective", HeadingLevel.HEADING_2),
                createParagraph(data.overview || data.objective),

                // 4. SCOPE
                createHeading("2. Scope of Work", HeadingLevel.HEADING_1),
                createHeading("2.1 In-Scope Features", HeadingLevel.HEADING_2),
                createParagraph(data.inscope || data.in_scope),
                createHeading("2.2 Out-of-Scope (Exclusions)", HeadingLevel.HEADING_2),
                createParagraph(data.outscope || data.out_scope),

                // 5. TEST STRATEGY & METRICS
                createHeading("3. Strategy & Scenarios", HeadingLevel.HEADING_1),
                createHeading("3.1 Methodology", HeadingLevel.HEADING_2),
                createParagraph(data.methodology || "Standard Agile Lifecycle"),
                createHeading("3.2 Metric Description", HeadingLevel.HEADING_2),
                createParagraph(data.metrics || "Bug Rejection Ratio < 5%\nTest Coverage > 90%"),
                createHeading("3.3 Test Scenarios", HeadingLevel.HEADING_2),
                createParagraph(data.scenarios || "1. Functional Validation\n2. Regression Suite\n3. UAT"),

                // 6. TEST ENVIRONMENT & GOVERNANCE
                createHeading("4. Environment & Governance", HeadingLevel.HEADING_1),
                createHeading("4.1 Test Environment", HeadingLevel.HEADING_2),
                createParagraph(data.env || data.test_env || "QA Environment simulating production hardware."),
                createHeading("4.2 Risks & Mitigation", HeadingLevel.HEADING_2),
                createParagraph(data.risks || "No significant risks identified."),
                createHeading("4.3 Entry & Exit Criteria", HeadingLevel.HEADING_2),
                createParagraph(data.criteria || "Entry: Build Deployed. Exit: All TCs Passed."),
                createHeading("4.4 Roles & Responsibilities", HeadingLevel.HEADING_2),
                createParagraph(data.roles || "QA Lead: Planning\nTesters: Execution"),

                // 7. DELIVERABLES & SCHEDULE
                createHeading("5. Deliverables & Schedule", HeadingLevel.HEADING_1),
                createHeading("5.1 Deliverables", HeadingLevel.HEADING_2),
                createParagraph(data.deliverables || "Test Plan, Bug Report"),
                createHeading("5.2 Schedule", HeadingLevel.HEADING_2),
                createParagraph(data.schedule || `Start Date: ${data.start_date || 'TBD'}\nEnd Date: ${data.end_date || 'TBD'}`),
            ],
        }],
    });

    return await Packer.toBuffer(doc);
}

module.exports = { generateTestPlan };
