function heuristicRewrite(text, fieldName = '') {
    const cleanText = String(text || '').trim();
    if (!cleanText) return '';

    const sentences = cleanText
        .replace(/\r/g, '')
        .split(/\n+/)
        .map(line => line.trim())
        .filter(Boolean);

    const normalizedField = String(fieldName || '').toLowerCase();
    const introMap = {
        project_name: 'Refined project title',
        objective: 'The objective of this test plan is to',
        in_scope: 'This test plan covers',
        out_scope: 'This test plan excludes',
        metrics: 'Success metrics include',
        scenarios: 'Key validation scenarios include',
        test_env: 'Testing will be executed in',
        risks: 'Primary risks and mitigations include',
        criteria: 'Entry and exit criteria are defined as',
        roles: 'Primary responsibilities are assigned as follows',
        deliverables: 'Planned deliverables include'
    };

    const intro = introMap[normalizedField];
    if (sentences.length === 1 && intro && !cleanText.endsWith('.')) {
        return `${intro} ${cleanText.charAt(0).toLowerCase()}${cleanText.slice(1)}.`;
    }

    return sentences
        .map(line => {
            if (/^\d+\./.test(line) || /^[-*]/.test(line)) {
                return line;
            }
            const formatted = line.charAt(0).toUpperCase() + line.slice(1);
            return /[.!?]$/.test(formatted) ? formatted : `${formatted}.`;
        })
        .join('\n');
}

async function rewriteWithHuggingFace(text, fieldName = '') {
    const token = process.env.HF_TOKEN;
    if (!token) {
        return null;
    }

    const fieldLabel = String(fieldName || 'test plan field').replace(/_/g, ' ');
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            model: process.env.HF_REWRITE_MODEL || 'Qwen/Qwen2.5-7B-Instruct-1M:fireworks',
            temperature: 0.2,
            max_tokens: 300,
            messages: [
                {
                    role: 'system',
                    content: 'You rewrite software QA and test planning content. Preserve meaning, keep factual content unchanged, improve clarity and professionalism, and return only the rewritten text. Preserve bullets, numbering, and line breaks when present.'
                },
                {
                    role: 'user',
                    content: `Rewrite this ${fieldLabel} content:\n\n${text}`
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hugging Face rewrite failed (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
}

async function rewriteWithPollinations(text, fieldName = '') {
    const fieldLabel = String(fieldName || 'test plan field').replace(/_/g, ' ');
    const prompt = [
        'Rewrite the following software QA content.',
        'Preserve meaning and factual details.',
        'Improve clarity and professionalism.',
        'Preserve bullets, numbering, and line breaks where applicable.',
        'Return only the rewritten text.',
        `Field: ${fieldLabel}`,
        '',
        text
    ].join('\n');

    const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: process.env.POLLINATIONS_REWRITE_MODEL || 'openai',
            messages: [
                {
                    role: 'system',
                    content: 'You rewrite software QA and test planning content. Preserve meaning, keep factual content unchanged, improve clarity and professionalism, and return only the rewritten text.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pollinations rewrite failed (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        const data = await response.json();
        return data.text?.trim() || data.choices?.[0]?.message?.content?.trim() || null;
    }

    return (await response.text()).trim() || null;
}

async function rewriteWithGroq(text, fieldName = '') {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return null;
    }

    const fieldLabel = String(fieldName || 'test plan field').replace(/_/g, ' ');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: process.env.GROQ_REWRITE_MODEL || 'llama-3.1-8b-instant',
            temperature: 0.2,
            max_tokens: 300,
            messages: [
                {
                    role: 'system',
                    content: 'You rewrite software QA and test planning content. Preserve meaning, keep factual content unchanged, improve clarity and professionalism, and return only the rewritten text. Preserve bullets, numbering, and line breaks when present.'
                },
                {
                    role: 'user',
                    content: `Rewrite this ${fieldLabel} content:\n\n${text}`
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq rewrite failed (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
}

async function rewriteText(text, fieldName = '') {
    if (!String(text || '').trim()) return '';

    try {
        const pollinationsResult = await rewriteWithPollinations(text, fieldName);
        if (pollinationsResult) return pollinationsResult;
    } catch (error) {
        console.error(error.message);
    }

    try {
        const hfResult = await rewriteWithHuggingFace(text, fieldName);
        if (hfResult) return hfResult;
    } catch (error) {
        console.error(error.message);
    }

    try {
        const groqResult = await rewriteWithGroq(text, fieldName);
        if (groqResult) return groqResult;
    } catch (error) {
        console.error(error.message);
    }

    return heuristicRewrite(text, fieldName);
}

module.exports = {
    heuristicRewrite,
    rewriteText
};
