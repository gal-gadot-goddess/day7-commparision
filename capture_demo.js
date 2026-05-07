import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import path from 'path';
import { fileURLToPath } from 'url';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ffmpeg = require('ffmpeg-static');

const fs = require('fs');
const { execSync } = require('child_process');

async function capture() {
    console.log('🚀 Starting Robust Audio/Video Capture...');
    const VIDEO_PATH = path.join(__dirname, 'temp_video.mp4');
    const AUDIO_PATH = path.join(__dirname, 'temp_audio.webm');
    const FINAL_PATH = path.join(__dirname, 'recording.mp4');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1080,1920',
            '--autoplay-policy=no-user-gesture-required',
        ],
        defaultViewport: { width: 1080, height: 1920 },
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });

    // Expose function to save audio chunks from browser
    const audioChunks = [];
    await page.exposeFunction('saveAudioChunk', (base64) => {
        audioChunks.push(Buffer.from(base64, 'base64'));
    });

    const recorder = new PuppeteerScreenRecorder(page, {
        followNewTab: true,
        fps: 60,
        ffmpeg_Path: ffmpeg,
        videoFrame: { width: 1080, height: 1920 },
        aspectRatio: '9:16',
        videoBitrate: 8000,
        audio: false // We capture audio manually
    });

    // Check for console errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    console.log('Navigating to app...');
    await page.goto(process.env.APP_URL || 'http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));

    // Inject manual audio recorder
    console.log('Injecting Audio Recorder...');
    await page.evaluate(() => {
        window.startAudioCapture = () => {
            console.log('Initializing Audio Service for Capture...');
            const audioService = window.audioService || { resume: () => {}, init: () => {}, ctx: { createMediaStreamDestination: () => ({ stream: new MediaStream() }), state: 'suspended', resume: () => {} }, masterGain: { connect: () => {} } };

            // Force initialization
            if (audioService.resume) audioService.resume();

            // Wait a tick for init
            setTimeout(() => {
                if (!audioService || !audioService.ctx || !audioService.masterGain) {
                    console.error('AudioService STILL not ready after resume!');
                    return;
                }

                // Ensure context is valid
                if (audioService.ctx.state === 'suspended') audioService.ctx.resume();

                const dest = audioService.ctx.createMediaStreamDestination();
                audioService.masterGain.connect(dest);

                const options = { mimeType: 'audio/webm' };
                const mediaRecorder = new MediaRecorder(dest.stream, options);

                mediaRecorder.ondataavailable = async (e) => {
                    if (e.data.size > 0) {
                        const reader = new FileReader();
                        reader.onload = () => window.saveAudioChunk(reader.result.split(',')[1]);
                        reader.readAsDataURL(e.data);
                    }
                };

                mediaRecorder.start(100); // Collect chunks every 100ms
                window._mediaRecorder = mediaRecorder;
                console.log('Audio recording started manually via MediaRecorder.');
            }, 500);
        };
    });

    // Start video recording
    await recorder.start(VIDEO_PATH);

    // Click to ensure context can start, then start everything
    await page.click('body').catch(() => { });

    // Start Audio + Animation
    await page.evaluate(() => {
        if (window.startAudioCapture) window.startAudioCapture();
        if (window.startSorting) window.startSorting();
    });

    console.log('Recording in progress...');

    // Wait for completion
    try {
        await Promise.race([
            page.waitForFunction(() => (window).isSortingCompleted === true, { timeout: 75000 }),
            new Promise(r => setTimeout(r, 45000)) // Fallback timeout
        ]);
    } catch (e) { }

    // Extra buffer
    await new Promise(r => setTimeout(r, 2000));

    // Stop everything
    await page.evaluate(() => {
        if (window._mediaRecorder && window._mediaRecorder.state !== 'inactive') {
            window._mediaRecorder.stop();
        }
    });

    // Give time for last chunks to arrive
    await new Promise(r => setTimeout(r, 1000));
    await recorder.stop();
    await browser.close();

    console.log('Processing files...');
    if (audioChunks.length > 0) {
        fs.writeFileSync(AUDIO_PATH, Buffer.concat(audioChunks));
        console.log('Audio captured. Merging...');
        try {
            // Merge video and audio
            execSync(`"${ffmpeg}" -y -i "${VIDEO_PATH}" -i "${AUDIO_PATH}" -c:v copy -c:a aac -shortest "${FINAL_PATH}"`);
            console.log(`Success! Video saved to ${FINAL_PATH}`);

            // Clean up
            fs.unlinkSync(VIDEO_PATH);
            fs.unlinkSync(AUDIO_PATH);
        } catch (e) {
            console.error('FFmpeg merge failed:', e.message);
        }
    } else {
        console.warn('No audio captured. Saving video only.');
        fs.renameSync(VIDEO_PATH, FINAL_PATH);
    }

    process.exit(0);
}

capture().catch(e => {
    console.error(e);
    process.exit(1);
});



