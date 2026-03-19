# Test Plan Generator (Enterprise Edition)

A professional, AI-powered system designed to generate standardized, enterprise-grade Test Plan documents (DOCX) based on structured user inputs, document analysis (PDF/DOCX), and tool integrations (Jira).

## 🚀 Key Features

- **Multi-Mode Entry**:
  - **Manual Entry**: Guided 5-step wizard for detailed project control.
  - **Document Upload**: Automatically analyze and extract test plan context from PRDs, BRDs, or functional specs (PDF/DOCX/TXT).
  - **Tool Sync**: Connect directly to **Jira** to fetch ticket data and transform it into a structured test strategy.
  
- **Smart Assistant (AI Integration)**:
  - **Seamless Extraction**: Bypasses manual boilerplate by drafting a full plan from your source documents.
  - **AI Rewrite**: One-click professional refinement for each field to ensure enterprise-level clarity and tone.
  
- **Visual & Professional Output**:
  - **Modern Dashboard**: Sleek, glassmorphic dark-mode UI with intuitive progress tracking.
  - **Document Preview**: Interactive, formatted preview that acts as a live "paper draft" before export.
  - **Native Word Export**: Standardized `.docx` file generation for easy sharing and stakeholder approval.

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, CSS3 (Glassmorphism), Bootstrap 5.
- **Backend**: Node.js, Express.
- **AI/LLM**: Google Gemini (via BLAST protocol).
- **Parsers**: `pdfjs-dist`, `mammoth` (for DOCX).
- **Export**: `docx` library.

## 📈 Recent Accomplishments

1.  **Refined Tool Sync**: Added secure "Username/Email" and "API Token" fields with a "Test Connection" feature for Jira.
2.  **Extraction Engine**: Optimized PDF/DOCX parsing to detect project names, objectives, and test scenarios.
3.  **Unified Flow**: Implemented a seamless transition from "Analyze" to "Draft Preview," allowing for rapid iteration.
4.  **UI/UX Overhaul**: Advanced styling for the document preview, including a responsive sidebar, document badges, and structured sectioning.
5.  **AI Field Rewriter**: Added a "Rewrite with AI" button on every input field to polish and professionalize user-provided or extracted text.

---
