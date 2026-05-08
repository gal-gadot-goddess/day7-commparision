
import sys
import json
import os
import subprocess
import time
from pathlib import Path
from dotenv import load_dotenv

# Add the root directory to sys.path
current_dir = Path(__file__).parent.absolute()
root_dir = current_dir.parent.absolute()
sys.path.append(str(root_dir))

# Import upload functions
try:
    from upload.upload_instagram import upload_to_instagram
    from upload.upload_facebook import upload_to_facebook
    from upload.upload_threads import upload_to_threads
    from upload.upload_to_youtube import upload_to_youtube
    from upload.upload_twitter import upload_to_twitter
    print("✅ Successfully imported all upload modules.")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def run_command(command, cwd=None, ignore_errors=False):
    print(f"🚀 Running: {command}")
    try:
        subprocess.run(command, check=True, shell=True, cwd=cwd)
        print("✅ Command finished successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Command failed: {e}")
        if not ignore_errors:
            sys.exit(1)
        return False

def main():
    # Load .env from root
    load_dotenv(dotenv_path=root_dir / '.env')

    # Paths
    scripts_dir = current_dir / "scripts"
    data_file = current_dir / "src/data/current_topic.json"
    metadata_file = current_dir / "metadata.json"
    video_path = current_dir / "recording.mp4"
    thumbnail_path = current_dir / "thumbnail.jpg"

    # 1. Generate New Topic
    print("\n" + "="*50)
    print("🎨 STEP 1: GENERATING NEW TOPIC")
    print("="*50)
    run_command("node generate_topic.cjs", cwd=scripts_dir)

    if not data_file.exists():
        print(f"❌ Failed to generate topic file at {data_file}")
        sys.exit(1)

    with open(data_file, 'r', encoding='utf-8') as f:
        topic_data = json.load(f)

    topic_title = topic_data.get("title", "Algorithm Visualization")
    topic_tagline = topic_data.get("tagline", "Visualizing Complexity")
    print(f"✅ Topic Generated: {topic_title} - {topic_tagline}")

    # 2. Generate AI Metadata
    print("\n" + "="*50)
    print("🧠 STEP 2: GENERATING AI METADATA")
    print("="*50)
    gen_metadata_script = root_dir / "scripts/generate_ai_metadata.mjs"
    # Ignore errors here because node sometimes crashes at the end but saves the file
    run_command(f'node "{gen_metadata_script}" "{topic_title}" "{topic_tagline}"', cwd=current_dir, ignore_errors=True)

    if not metadata_file.exists():
        print(f"❌ Failed to generate metadata file at {metadata_file}")
        sys.exit(1)

    print("✅ Metadata File Verified")

    # 3. Record Video
    print("\n" + "="*50)
    print("🎥 STEP 3: RECORDING VIDEO")
    print("="*50)
    run_command("node capture_demo.js", cwd=current_dir)

    if not video_path.exists():
        print(f"❌ Failed to record video at {video_path}")
        sys.exit(1)

    print(f"✅ Video Recorded: {video_path}")
    if thumbnail_path.exists():
        print(f"✅ Thumbnail Extracted: {thumbnail_path}")

    # 4. Upload to Social Media
    print("\n" + "="*50)
    print("🚀 STEP 4: UPLOADING TO SOCIAL MEDIA")
    print("="*50)

    with open(metadata_file, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    title = metadata.get("title", topic_title)
    hashtags = metadata.get("hashtags", "#algorithm #coding #tech")
    if isinstance(hashtags, list):
        hashtags = " ".join(hashtags)
    
    # --- YouTube ---
    print("\n🎬 [1/5] UPLOADING TO YOUTUBE...")
    try:
        yt_desc = metadata.get("yt_description", f"{topic_tagline}\n\n{hashtags}")
        tags_list = [t.strip("#") for t in hashtags.split() if t.strip().startswith("#")]
        upload_to_youtube(
            video_path=str(video_path),
            title=title[:100],
            description=yt_desc[:4000],
            tags=tags_list,
            thumbnail_path=str(thumbnail_path) if thumbnail_path.exists() else None
        )
        print("✅ YouTube Upload Complete!")
    except Exception as e:
        print(f"❌ YouTube upload failed: {e}")

    # --- Instagram ---
    print("\n📸 [2/5] UPLOADING TO INSTAGRAM...")
    try:
        ig_caption = metadata.get("ig_caption", f"{title}\n\n{topic_tagline}\n\n{hashtags}")
        upload_to_instagram(
            str(video_path), 
            ig_caption, 
            is_story=False,
            thumbnail_path=str(thumbnail_path) if thumbnail_path.exists() else None
        )
        print("✅ Instagram Reel Upload Complete!")
    except Exception as e:
        print(f"❌ Instagram upload failed: {e}")

    # --- Facebook ---
    print("\n📘 [3/5] UPLOADING TO FACEBOOK...")
    try:
        fb_caption = metadata.get("fb_caption", f"{title}\n\n{topic_tagline}\n\n{hashtags}")
        upload_to_facebook(
            str(video_path), 
            fb_caption, 
            title=title[:100],
            thumbnail_path=str(thumbnail_path) if thumbnail_path.exists() else None
        )
        print("✅ Facebook Reel Upload Complete!")
    except Exception as e:
        print(f"❌ Facebook upload failed: {e}")

    # --- Threads ---
    print("\n🧵 [4/5] UPLOADING TO THREADS...")
    try:
        threads_caption = metadata.get("threads_caption", f"{title}\n\n{hashtags}")
        upload_to_threads(str(video_path), threads_caption)
        print("✅ Threads Upload Complete!")
    except Exception as e:
        print(f"❌ Threads upload failed: {e}")

    # --- Twitter ---
    print("\n🐦 [5/5] UPLOADING TO TWITTER...")
    try:
        short_caption = f"{title}\n{hashtags}"
        if len(short_caption) > 280:
             short_caption = short_caption[:277] + "..."
        upload_to_twitter(str(video_path), short_caption)
        print("✅ Twitter Upload Complete!")
    except Exception as e:
        print(f"❌ Twitter upload failed: {e}")

    print("\n" + "="*50)
    print("🎉 DAY 7 AUTOMATION COMPLETED!")
    print("="*50)

if __name__ == "__main__":
    main()
