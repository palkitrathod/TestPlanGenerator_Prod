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

    const doc = new Document({
        title: "Test Plan - " + data.project_name,
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch margins
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
                        new TextRun({ text: `Version: 1.0`, font: "Calibri", size: 24 }),
                        new TextRun({ text: "\n", break: 1 }),
                        new TextRun({ text: `Date: ${new Date().toLocaleDateString()}`, font: "Calibri", size: 24 }),
                        new TextRun({ text: "\n", break: 1 }),
                        new TextRun({ text: `Status: Draft`, font: "Calibri", size: 24 })
                    ],
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "", pageBreakBefore: true }),

                // 2. INTRODUCTION
                createHeading("1. Introduction", HeadingLevel.HEADING_1),
                createHeading("1.1 Project Objective", HeadingLevel.HEADING_2),
                createParagraph(data.overview || data.objective),

                // 3. SCOPE
                createHeading("2. Scope of Work", HeadingLevel.HEADING_1),
                createHeading("2.1 In-Scope Features", HeadingLevel.HEADING_2),
                createParagraph(data.inscope || data.in_scope),
                createHeading("2.2 Out-of-Scope (Exclusions)", HeadingLevel.HEADING_2),
                createParagraph(data.outscope || data.out_scope),
                createHeading("2.3 Assumptions & Dependencies", HeadingLevel.HEADING_2),
                createParagraph(data.assumptions),

                // 4. TEST STRATEGY
                createHeading("3. Test Strategy", HeadingLevel.HEADING_1),
                createHeading("3.1 Methodology", HeadingLevel.HEADING_2),
                createParagraph(data.methodology || "Standard Agile Lifecycle"),
                createHeading("3.2 Test Levels", HeadingLevel.HEADING_2),
                createParagraph(data.levels || "Integration, System, UAT"),
                createHeading("3.3 Automation Approach", HeadingLevel.HEADING_2),
                createParagraph(data.automation),
                createHeading("3.4 Defect Management", HeadingLevel.HEADING_2),
                createParagraph(data.defect_mgmt),

                // 5. TEST ENVIRONMENT
                createHeading("4. Test Environment & Data", HeadingLevel.HEADING_1),
                createHeading("4.1 Infrastructure & Tools", HeadingLevel.HEADING_2),
                createParagraph(data.env || data.test_env),
                createHeading("4.2 Test Data Management", HeadingLevel.HEADING_2),
                createParagraph(data.test_data),

                // 6. GOVERNANCE
                createHeading("5. Governance & Operations", HeadingLevel.HEADING_1),
                createHeading("5.1 Roles & Responsibilities", HeadingLevel.HEADING_2),
                createParagraph(data.roles),
                createHeading("5.2 Suspension & Resumption Criteria", HeadingLevel.HEADING_2),
                createParagraph(data.suspension),
                createHeading("5.3 Entrance & Exit Criteria", HeadingLevel.HEADING_2),
                createParagraph("Entrance: Smoke test passed, environment stable.\nExit: 100% test cases executed, 0 Critical bugs open."),

                // 7. DELIVERABLES & SCHEDULE
                createHeading("6. Deliverables & Schedule", HeadingLevel.HEADING_1),
                createHeading("6.1 QA Deliverables", HeadingLevel.HEADING_2),
                createParagraph(data.deliverables || "Test Plan, Test Cases, Execution Log, Defect Report."),
                createHeading("6.2 Schedule", HeadingLevel.HEADING_2),
                createParagraph(data.schedule || `Planned Start: ${data.start_date || 'TBD'}\nPlanned End: ${data.end_date || 'TBD'}`),

                // 8. RISKS
                createHeading("7. Risks & Mitigation", HeadingLevel.HEADING_1),
                createParagraph(data.risks || "No significant risks identified at this stage."),
            ],
        }],
    });

    return await Packer.toBuffer(doc);
}

module.exports = { generateTestPlan };
