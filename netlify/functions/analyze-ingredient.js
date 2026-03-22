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

    // gemini-2.0-flash is deprecated; stable workhorse is gemini-2.5-flash (see ai.google.dev model docs)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            // Forces model output to be valid JSON string in text (avoids prose / no-brace replies)
            responseMimeType: 'application/json'
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
            // Always return 502 for upstream Gemini failures so the browser Network tab
            // does not show 404 (which looks like a missing Netlify function).
            let geminiRpcMessage = '';
            let geminiRpcCode = '';
            try {
                const parsed = JSON.parse(responseText);
                geminiRpcMessage = parsed?.error?.message || '';
                geminiRpcCode = parsed?.error?.code != null ? String(parsed.error.code) : (parsed?.error?.status || '');
            } catch (_) {
                geminiRpcMessage = responseText.substring(0, 500);
            }
            return {
                statusCode: 502,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: `Gemini API error ${geminiResponse.status}`,
                    apiFailureLayer: 'gemini_upstream',
                    geminiHttpStatus: geminiResponse.status,
                    geminiModel: 'gemini-2.5-flash',
                    geminiEndpoint: 'v1',
                    geminiRpcCode: geminiRpcCode || undefined,
                    geminiRpcMessage: geminiRpcMessage || undefined,
                    details: responseText,
                    serverDebugMeta: {
                        function: 'analyze-ingredient',
                        generativelanguagePath: '/v1/models/gemini-2.5-flash:generateContent'
                    }
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
