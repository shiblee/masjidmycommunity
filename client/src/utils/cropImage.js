// Standard canvas-based crop recipe for use with react-easy-crop's
// onCropComplete pixel-crop output. Produces a fixed-size, compressed JPEG
// Blob regardless of the source image's native resolution — this is what
// keeps every profile photo a predictable size on disk and consistent to
// display, no matter what the user uploaded.

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

function getRadianAngle(degrees) {
  return (degrees * Math.PI) / 180;
}

function rotatedBoundingBox(width, height, rotation) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

const OUTPUT_SIZE = 640;
const OUTPUT_QUALITY = 0.88;

export async function getCroppedImageBlob(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const rotRad = getRadianAngle(rotation);
  const { width: boxWidth, height: boxHeight } = rotatedBoundingBox(image.width, image.height, rotation);

  // Draw the full (rotated) source image onto a bounding-box-sized canvas.
  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = boxWidth;
  rotatedCanvas.height = boxHeight;
  const rotatedCtx = rotatedCanvas.getContext("2d");
  rotatedCtx.translate(boxWidth / 2, boxHeight / 2);
  rotatedCtx.rotate(rotRad);
  rotatedCtx.translate(-image.width / 2, -image.height / 2);
  rotatedCtx.drawImage(image, 0, 0);

  // Lift out just the cropped rectangle at its native resolution.
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = pixelCrop.width;
  cropCanvas.height = pixelCrop.height;
  cropCanvas
    .getContext("2d")
    .drawImage(rotatedCanvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

  // Resize down to the standardized output dimensions and compress.
  const outCanvas = document.createElement("canvas");
  outCanvas.width = OUTPUT_SIZE;
  outCanvas.height = OUTPUT_SIZE;
  outCanvas.getContext("2d").drawImage(cropCanvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return new Promise((resolve, reject) => {
    outCanvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process this image."))), "image/jpeg", OUTPUT_QUALITY);
  });
}
