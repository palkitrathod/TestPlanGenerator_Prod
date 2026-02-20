const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;

// Helper function to create bold text
function createBoldText(text) {
    return new TextRun({
        text: text,
        bold: true,
    });
}

// Helper for standard paragraphs
function createParagraph(text) {
    return new Paragraph({
        children: [new TextRun(text)],
        spacing: { after: 200 },
    });
}

// Helper for bullet points
function createBullet(text) {
    return new Paragraph({
        children: [new TextRun(text)],
        bullet: { level: 0 },
    });
}

// Helper for table creation
function createSimpleTable(rowsArg) {
    // map string arrays to TableCells
    const tableRows = rowsArg.map(rowContent =>
        new TableRow({
            children: rowContent.map(cellText =>
                new TableCell({
                    children: [new Paragraph(cellText)],
                    width: { size: 100 / rowContent.length, type: WidthType.PERCENTAGE },
                })
            )
        })
    );

    return new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
    });
}


async function generateTestPlan(data) {
    console.log("Generating Test Plan for:", data.project_name);

    // Document Sections
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                // 1. Cover Page
                new Paragraph({
                    text: `Test Plan for ${data.project_name}`,
                    heading: HeadingLevel.TITLE,
                    alignment: "center",
                    spacing: { after: 500 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: "Generated via Test Plan Generator", italics: true })],
                    alignment: "center",
                    spacing: { after: 5000 },
                }),
                createSimpleTable([
                    ["Project Name", data.project_name],
                    ["Project Type", data.project_type],
                    ["Project Nature", data.project_nature],
                    ["Date", new Date().toLocaleDateString()]
                ]),

                // Page Break
                new Paragraph({ text: "", pageBreakBefore: true }),

                // 2. Introduction
                new Paragraph({ text: "1. Introduction", heading: HeadingLevel.HEADING_1 }),
                createParagraph(`The objective of this Test Plan is to define the strategy, scope, resources, and schedule for the ${data.project_nature} of ${data.project_name} (${data.project_type}).`),
                createParagraph("This document serves as the primary agreement between QA and stakeholders regarding the testing effort."),

                // 3. Scope
                new Paragraph({ text: "2. Scope", heading: HeadingLevel.HEADING_1 }),
                createParagraph(`Description: ${data.scope_description}`),

                new Paragraph({ text: "2.1 In Scope Features", heading: HeadingLevel.HEADING_2 }),
                // Using scope description or uploaded file text if available
                ...(data.uploaded_file_content ?
                    [createParagraph("Extracted from uploaded document:"), createParagraph(data.uploaded_file_content.substring(0, 500) + "... (truncated for brevity)")] :
                    [createParagraph("See detailed scope description above.")]
                ),

                new Paragraph({ text: "2.2 Testing Types", heading: HeadingLevel.HEADING_2 }),
                ...(Array.isArray(data.testing_types) ? data.testing_types.map(type => createBullet(type)) : [createBullet(data.testing_types)]),

                // 4. Test Strategy
                new Paragraph({ text: "3. Test Strategy", heading: HeadingLevel.HEADING_1 }),
                createParagraph(`Methodology: ${data.methodology}`),
                createParagraph("The testing strategy involves a mix of manual and automated testing (if applicable) to ensure all functional and non-functional requirements are met."),

                // 5. Resources
                new Paragraph({ text: "4. Resources", heading: HeadingLevel.HEADING_1 }),
                createParagraph(`QA Team Size: ${data.qa_resources} Resource(s)`),
                createSimpleTable([
                    ["Role", "Responsibility"],
                    ["Test Lead", "Strategy, Planning, Reporting"],
                    ["QA Engineer", "Test Case Creation, Execution"]
                ]),

                // 6. Schedule
                new Paragraph({ text: "5. Schedule", heading: HeadingLevel.HEADING_1 }),
                createSimpleTable([
                    ["Phase", "Date"],
                    ["Start Date", data.start_date || "TBD"],
                    ["End Date", data.end_date || "TBD"]
                ]),

                // 7. Deliverables
                new Paragraph({ text: "6. Deliverables", heading: HeadingLevel.HEADING_1 }),
                createBullet("Test Plan (This Document)"),
                createBullet("Test Cases (Excel/Test Management Tool)"),
                createBullet("Defect Reports (Jira)"),
                createBullet("Test Summary Report")
            ],
        }],
    });

    return await Packer.toBuffer(doc);
}

module.exports = { generateTestPlan };
