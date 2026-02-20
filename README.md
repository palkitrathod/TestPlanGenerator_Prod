# 🚀 Test Plan Generator (Prod)

A professional, automated tool designed to generate IEEE 829-compliant Test Plan documents. This application streamlines the QA planning process by converting structured inputs and uploaded requirements files into a polished `.docx` test plan.

🔴 **Live Demo:** [https://test-plan-generator-app.vercel.app](https://test-plan-generator-app.vercel.app)

---

## 🎯 Purpose & Motivation

Creating a comprehensive Test Plan manually is often repetitive and time-consuming. QA Leads and Managers spend hours formatting documents instead of focusing on strategy.

**The Test Plan Generator solves this by:**
1.  **Standardizing Output:** Ensures every test plan follows a professional, consistent format.
2.  **Saving Time:** Reduces "blank page syndrome" by providing a structured form.
3.  **Parsing Requirements:** Intelligently extracts text from uploaded requirement docs (PDF/DOCX) to auto-fill the scope.
4.  **Edit Capability:** Offers a "Preview & Edit" mode to refine content before the final document generation.

---

## 🏗️ Architecture

This project is built using the **B.L.A.S.T.** (Blueprint, Link, Architect, Stylize, Trigger) protocol, ensuring a robust and modular design.

### Tech Stack
*   **Backend:** Node.js, Express.js
*   **Frontend:** HTML5, Bootstrap 5, Vanilla JS (Fetch API)
*   **Document Engine:** `docx` (npm) for generating Word documents
*   **File Parsing:** `pdf-parse` (PDFs) and `mammoth` (DOCX)
*   **Deployment:** Vercel (Serverless)

### Workflow
1.  **Input:** User fills out project details (Type, Strategy, Resources) and optionally uploads a spec file.
2.  **Process:** The server extracts text from the upload and prepares a JSON object.
3.  **Preview:** The frontend renders a preview, allowing the user to tweak the extracted scope or other details.
4.  **Generate:** The final JSON is sent to the backend, which constructs the `.docx` file using the `docx` library.

---

## 📂 Project Structure

```
├── public/
│   ├── index.html        # The User Interface (Form & Preview)
│   └── css/              # (Optional custom styles)
├── tools/
│   ├── generate_plan.js  # Core Logic: Generates the DOCX structure
│   └── parse_input.js    # (Logic integrated into server.js)
├── architecture/         # System design & templates
├── server.js             # Main Express App (API & Routes)
├── vercel.json           # Vercel Deployment Config
└── README.md             # Project Documentation
```

---

## 🚀 How to Run Locally

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/palkitrathod/TestPlanGenerator_Prod.git
    cd TestPlanGenerator_Prod
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Start the Server:**
    ```bash
    node server.js
    ```

4.  **Access the App:**
    Open `http://localhost:3000` in your browser.

---

## ☁️ Deployment

This project is optimized for **Vercel**.
1.  Select the repository in Vercel.
2.  The `vercel.json` file handles the configuration automatically.
3.  Deploy!

---

**Author:** Palkit Rathod
**Version:** 1.0.0
