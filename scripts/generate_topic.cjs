
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_KEY = process.env.POLLINATIONS_API_KEY;
const MODEL = 'openai';

const OUTPUT_FILE = path.join(__dirname, '../src/data/current_topic.json');
const TOPICS_DIR = path.join(__dirname, '../src/topics');
const HISTORY_FILE = path.join(__dirname, '../history.json');

if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
}
if (!fs.existsSync(TOPICS_DIR)) {
    fs.mkdirSync(TOPICS_DIR, { recursive: true });
}

function loadUsedTopics() {
    const used = new Set();
    if (fs.existsSync(TOPICS_DIR)) {
        const files = fs.readdirSync(TOPICS_DIR).filter(f => f.endsWith('.json'));
        for (const f of files) {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(TOPICS_DIR, f), 'utf8'));
                if (data.title) used.add(data.title.toLowerCase());
            } catch (e) {}
        }
    }
    if (fs.existsSync(HISTORY_FILE)) {
        try {
            const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
            for (const entry of history) {
                if (entry.topic) used.add(entry.topic.toLowerCase());
            }
        } catch (e) {}
    }
    return [...used];
}

const usedTopics = loadUsedTopics();

const PROMPT = `
Generate a UNIQUE and CREATIVE JSON object for a technical algorithm visualization.
BE CREATIVE: Do not repeat common topics. Explore diverse areas of Computer Science, Software Engineering, AI, Systems, and Math.
Examples of areas: Data Compression, Consensus Algorithms, Memory Management, Graphics Rendering, Load Balancing, Game AI, Compiler Optimization, etc.

Return ONLY raw JSON. No markdown. No reasoning.
Rules:
1. Title: SHORT, catchy, and professional (max 4 words).
2. Curves: Compare 3-5 approaches/algorithms related to the topic.
3. **VARIETY IS CRITICAL**: Every time you are called, try to pick a niche but interesting technical comparison.
4. **ABSOLUTELY DO NOT** generate any of these already-used topics: ${usedTopics.join(', ') || 'none yet'}. Pick something completely different.
5. Formulas: standard JS math. 
   - Use the FULL range 0-100 on the Y axis.
   - Curves should reflect REAL performance differences (e.g., O(1), O(log n), O(n), O(n log n), O(n^2)).
   - Do not clamp values; let them scale naturally.
6. Tagline: One short sentence explaining the comparison.
Structure:
{
  "title": "TITLE",
  "tagline": "Subtitle",
  "xAxisLabel": "X Axis Label",
  "yAxisLabel": "Y Axis Label",
  "curves": [
    {
      "id": "1",
      "label": "Bubble Sort",
      "color": "#FF00FF",
      "formula": "n => 0.1 * n * n",
      "code": "for(i=0;i<n;i++) for(j=0;j<n-i-1;j++)..."
    }
  ]
}
`;

async function fetchTopic() {
    console.log(`Using Authenticated Endpoint: https://gen.pollinations.ai/v1/chat/completions`);
    console.log(`Model: ${MODEL}`);

    const postData = JSON.stringify({
        model: MODEL,
        messages: [
            { role: "user", content: PROMPT }
        ],
        jsonMode: true
    });

    const options = {
        hostname: 'gen.pollinations.ai',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Response Status:', res.statusCode);

            try {
                const response = JSON.parse(data);

                if (res.statusCode !== 200) {
                    console.error('API Error:', response);
                    process.exit(1);
                }

                // Extract content from OpenAI-compatible response structure
                let content = response.choices?.[0]?.message?.content;

                if (!content) {
                    throw new Error('No content in response');
                }

                // Clean markdown if present
                content = content.trim();
                const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) || content.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    const jsonStr = jsonMatch[1] || jsonMatch[0];
                    const topic = JSON.parse(jsonStr);

                    // Normalize info
                    topic.curves.forEach((c, i) => {
                        if (!c.id) c.id = `curve-${i}`;
                        if (!c.name) c.name = c.label;
                    });

                    console.log('Generated Topic:', topic.title);
                    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(topic, null, 2));
                    console.log(`Saved to ${OUTPUT_FILE}`);

                    const slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.json';
                    const archivePath = path.join(TOPICS_DIR, slug);
                    if (!fs.existsSync(archivePath)) {
                        fs.writeFileSync(archivePath, JSON.stringify(topic, null, 2));
                        console.log(`Archived to ${archivePath}`);
                    }
                } else {
                    console.error('Could not find JSON in response');
                    console.log('Raw content:', content);
                    process.exit(1);
                }

            } catch (e) {
                console.error('Parse Error:', e);
                console.log('Raw Data:', data);
                process.exit(1);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Request Error:', e);
        process.exit(1);
    });

    req.write(postData);
    req.end();
}

fetchTopic();
