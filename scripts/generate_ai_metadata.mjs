import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const POLLINATIONS_API_URL = 'https://gen.pollinations.ai/v1/chat/completions';

async function generateMetadata(algoName, description) {
    const prompt = `
    You are an expert computer science educator and viral content creator. 
    Write an ELABORATE, DEEPLY EDUCATIONAL social media package about the ${algoName} algorithm.
    Algorithm description: "${description}".
    
    The audience wants to STUDY and LEARN. 

    RETURN ONLY A VALID JSON OBJECT with exactly these keys:
    - title: "A powerful, catchy educational title"
    - ig_caption: "Full masterclass for Instagram (max 2100 chars). Include logic, intuition, and applications."
    - threads_caption: "Punchy, academic summary for Threads (STRICTLY MAX 480 characters)."
    - fb_caption: "Engaging, conversational explanation for Facebook (detailed, no strict limit)."
    - yt_description: "SEO-optimized description for YouTube (max 4000 chars). Include timestamps placeholders and deep technical details."
    - tiktok_caption: "Short, hook-heavy caption for TikTok (max 500 chars) that encourages repeat watches."
    - hashtags: "15-20 trending and academic hashtags starting with #"

    Rules:
    - No markdown formatting like ** or ##.
    - No introductory text or conversational filler.
    - Respect the character limits mentioned.
    `;

    try {
        const response = await fetch(POLLINATIONS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: prompt }],
                model: 'gemini-fast',
                seed: Math.floor(Math.random() * 100000)
            })
        });

        const fullResponse = await response.json();
        const content = fullResponse.choices?.[0]?.message?.content || "";

        console.log('--- AI Content ---');
        console.log(content);
        console.log('-------------------');

        // Extract the actual JSON from the content string
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0].replace(/```json|```/g, '').trim());
        }

        throw new Error('No valid JSON found in AI response content');


    } catch (error) {
        console.error('Error generating AI metadata:', error);
        return null;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const algoName = args[0] || 'Bubble Sort';
    const algoDesc = args[1] || 'Repeatedly swaps adjacent elements if they are in the wrong order.';

    console.log(`🤖 Generating AI metadata for: ${algoName}...`);
    const metadata = await generateMetadata(algoName, algoDesc);

    if (metadata) {
        fs.writeFileSync('metadata.json', JSON.stringify(metadata, null, 2));
        console.log('✅ Metadata saved to metadata.json');
        process.exit(0);
    } else {
        console.error('❌ Failed to generate metadata');
        process.exit(1);
    }
}

main();
