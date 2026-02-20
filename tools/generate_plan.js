const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;

// Helper function for new lines
function createParagraph(text) {
    if (!text) return new Paragraph("");
    // Split by newlines to handle textareas properly
    const lines = text.split('\n');
    const runs = [];
    lines.forEach((line, index) => {
        runs.push(new TextRun({
            text: line,
            font: "Calibri",
            size: 24 // 12pt
        }));
        if (index < lines.length - 1) {
            runs.push(new TextRun({ break: 1 }));
        }
    });

    return new Paragraph({
        children: runs,
        spacing: { after: 200 },
    });
}

function createHeading(text, level) {
    return new Paragraph({
        children: [
            new TextRun({
                text: text,
                font: "Calibri",
                bold: true,
                size: level === HeadingLevel.HEADING_1 ? 32 : 28, // 16pt or 14pt
                color: "2E74B5" // Blue Accent
            })
        ],
        heading: level,
        spacing: { before: 400, after: 200 },
        border: level === HeadingLevel.HEADING_1 ? {
            bottom: { color: "2E74B5", space: 1, value: "single", size: 6 }
        } : undefined
    });
}

async function generateTestPlan(data) {
    console.log("Generating Professional Test Plan for:", data.project_name);

    // Document Sections
    const doc = new Document({
        styles: {
            default: {
                heading1: {
                    run: { font: "Calibri", size: 32, bold: true, color: "2E74B5" },
                    paragraph: { spacing: { before: 240, after: 120 } }
                }
            }
        },
        sections: [{
            properties: {},
            children: [
                // 1. Cover Page
                new Paragraph({
                    children: [new TextRun({ text: "TEST PLAN", font: "Calibri", size: 72, bold: true, color: "1F497D" })],
                    alignment: "center",
                    spacing: { before: 3000, after: 500 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: `Project: ${data.project_name}`, font: "Calibri", size: 48, })],
                    alignment: "center",
                    spacing: { after: 5000 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString()}`, italics: true })],
                    alignment: "center",
                }),
                new Paragraph({ text: "", pageBreakBefore: true }),

                // SECTIONS MAPPED FROM REFERENCE
                createHeading("1. Test Plan Overview", HeadingLevel.HEADING_1),
                createParagraph(data.overview),

                createHeading("2. Scope of Project", HeadingLevel.HEADING_1),
                createHeading("a. In Scope", HeadingLevel.HEADING_3),
                createParagraph(data.inscope),

                createHeading("3. Scope of Testing", HeadingLevel.HEADING_1),
                createHeading("a. Testing In Scope", HeadingLevel.HEADING_3),
                createParagraph("Verify all features listed in project scope."),
                createHeading("b. Out of Scope", HeadingLevel.HEADING_3),
                createParagraph(data.outscope),

                createHeading("4. Assumptions & Dependencies", HeadingLevel.HEADING_1),
                createParagraph(data.assumptions),

                createHeading("5. Test Strategy & Methodology", HeadingLevel.HEADING_1),
                createParagraph(data.strategy),

                createHeading("6. Automation Plan", HeadingLevel.HEADING_1),
                createParagraph(data.automation),

                createHeading("7. Test Environment & Data", HeadingLevel.HEADING_1),
                createParagraph(data.env),

                createHeading("8. Requirement Traceability (RTM)", HeadingLevel.HEADING_1),
                createParagraph(data.rtm),

                createHeading("9. Process (Entry & Exit Criteria)", HeadingLevel.HEADING_1),
                createParagraph(data.process),

                createHeading("10. Defect Management & Reporting", HeadingLevel.HEADING_1),
                createParagraph(data.reporting),

                createHeading("11. Risks & Mitigation", HeadingLevel.HEADING_1),
                createParagraph(data.risks),

                createHeading("12. Schedule & Sign-Off", HeadingLevel.HEADING_1),
                createParagraph(data.schedule),
            ],
        }],
    });

    return await Packer.toBuffer(doc);
}

module.exports = { generateTestPlan };
