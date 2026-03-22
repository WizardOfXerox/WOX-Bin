import { normalizeFormatSlug } from "@/lib/convert/parse-path";

/** Target is audio-only container / codec family */
const AUDIO_OUTPUT = new Set([
  "mp3",
  "wav",
  "flac",
  "ogg",
  "opus",
  "aac",
  "m4a",
  "m4r",
  "wma",
  "amr",
  "ac3",
  "aiff",
  "ape",
  "ra",
  "wv",
  "gsm",
  "tta",
  "voc",
  "au",
  "caf",
  "dts"
]);

/** Target is video container */
const VIDEO_OUTPUT = new Set([
  "mp4",
  "webm",
  "mkv",
  "mov",
  "avi",
  "mpeg",
  "mpg",
  "m2v",
  "m4v",
  "ogv",
  "flv",
  "wmv",
  "ts",
  "m2ts",
  "mts",
  "vob",
  "3gp",
  "3g2",
  "asf",
  "f4v",
  "divx",
  "xvid",
  "mxf",
  "wtv",
  "swf",
  "mod",
  "tod",
  "dv",
  "gif",
  "rm",
  "rmvb",
  "mjpeg",
  "av1",
  "hevc",
  "cavs",
  "mpeg2",
  "mpeg-2"
]);

export type FfmpegWorkerPlan = {
  from: string;
  to: string;
  mode: "audio" | "video";
  outputExt: string;
  outputMime: string;
};

function outputMimeFor(ext: string): string {
  const e = ext.toLowerCase();
  const m: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mpeg: "video/mpeg",
    mpg: "video/mpeg",
    gif: "image/gif",
    flv: "video/x-flv",
    wmv: "video/x-ms-wmv",
    ogv: "video/ogg",
    ts: "video/mp2t",
    m2ts: "video/mp2t",
    "3gp": "video/3gpp",
    m4v: "video/x-m4v",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    ogg: "audio/ogg",
    opus: "audio/opus",
    aac: "audio/aac",
    m4a: "audio/mp4",
    m4r: "audio/mp4",
    wma: "audio/x-ms-wma",
    amr: "audio/amr",
    ac3: "audio/ac3",
    aiff: "audio/aiff"
  };
  return m[e] ?? "application/octet-stream";
}

function normalizeOutputExt(to: string): string {
  const t = normalizeFormatSlug(to);
  if (t === "jpeg") {
    return "jpg";
  }
  if (t === "mpeg2" || t === "mpeg-2") {
    return "mpg";
  }
  return t;
}

/**
 * If this returns non-null, the FFmpeg worker can attempt the conversion (subject to codecs on the server).
 */
export function getFfmpegWorkerPlan(from: string, to: string): FfmpegWorkerPlan | null {
  const f = normalizeFormatSlug(from);
  const tRaw = normalizeFormatSlug(to);
  const t = normalizeOutputExt(tRaw);

  if (AUDIO_OUTPUT.has(tRaw) || AUDIO_OUTPUT.has(t)) {
    return {
      from: f,
      to: t,
      mode: "audio",
      outputExt: t,
      outputMime: outputMimeFor(t)
    };
  }

  if (VIDEO_OUTPUT.has(tRaw) || VIDEO_OUTPUT.has(t)) {
    return {
      from: f,
      to: t,
      mode: "video",
      outputExt: t,
      outputMime: outputMimeFor(t)
    };
  }

  return null;
}

/**
 * argv only (no `ffmpeg` prefix) — suitable for execFile("ffmpeg", args)
 */
export function buildFfmpegArgs(inputPath: string, outputPath: string, plan: FfmpegWorkerPlan): string[] {
  const base = ["-hide_banner", "-loglevel", "warning", "-y", "-i", inputPath];

  if (plan.mode === "audio") {
    switch (plan.to) {
      case "mp3":
        return [...base, "-vn", "-c:a", "libmp3lame", "-q:a", "2", outputPath];
      case "wav":
        return [...base, "-vn", "-c:a", "pcm_s16le", outputPath];
      case "flac":
        return [...base, "-vn", "-c:a", "flac", outputPath];
      case "ogg":
        return [...base, "-vn", "-c:a", "libvorbis", "-q:a", "5", outputPath];
      case "opus":
        return [...base, "-vn", "-c:a", "libopus", "-b:a", "128k", outputPath];
      case "aac":
      case "m4a":
      case "m4r":
        return [...base, "-vn", "-c:a", "aac", "-b:a", "192k", outputPath];
      case "wma":
        return [...base, "-vn", "-c:a", "wmav2", "-b:a", "192k", outputPath];
      case "amr":
        return [...base, "-vn", "-c:a", "libopencore_amrnb", "-b:a", "12.2k", outputPath];
      case "ac3":
        return [...base, "-vn", "-c:a", "ac3", "-b:a", "448k", outputPath];
      case "aiff":
        return [...base, "-vn", "-c:a", "pcm_s16be", outputPath];
      default:
        return [...base, "-vn", "-c:a", "aac", "-b:a", "192k", outputPath];
    }
  }

  /* video */
  switch (plan.to) {
    case "webm":
      return [...base, "-c:v", "libvpx-vp9", "-crf", "35", "-b:v", "0", "-c:a", "libopus", "-threads", "0", outputPath];
    case "mp4":
    case "m4v":
      return [
        ...base,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        outputPath
      ];
    case "mkv":
      return [...base, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", outputPath];
    case "mov":
      return [...base, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", outputPath];
    case "avi":
      return [...base, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "libmp3lame", "-q:a", "4", outputPath];
    case "gif":
      return [
        ...base,
        "-vf",
        "fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse",
        "-loop",
        "0",
        outputPath
      ];
    case "wmv":
      return [...base, "-c:v", "msmpeg4", "-c:a", "wmav2", "-b:a", "128k", outputPath];
    case "flv":
      return [...base, "-c:v", "libx264", "-preset", "fast", "-c:a", "aac", outputPath];
    case "mpeg":
    case "mpg":
    case "m2v":
      return [...base, "-c:v", "mpeg2video", "-c:a", "mp2", "-b:a", "192k", outputPath];
    case "ts":
    case "m2ts":
    case "mts":
      return [...base, "-c:v", "libx264", "-preset", "fast", "-c:a", "aac", "-f", "mpegts", outputPath];
    case "3gp":
    case "3g2":
      return [...base, "-c:v", "libx264", "-profile:v", "baseline", "-level", "3.0", "-c:a", "aac", "-b:a", "128k", outputPath];
    case "ogv":
      return [...base, "-c:v", "libtheora", "-c:a", "libvorbis", "-q:a", "5", outputPath];
    default:
      return [...base, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", outputPath];
  }
}
