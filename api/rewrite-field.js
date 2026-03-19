const { rewriteText } = require('../tools/rewrite_text');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed.' });
    }

    try {
        const { text, fieldName } = req.body || {};
        if (!String(text || '').trim()) {
            return res.status(400).json({ success: false, error: 'Text is required for rewrite.' });
        }

        const rewritten = await rewriteText(text, fieldName);
        return res.status(200).json({ success: true, rewritten });
    } catch (error) {
        console.error('API rewrite error:', error.message);
        return res.status(500).json({ success: false, error: error.message || 'Failed to rewrite field.' });
    }
};
