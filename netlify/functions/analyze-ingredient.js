exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'GEMINI_API_KEY environment variable is not set' })
        };
    }

    let prompt;
    try {
        ({ prompt } = JSON.parse(event.body));
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    if (!prompt) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt field' }) };
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048
        }
    };

    try {
        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody)
        });

        const responseText = await geminiResponse.text();

        if (!geminiResponse.ok) {
            return {
                statusCode: geminiResponse.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: `Gemini API error ${geminiResponse.status}`,
                    details: responseText
                })
            };
        }

        // Pass the raw Gemini response body through — index.html parses candidates[] directly
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: responseText
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message })
        };
    }
};
