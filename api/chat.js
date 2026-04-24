export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { provider, messages } = req.body;

  try {
    let result = '';

    if (provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.GROQ_KEY
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 4000,
          messages: messages
        })
      });
      const data = await response.json();
      result = data.choices?.[0]?.message?.content;
      if (!result) throw new Error('Groq empty response');

    } else if (provider === 'gemini') {
      const systemMsg = messages.find(m => m.role === 'system');
      const chatMsgs = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemMsg?.content || '' }] },
            contents: chatMsgs,
            generationConfig: { maxOutputTokens: 4000 }
          })
        }
      );
      const data = await response.json();
      result = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!result) throw new Error('Gemini empty response');

    } else if (provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.OPENROUTER_KEY
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct:free',
          max_tokens: 4000,
          messages: messages
        })
      });
      const data = await response.json();
      result = data.choices?.[0]?.message?.content;
      if (!result) throw new Error('OpenRouter empty response');
    }

    res.status(200).json({ result });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
