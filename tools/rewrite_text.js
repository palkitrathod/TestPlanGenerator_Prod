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
    const cleanText = String(text || '').trim();
    if (!cleanText) return null;

    try {
        const fieldLabel = String(fieldName || 'content').replace(/_/g, ' ');
        const prompt = encodeURIComponent(`Rewrite this professional software QA ${fieldLabel} for clarity. Return only the rewritten text: ${cleanText}`);
        
        // Use the simplified GET API for reliable text-only responses
        const response = await fetch(`https://text.pollinations.ai/${prompt}?model=openai&cache=false`, {
            method: 'GET',
            headers: { 'Accept': 'text/plain' }
        });

        if (!response.ok) return null;

        const result = await response.text();
        if (!result || result.toLowerCase().includes('<!doctype html') || result.toLowerCase().includes('<html')) {
            return null; // Skip if we got HTML docs back
        }

        return result.trim();
    } catch (error) {
        console.error(`Pollinations Fetch Error: ${error.message}`);
        return null;
    }
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

    const cleanModelOutput = (res) => {
        if (!res) return res;
        
        let cleaned = res.trim();
        
        // 1. Extract content from the first triple-backtick block if present
        const codeBlockMatch = cleaned.match(/```(?:[a-z]*)\r?\n?([\s\S]*?)```/i);
        if (codeBlockMatch) {
            cleaned = codeBlockMatch[1].trim();
        }

        // 2. Remove common conversational prefixes
        const commonPrefixes = [
            /^(Here is the rewritten text:?)/i,
            /^(The rewritten (text|content) is:?)/i,
            /^(Rewritten (text|content):?)/i,
            /^(Sure, here is the rewritten (text|content):?)/i,
            /^(Certainly,? here is the refined (text|content):?)/i,
            /^(I have rewritten the (text|content) for you:?)/i
        ];
        
        for (const prefix of commonPrefixes) {
            cleaned = cleaned.replace(prefix, '').trim();
        }

        // 3. Final cleanup of any remaining backticks
        cleaned = cleaned.replace(/```/g, '');
        
        return cleaned.trim();
    };

    try {
        const pollinationsResult = await rewriteWithPollinations(text, fieldName);
        if (pollinationsResult) return cleanModelOutput(pollinationsResult);
    } catch (error) {
        console.error(`Pollinations error: ${error.message}`);
    }

    try {
        const hfResult = await rewriteWithHuggingFace(text, fieldName);
        if (hfResult) return cleanModelOutput(hfResult);
    } catch (error) {
        console.error(`Hugging Face error: ${error.message}`);
    }

    try {
        const groqResult = await rewriteWithGroq(text, fieldName);
        if (groqResult) return cleanModelOutput(groqResult);
    } catch (error) {
        console.error(`Groq error: ${error.message}`);
    }

    // Final fallback to heuristic rewrite
    return heuristicRewrite(text, fieldName);
}

async function analyzeDocumentWithAI(fileContent) {
    if (!fileContent || fileContent.length < 50) return null;
    try {
        const textToAnalyze = fileContent.substring(0, 3500);
        const promptText = `Analyze this software requirement document and extract key details. 
Return ONLY a valid JSON object with EXACTLY these keys:
{
  "project_name": "string",
  "objective": "string",
  "scenarios": "string (multiline list)",
  "risks": "string",
  "in_scope": "string"
}
DOCUMENT CONTENT:
${textToAnalyze}`;

        const prompt = encodeURIComponent(promptText);
        const response = await fetch(`https://text.pollinations.ai/${prompt}?model=openai&cache=false`, {
            method: 'GET'
        });

        if (!response.ok) return null;
        let result = await response.text();
        
        // Strip markdown if AI returned it
        result = result.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            return JSON.parse(result);
        } catch (e) {
            console.error("AI Analysis Parse Error:", e);
            return null;
        }
    } catch (err) {
        console.error("AI Analysis Error:", err);
        return null;
    }
}

module.exports = {
    heuristicRewrite,
    rewriteText,
    analyzeDocumentWithAI
};

