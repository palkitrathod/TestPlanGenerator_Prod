/**
 * jira_reader.js
 * Fetches a JIRA ticket and maps its fields to Test Plan Generator data.
 */

const https = require('https');
const http = require('http');

/**
 * Performs an HTTP/HTTPS GET request and returns parsed JSON.
 */
function fetchJSON(url, headers) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const lib = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: headers,
        };

        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(data) });
                    } catch (e) {
                        reject(new Error(`Failed to parse JSON: ${data.substring(0, 200)}`));
                    }
                } else {
                    reject(new Error(`JIRA API Error ${res.statusCode}: ${data.substring(0, 400)}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timed out after 15 seconds.'));
        });
        req.end();
    });
}

/**
 * Safely extracts a nested value from an object given a dot-separated path.
 */
function safeGet(obj, path, fallback = '') {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj) ?? fallback;
}

/**
 * Converts JIRA ADF (Atlassian Document Format) or legacy wiki-text to plain text.
 */
function adfToPlainText(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;

    // ADF format
    if (node.type === 'doc' || node.type === 'paragraph' || node.type === 'bulletList' ||
        node.type === 'orderedList' || node.type === 'listItem' || node.type === 'blockquote') {
        return (node.content || []).map(adfToPlainText).join('\n').trim();
    }
    if (node.type === 'text') return node.text || '';
    if (node.type === 'hardBreak') return '\n';
    if (node.type === 'heading') {
        return (node.content || []).map(adfToPlainText).join('') + '\n';
    }
    if (node.content) {
        return node.content.map(adfToPlainText).join('').trim();
    }
    return '';
}

/**
 * Main function: fetches a JIRA ticket and maps fields to test plan structure.
 * @param {string} jiraBaseUrl  - e.g. "https://yourcompany.atlassian.net"
 * @param {string} email        - JIRA account email
 * @param {string} apiToken     - JIRA API token
 * @param {string} issueKey     - e.g. "PROJ-123"
 * @returns {object} - Mapped test plan data
 */
async function fetchJiraTicket(jiraBaseUrl, email, apiToken, issueKey) {
    // Normalise base URL
    const base = jiraBaseUrl.replace(/\/$/, '');
    const url = `${base}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;

    const token = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const headers = {
        'Authorization': `Basic ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    const { body: issue } = await fetchJSON(url, headers);

    const fields = issue.fields || {};

    /* ---- Helpers ---- */
    const summary = safeGet(fields, 'summary', issueKey);
    const description = adfToPlainText(fields.description) || safeGet(fields, 'description', '');
    const issueType = safeGet(fields, 'issuetype.name', 'Story');
    const status = safeGet(fields, 'status.name', '');
    const priority = safeGet(fields, 'priority.name', 'Medium');
    const labels = (fields.labels || []).join(', ') || 'N/A';
    const components = (fields.components || []).map(c => c.name).join(', ') || 'N/A';
    const epicName = safeGet(fields, 'epic.name', '') ||
        safeGet(fields, 'customfield_10014', '') || ''; // Epic link customfield
    const reporter = safeGet(fields, 'reporter.displayName', 'N/A');
    const assignee = safeGet(fields, 'assignee.displayName', 'N/A');
    const fixVersions = (fields.fixVersions || []).map(v => v.name).join(', ') || 'N/A';
    const affectedVersions = (fields.versions || []).map(v => v.name).join(', ') || 'N/A';
    const storyPoints = fields.customfield_10016 || fields.story_points || fields.customfield_10028 || 'N/A';
    const dueDate = safeGet(fields, 'duedate', '');
    const created = safeGet(fields, 'created', '').substring(0, 10);

    // Acceptance criteria: often stored in customfield_10069 or embedded in description
    const acceptanceCriteriaRaw = fields.customfield_10069 || fields.customfield_10054 || null;
    const acceptanceCriteria = acceptanceCriteriaRaw
        ? adfToPlainText(acceptanceCriteriaRaw)
        : extractAcceptanceCriteria(description);

    /* ---- Map to Test Plan fields ---- */
    const projectName = epicName ? `${epicName} — ${summary}` : summary;

    const overview =
        `JIRA Ticket: ${issueKey}\n` +
        `Type: ${issueType}  |  Status: ${status}  |  Priority: ${priority}\n` +
        `Reporter: ${reporter}  |  Assignee: ${assignee}\n` +
        `Fix Version(s): ${fixVersions}  |  Story Points: ${storyPoints}\n\n` +
        `Summary:\n${summary}\n\n` +
        `Description:\n${description || 'No description provided.'}`;

    const inScope =
        `Features described in ${issueKey}: ${summary}\n` +
        `Components: ${components}\n` +
        `Labels: ${labels}\n` +
        (acceptanceCriteria ? `\nAcceptance Criteria:\n${acceptanceCriteria}` : '');

    const outScope =
        `Items not mentioned in ${issueKey}.\n` +
        `Affected/Legacy Versions: ${affectedVersions}`;

    const assumptions =
        `1. All acceptance criteria in ${issueKey} are final and approved.\n` +
        `2. Test environment will be ready before testing begins.\n` +
        `3. Test data will be available as per the ticket requirements.\n` +
        `4. Reporter (${reporter}) is available for clarifications.`;

    const strategy =
        `Testing approach based on ${issueType} ticket ${issueKey}:\n` +
        `- Functional Testing: Verify all acceptance criteria listed in the ticket.\n` +
        `- Regression Testing: Ensure existing functionality is not broken.\n` +
        `- Priority Level: ${priority} — testing effort adjusted accordingly.\n` +
        `- Components Under Test: ${components}`;

    const env =
        `Test Data: Aligned with acceptance criteria of ${issueKey}.\n` +
        `Target Fix Version: ${fixVersions}\n` +
        `Environment: QA / Staging (mirroring Production configuration).`;

    const rtm =
        `Traceability linked to JIRA ticket: ${issueKey}\n` +
        `Project Issue URL: ${base}/browse/${issueKey}`;

    const process =
        `Entry Criteria: ${issueKey} is in "Ready for QA" status, build deployed to QA.\n` +
        `Exit Criteria: All acceptance criteria verified, 0 critical bugs open against ${issueKey}.`;

    const reporting =
        `Defect Management: JIRA — link defects to parent epic/ticket ${issueKey}.\n` +
        `Reporting: Daily status updates, Pass/Fail metrics shared with ${reporter}.`;

    const risks =
        `Risk: Incomplete acceptance criteria in ${issueKey}. Mitigation: Clarify with ${reporter} before testing.\n` +
        `Risk: Environment unavailability. Mitigation: Coordinate with DevOps team in advance.`;

    const schedule =
        `Ticket Created: ${created}\n` +
        (dueDate ? `Target Due Date: ${dueDate}\n` : '') +
        `Sign-off Authority: ${reporter} / QA Lead`;

    return {
        jira_issue_key: issueKey,
        jira_base_url: base,
        project_name: projectName,
        overview,
        inscope: inScope,
        outscope: outScope,
        assumptions,
        strategy,
        env,
        rtm,
        process,
        reporting,
        risks,
        schedule,
        // Extra metadata for display
        meta: {
            summary,
            issueType,
            status,
            priority,
            reporter,
            assignee,
            components,
            labels,
            fixVersions,
            storyPoints,
            epicName,
            dueDate,
            acceptanceCriteria,
        }
    };
}

/**
 * Tries to extract "Acceptance Criteria" section from a plain text description.
 */
function extractAcceptanceCriteria(text) {
    if (!text) return '';
    const patterns = [
        /acceptance\s+criteria[:\s]+([\s\S]+?)(?:\n{2,}|\z)/i,
        /given[\s\S]+?then[\s\S]+?(?:\n{2,}|$)/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[0].trim();
    }
    return '';
}

module.exports = { fetchJiraTicket };
