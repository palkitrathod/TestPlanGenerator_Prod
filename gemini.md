# GEMINI - Project Constitution
## Core Identity
- **Project Name**: Test Plan Generator (TBC)
- **Role**: System Pilot using BLAST protocol.

## 1. Discovery (The "Why")
- **North Star**: Generate a professional, standardized Test Plan document (PDF/DOCX) based on structured user inputs and optional source documents.
- **Integrations**: N/A (Local generation using Python libraries like `python-docx` or `reportlab`).
- **Source of Truth**: 
    1. Direct User Input (Form Data)
    2. Uploaded Documents (PDF/DOC/DOCX) for context extraction.
- **Delivery Payload**: Professional Test Plan Document (PDF or DOCX).

## 2. Behavioral Rules (The "How")
- **Tone**: Professional, Formal, QA-Centric.
- **Structural Integrity**: Must follow standard Test Plan sections (Introduction, Scope, Strategy, Schedule, Resources).
- **Constraints**: 
    - No guessing details; use placeholders if input is missing.
    - "Dropdown" and "Checkbox" limits indicate a need for a structured UI.

## 3. Data Schemas (The "What")
### Input Schema (The Form)
```json
{
  "project_name": "string",
  "project_type": "enum('Web Application', 'Mobile App', 'API', 'Desktop', 'SaaS')",
  "project_nature": "enum('New Development', 'Enhancement', 'Maintenance', 'Migration')",
  "scope_description": "string",
  "testing_types": "array[enum('Functional', 'Regression', 'API', 'Performance', 'Security', 'Automation', 'UAT Support')]",
  "methodology": "enum('Agile', 'Waterfall')",
  "timeline": {
    "start_date": "date-string",
    "end_date": "date-string"
  },
  "qa_resources": "enum('1', '2-3', '3+')",
  "uploaded_file_content": "string (optional, parsed text)"
}
```

### Output Schema (The Document Structure)
The generated document will contain these sections:
1. **Document Control**: Project Name, Date, Version.
2. **Introduction**: Derived from Project Nature & Type.
3. **Scope**: 
    - **In Scope**: Derived from "Scope Description" & Inputs.
    - **Out of Scope**: Standard exclusions unless specified.
4. **Test Strategy**:
    - **Methodology**: (Agile/Waterfall details).
    - **Testing Types**: Elaboration on selected checkboxes.
5. **Resources & Tools**: Based on "QA Resources" count.
6. **Schedule**: Start/End dates with standard phases.
7. **Deliverables**: Standard QA artifacts (Test Cases, Bug Reports, etc.).


## 4. Architectural Invariants
- Logic is separated from Tools.
- `gemini.md` is the single source of truth for schema and rules.
- Tools must be deterministic and atomic.
