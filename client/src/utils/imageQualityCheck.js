// Lightweight, advisory-only image-quality heuristic — no OCR/AI service
// involved, just canvas pixel math. Downsamples the image, then checks mean
// luminance (too dark/too bright) and a Laplacian-variance blur estimate
// (a standard, simple "how much sharp edge detail is there" measure). These
// thresholds are reasonable starting points, not calibrated against a real
// document dataset — that's fine, since this only ever produces a gentle
// warning the user can dismiss and upload anyway; final judgment always
// stays with the verification team.
const SAMPLE_SIZE = 300;
const BLUR_VARIANCE_THRESHOLD = 25;
const DARK_LUMINANCE_THRESHOLD = 55;
const BRIGHT_LUMINANCE_THRESHOLD = 235;

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

export async function checkImageQuality(imageSrc) {
  try {
    const image = await createImage(imageSrc);
    const scale = Math.min(1, SAMPLE_SIZE / Math.max(image.width, image.height));
    const w = Math.max(1, Math.round(image.width * scale));
    const h = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const gray = new Float32Array(w * h);
    let luminanceSum = 0;
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[p] = l;
      luminanceSum += l;
    }
    const meanLuminance = luminanceSum / (w * h);

    let lapSum = 0;
    let lapSumSq = 0;
    let count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const lap = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - w] + gray[idx + w];
        lapSum += lap;
        lapSumSq += lap * lap;
        count++;
      }
    }
    const lapMean = count ? lapSum / count : 0;
    const variance = count ? lapSumSq / count - lapMean * lapMean : 0;

    const warnings = [];
    if (variance < BLUR_VARIANCE_THRESHOLD) {
      warnings.push("This image looks blurry — hold the camera steady and make sure the document is in focus.");
    }
    if (meanLuminance < DARK_LUMINANCE_THRESHOLD) {
      warnings.push("This image looks too dark — try uploading in better lighting.");
    } else if (meanLuminance > BRIGHT_LUMINANCE_THRESHOLD) {
      warnings.push("This image looks washed out or has glare — avoid direct light on the document.");
    }
    return warnings;
  } catch {
    return [];
  }
}
