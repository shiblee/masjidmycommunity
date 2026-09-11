import { execFile } from "child_process";
import path from "path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

// Real server-side thumbnail generation — the client-side "seek the <video>
// element a hair forward" trick (still used as a fallback by MediaThumb.jsx
// for anything uploaded before this existed) isn't reliable across browsers
// and depends on the browser actually buffering/decoding a frame on its
// own. Extracting one real frame at upload time and serving it as a plain
// image (<video poster>) is the only fix that always works everywhere,
// including on the public site.
export function generateVideoThumbnail(videoAbsolutePath, outputDir) {
  return new Promise((resolve) => {
    const fileName = `${path.basename(videoAbsolutePath, path.extname(videoAbsolutePath))}-poster.jpg`;
    const outputPath = path.join(outputDir, fileName);

    // 1s in — the very first frame is often still black on phone-camera
    // recordings (lens/exposure settling), 1s is a safer, still-fast bet.
    // -vframes 1 + a JPEG target keeps this to a single quick frame grab,
    // not a real transcode. eq=brightness/contrast lifts the extracted
    // frame a little -- real footage grabbed at a single instant often
    // reads darker as a static thumbnail than it does in motion.
    execFile(
      ffmpegPath.path,
      ["-y", "-ss", "1", "-i", videoAbsolutePath, "-vframes", "1", "-vf", "scale=640:-1,eq=brightness=0.08:contrast=1.06", "-q:v", "4", outputPath],
      (err) => {
        if (err) {
          resolve(null);
          return;
        }
        resolve(fileName);
      }
    );
  });
}
