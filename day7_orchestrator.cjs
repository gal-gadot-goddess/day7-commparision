const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const HISTORY_FILE = path.join(__dirname, 'history.json');
const TOPICS_DIR = path.join(__dirname, 'src/topics');
const CURRENT_TOPIC_FILE = path.join(__dirname, 'src/data/current_topic.json');

function loadHistory() {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

function saveHistory(item) {
    const history = loadHistory();
    history.push({ ...item, date: new Date().toISOString() });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`[EXEC] ${command} ${args.join(' ')}`);
        const proc = spawn(command, args, {
            env: { ...process.env, ...options.env },
            ...options,
            shell: true
        });

        let output = "";
        proc.stdout.on('data', d => {
            output += d.toString();
            console.log(d.toString());
        });
        proc.stderr.on('data', d => {
            output += d.toString();
            console.error(d.toString());
        });

        proc.on('close', code => {
            if (code === 0) resolve();
            else {
                console.error(`FAILED: ${command} ${args.join(' ')} with code ${code}`);
                reject(new Error(`${command} failed. Output: ${output.slice(-500)}`));
            }
        });
    });
}

async function automateDay7() {
    console.log("Generating Dynamic Topic via AI...");
    const genTopicScript = path.join(__dirname, 'scripts/generate_topic.cjs');
    
    try {
        // Step 1: Generate a fresh topic using AI
        await runCommand('node', ["\"" + genTopicScript + "\""], { cwd: __dirname });
        
        // Step 2: Load the newly generated topic data
        if (!fs.existsSync(CURRENT_TOPIC_FILE)) {
            throw new Error("AI Topic generation failed: current_topic.json not found.");
        }
        const topicData = JSON.parse(fs.readFileSync(CURRENT_TOPIC_FILE, 'utf8'));

        console.log(`DAY 7 AUTOMATION (AI): [${topicData.title}]`);
        
        const videoPath = path.join(__dirname, 'recording.mp4');

        console.log(`Generating Video...`);
        await runCommand('node', ['capture_demo.js'], { cwd: __dirname });

        console.log("Generating AI Metadata...");
        const metaScript = path.join(__dirname, 'scripts/generate_ai_metadata.mjs');
        await runCommand('node', ["\"" + metaScript + "\"", `"${topicData.title}"`, `"${topicData.tagline}"`], { cwd: __dirname });

        console.log("Uploading Video to Social Media...");
        const uploadScript = path.join(__dirname, 'scripts/unified_uploader.py');
        await runCommand('python', ["\"" + uploadScript + "\"", videoPath], { cwd: __dirname });

        saveHistory({
            topic: topicData.title,
            title: topicData.title
        });
        
        console.log("Day 7 Generation Success!");

    } catch (error) {
        console.error("Automation failed:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    automateDay2 = undefined; // safety
    automateDay7();
}

