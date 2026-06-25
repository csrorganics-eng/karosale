// Scan columns of the webp to find the transparent gap between emblem and text
const sharp = require("sharp");
const path = require("path");

async function main() {
  const src = path.join(__dirname, "../public/brand/csrorganics-logo.webp");
  // Scan a wide slice: x=200 to x=260
  const { data, info } = await sharp(src)
    .extract({ left: 200, top: 0, width: 60, height: 126 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // info.channels should be 4 (RGBA)
  console.log("channels:", info.channels);
  for (let x = 0; x < info.width; x++) {
    let maxAlpha = 0;
    let minAlpha = 255;
    for (let y = 0; y < info.height; y++) {
      const alpha = data[(y * info.width + x) * info.channels + (info.channels - 1)];
      if (alpha > maxAlpha) maxAlpha = alpha;
      if (alpha < minAlpha) minAlpha = alpha;
    }
    const absX = 200 + x;
    if (maxAlpha < 30) {
      console.log(`x=${absX}: TRANSPARENT (max alpha=${maxAlpha})`);
    } else {
      console.log(`x=${absX}: opaque (max=${maxAlpha}, min=${minAlpha})`);
    }
  }
}

main().catch(console.error);
