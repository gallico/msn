const fs = require("fs");
const path = require("path");

const mediaDir = path.join(__dirname, "../assets");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;

// Configure FFmpeg paths (run ONCE)
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

async function ensureThumbnail(videoPath, thumbDir, thumbFilename) {
    // thumb_video.png
    const thumbPath = path.join(thumbDir, thumbFilename);

    if (fs.existsSync(thumbPath)) return thumbFilename;

    console.log(`Generating: ${videoPath} → ${thumbPath}`);

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .seekInput("00:00:01")
            .screenshots({
                count: 1,
                folder: thumbDir,
                filename: thumbFilename, // "thumb_video.png" → PNG output!
                size: "320x180"
            })
            .on("end", () => resolve(thumbFilename))
            .on("error", reject);
    });
}

async function getMediaFromDir(dir = ".") {
    const fullDir = path.join(mediaDir, dir);
    if (!fs.existsSync(fullDir)) return [];

    const files = fs.readdirSync(fullDir, { withFileTypes: true })
        .filter(d => !d.name.startsWith("."))
        .filter(d => {
            if (d.isSymbolicLink()) {
                try {
                    const stats = fs.statSync(path.join(fullDir, d.name));
                    return stats.isFile();
                } catch {
                    return false;
                }
            }
            return d.isFile();
        })
        .map(d => d.name);

    const mediaItems = [];

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
        const isVideo = [".mp4", ".webm", ".avi", ".mov", ".mkv"].includes(ext);
        if(!isImage && !isVideo)
            continue;
        const baseName = path.basename(file, ext); // "video" from "video.mp4"
        if (baseName.startsWith("thumb_")) continue;

        const fullFilePath = path.join(fullDir, file);
        let thumbPath = null;


// Images: check for existing thumb_image.png
        if (isImage) {
            const imageThumbFile = `thumb_${baseName}.png`;
            const imageThumbPath = path.join(fullDir, imageThumbFile);
            if (fs.existsSync(imageThumbPath)) {
                thumbPath = imageThumbFile;
            }
        } else if (isVideo) {
            // Videos: generate thumb_video.png
            const videoThumbFile = `thumb_${baseName}.png`;
            const videoThumbPath = path.join(fullDir, videoThumbFile);

            try {
                await ensureThumbnail(fullFilePath, fullDir, videoThumbFile);
                if (fs.existsSync(videoThumbPath)) {
                    thumbPath = videoThumbFile; // "thumb_video.png"
                }
            } catch (err) {
                console.log(`Thumb generation failed for ${file}`);
            }
        }

        let nl = // Build item with CORRECT thumb filename
            mediaItems.push({
                id: file,
                src: `/media/${dir ? dir + "/" : ""}${file}`,
                thumb: thumbPath ? `/media/${dir ? dir + "/" : ""}${thumbPath}` : null, // ✅ thumb_video.png
                type: isImage ? "image" : "video",
                title: file,
                dir
            });
        let lelem = mediaItems[nl-1];
        console.log(`element: ${lelem.src} ${lelem.thumb ?? '<null>'}`);
    }

    return mediaItems.sort((a, b) => b.mtime - a.mtime);
}

module.exports = { getMediaFromDir };
