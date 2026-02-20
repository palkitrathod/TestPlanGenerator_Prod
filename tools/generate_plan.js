const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;

// Helper function for new lines
function createParagraph(text) {
    if (!text) return new Paragraph("");
    // Split by newlines to handle textareas properly
    const lines = text.split('\n');
    const runs = [];
    lines.forEach((line, index) => {
        runs.push(new TextRun(line));
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
        text: text,
        heading: level,
        spacing: { before: 400, after: 200 }, // Better spacing for sections
    });
}

async function generateTestPlan(data) {
    console.log("Generating Enhanced Test Plan for:", data.project_name);

    // Document Sections
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                // 1. Cover Page
                new Paragraph({
                    text: `TEST PLAN`,
                    heading: HeadingLevel.TITLE,
                    alignment: "center",
                    spacing: { after: 500, before: 1000 },
                }),
                new Paragraph({
                    text: data.project_name,
                    heading: HeadingLevel.HEADING_1,
                    alignment: "center",
                    spacing: { after: 3000 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString()}`, italics: true })],
                    alignment: "center",
                }),
                new Paragraph({ text: "", pageBreakBefore: true }),

                // 2. Introduction
                createHeading("1. INTRODUCTION", HeadingLevel.HEADING_1),
                createParagraph(data.intro),

                // 3. Scope
                createHeading("2. SCOPE", HeadingLevel.HEADING_1),
                createHeading("2.1 In Scope", HeadingLevel.HEADING_2),
                createParagraph(data.scope),

                ...(data.extracted ? [
                    createHeading("2.2 Additional Requirements (Extracted)", HeadingLevel.HEADING_2),
                    createParagraph(data.extracted)
                ] : []),

                // 4. Strategy
                createHeading("3. TEST STRATEGY", HeadingLevel.HEADING_1),
                createParagraph(data.strategy),

                // 5. Environment
                createHeading("4. TEST ENVIRONMENT & TOOLS", HeadingLevel.HEADING_1),
                createParagraph(data.environment),

                // 6. Process
                createHeading("5. TEST PROCESS", HeadingLevel.HEADING_1),
                createHeading("5.1 Entry Criteria", HeadingLevel.HEADING_2),
                createParagraph(data.entry_criteria),
                createHeading("5.2 Exit Criteria", HeadingLevel.HEADING_2),
                createParagraph(data.exit_criteria),

                // 7. Schedule
                createHeading("6. SCHEDULE & RESOURCES", HeadingLevel.HEADING_1),
                createParagraph(data.schedule),

                // 8. Deliverables
                createHeading("7. DELIVERABLES", HeadingLevel.HEADING_1),
                createParagraph(data.deliverables),
            ],
        }],
    });

    return await Packer.toBuffer(doc);
}

module.exports = { generateTestPlan };
