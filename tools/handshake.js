const fs = require('fs');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun } = docx;

async function runHandshake() {
    console.log("Starting Handshake Protocol...");

    try {
        // 1. Verify DOCX Generation
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun("Hello World! This is a test document from the B.L.A.S.T. Handshake."),
                        ],
                    }),
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(".tmp/handshake_test.docx", buffer);
        console.log("✅ DOCX Generation: Success (.tmp/handshake_test.docx created)");

    } catch (error) {
        console.error("❌ DOCX Generation Failed:", error);
        process.exit(1);
    }
    
    console.log("Handshake Complete.");
}

runHandshake();
