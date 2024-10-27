import fetch from 'node-fetch';

export default async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { prompt, maxTokens } = req.body;
        
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Invalid prompt' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        // Add timeout of 8 minutes (480000ms)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 480000);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'o1-mini',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_completion_tokens: Math.min(parseInt(maxTokens) || 25000, 65536),
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return res.status(200).json({ story: data.choices[0].message.content });
    } catch (error) {
        console.error('API Error:', error);
        if (error.name === 'AbortError') {
            return res.status(504).json({ error: 'Request timeout - story generation took too long' });
        }
        return res.status(500).json({ error: error.message || 'An error occurred generating the story' });
    }
}
