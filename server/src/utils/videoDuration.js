import { execFile } from "child_process";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";

// This codebase has no ffprobe binary -- @ffmpeg-installer/ffmpeg only
// ships ffmpeg itself. Running ffmpeg with just "-i <file>" and no output
// still makes it print "Duration: HH:MM:SS.xx, ..." to stderr before it
// exits non-zero (no output was requested) -- a well-known trick that
// avoids adding a second binary dependency just to read one number.
export function getVideoDuration(videoAbsolutePath) {
  return new Promise((resolve) => {
    execFile(ffmpegPath.path, ["-i", videoAbsolutePath], (_err, _stdout, stderr) => {
      const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr || "");
      if (!match) return resolve(null);
      const [, h, m, s] = match;
      resolve(Number(h) * 3600 + Number(m) * 60 + Number(s));
    });
  });
}
