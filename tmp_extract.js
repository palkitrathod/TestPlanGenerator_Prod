
// Mock canvas
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
    if (id === 'canvas' || id === '@napi-rs/canvas') return {};
    return originalRequire.apply(this, arguments);
};

const fs = require('fs');
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

async function extractText() {
    const dataBuffer = fs.readFileSync('c:\\Users\\prathod\\Desktop\\Test Plan Generator\\Test Plan Template for QA (1).pdf');
    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(dataBuffer),
        disableFontFace: true,
    });
    const doc = await loadingTask.promise;
    let extractedText = "";

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        extractedText += `--- Page ${i} ---\n` + strings.join(" ") + "\n";
    }
    console.log(extractedText);
}

extractText().catch(console.error);
