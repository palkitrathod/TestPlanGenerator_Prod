const https = require('https');
const http = require('http');

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
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error(`Failed to parse JSON: ${data.substring(0, 100)}`)); }
                } else {
                    reject(new Error(`API Error ${res.statusCode}: ${data.substring(0, 200)}`));
                }
            });
        });
        req.on('error', (err) => reject(err));
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

function mapToPlan(source, toolName, id) {
    const title = source.title || source.name || source.properties?.Name?.title?.[0]?.plain_text || id;
    const desc = source.description || source.notes || source.properties?.Description?.rich_text?.[0]?.plain_text || 'No description extracted.';
    
    return {
        project_name: title,
        objective: `Test plan for ${toolName} item ${id}: ${title}\n\nDescription:\n${desc}`,
        in_scope: `Functionality related to ${id}.\nAssumptions: ${toolName} item contains complete requirements.`,
        out_scope: `External systems not explicitly mentioned in ${id}.`,
        scenarios: `1. Verification of ${id} core requirements.\n2. Validation of edge cases defined in description.`,
        risks: `Changes in ${toolName} item ${id} after test plan finalization.`,
        criteria: `Entry: ${id} status moved to "Ready for QA". Exit: All criteria met.`,
        reviewers: source.assignee?.name || "QA Lead",
        approvers: "Product Owner",
        deliverables: `Test Plan, Test Cases, Summary Report linked to ${id}`,
        roles: `QA: Testing\nDev: Fixing bugs found in ${id}`,
        test_env: "Standard QA environment mirroring production.",
        metrics: "Test coverage 100% of defined criteria.",
        schedule: `Synced on: ${new Date().toISOString().split('T')[0]}`
    };
}

async function fetchAdoWorkItem(url, token, id) {
    const cleanUrl = url.replace(/\/$/, '');
    // ADO API: https://dev.azure.com/{org}/_apis/wit/workitems/{id}?api-version=6.0
    const apiUrl = `${cleanUrl}/_apis/wit/workitems/${id}?api-version=6.0`;
    const headers = { 'Authorization': `Basic ${Buffer.from(`:${token}`).toString('base64')}`, 'Accept': 'application/json' };
    const data = await fetchJSON(apiUrl, headers);
    return mapToPlan({
        title: data.fields?.['System.Title'],
        description: data.fields?.['System.Description'] || data.fields?.['System.History'],
        assignee: { name: data.fields?.['System.AssignedTo']?.displayName }
    }, 'Azure DevOps', id);
}

async function fetchAsanaTask(token, id) {
    const apiUrl = `https://app.asana.com/api/1.0/tasks/${id}`;
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
    const data = await fetchJSON(apiUrl, headers);
    return mapToPlan(data.data, 'Asana', id);
}

async function fetchNotionPage(token, id) {
    const apiUrl = `https://api.notion.com/v1/pages/${id}`;
    const headers = { 
        'Authorization': `Bearer ${token}`, 
        'Notion-Version': '2022-06-28',
        'Accept': 'application/json' 
    };
    const data = await fetchJSON(apiUrl, headers);
    return mapToPlan({
        title: data.properties?.Name?.title?.[0]?.plain_text || data.properties?.Title?.title?.[0]?.plain_text,
        description: JSON.stringify(data.properties),
        id: data.id
    }, 'Notion', id);
}

module.exports = { fetchAdoWorkItem, fetchAsanaTask, fetchNotionPage };
