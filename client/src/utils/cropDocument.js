// Same rotation/crop recipe as cropImage.js (used for the round profile-photo
// editor), but deliberately NOT that file's square, fixed 640x640 output —
// squashing a rectangular ID card or A4 document into a square would distort
// it and make the printed text unreadable. This keeps the crop's own aspect
// ratio, capped to a max dimension, at a higher JPEG quality so document
// numbers and small print stay legible for admin review.

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

const MAX_DIMENSION = 1800;
const OUTPUT_QUALITY = 0.92;

export async function getCroppedDocumentBlob(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const rotRad = getRadianAngle(rotation);
  const { width: boxWidth, height: boxHeight } = rotatedBoundingBox(image.width, image.height, rotation);

  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = boxWidth;
  rotatedCanvas.height = boxHeight;
  const rotatedCtx = rotatedCanvas.getContext("2d");
  rotatedCtx.translate(boxWidth / 2, boxHeight / 2);
  rotatedCtx.rotate(rotRad);
  rotatedCtx.translate(-image.width / 2, -image.height / 2);
  rotatedCtx.drawImage(image, 0, 0);

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = pixelCrop.width;
  cropCanvas.height = pixelCrop.height;
  cropCanvas
    .getContext("2d")
    .drawImage(rotatedCanvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(pixelCrop.width, pixelCrop.height));
  const outCanvas = document.createElement("canvas");
  outCanvas.width = Math.round(pixelCrop.width * scale);
  outCanvas.height = Math.round(pixelCrop.height * scale);
  outCanvas.getContext("2d").drawImage(cropCanvas, 0, 0, outCanvas.width, outCanvas.height);

  return new Promise((resolve, reject) => {
    outCanvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process this image."))), "image/jpeg", OUTPUT_QUALITY);
  });
}
