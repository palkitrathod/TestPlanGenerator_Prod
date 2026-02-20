# Research Findings

## Document Generation
- **Requirement**: Generate PDF/DOCX.
- **Decision**: Use `docx` npm package. It's robust and can create complex documents.

## User Interface
- **Requirement**: Dropdowns, Checkboxes, Text Areas.
- **Approach**: Express.js server serving static HTML/CSS/JS.

## File Parsing
- **Requirement**: Parse uploaded PDF/DOCX.
- **Libraries**:
    - `pdf-parse`: For PDF.
    - `mammoth` or `text-extraction`: For DOCX/Text.
    - **Decision**: `pdf-parse` and `mammoth` are standard Node options.

## Constraints
- **Validation**: Ensure dates are logical (End > Start).
- **Missing Data**: If user uploads a file but leaves fields blank, we need logic to *extract* those fields from the file?
- **Clarification**: The prompt implies the user fills the form OR uploads a file.
    - "User will provide inputs or user will upload the file..."
    - **Logic**: If file is uploaded, try to auto-fill the form or auto-generate the plan using LLM processing (if available) or keyword extraction.
    - **Constraint**: I don't have an LLM integration listed in "Integrations" (User said N/A).
    - **Fallback**: The file upload might just be an *attachment* or *reference* to be appended to the Scope section, OR I might need to use simple NLP/regex to extract "Scope" if possible.
    - **Refined Logic**: If "Integrations = N/A", I cannot use OpenAI/Gemini to "read" the PDF and "understand" the scope strictly. I must rely on the User Input Form for the structured data, and perhaps treat the Uploaded File as "Additional Context" to be appended to the document, or simple text extraction to fill the "Scope Description" if blank.
