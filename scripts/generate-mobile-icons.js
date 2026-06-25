const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const SRC_LOGO = path.join(__dirname, "../public/brand/csrorganics-logo.webp");
const OUT_DIR = path.join(__dirname, "../apps/mobile/assets/images");
const BRAND_GREEN = { r: 30, g: 77, b: 58, alpha: 1 }; // #1e4d3a

// SVG circle mask — clips the icon to a perfect circle
function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg><circle cx="${r}" cy="${r}" r="${r}"/></svg>`
  );
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // ── Extract emblem exactly (x=162→230, y=2→124) — pixel-scanned boundary ────
  // The gap between the emblem and the "R" of RGANICS is at x=231–232 (transparent)
  const emblemOnWhite = await sharp(SRC_LOGO)
    .extract({ left: 162, top: 2, width: 68, height: 122 })
    .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  // ── Circular masked version (for contexts that show a circle) ─────────────────
  const emblemCircle512 = await sharp(emblemOnWhite)
    .composite([{ input: circleMask(512), blend: "dest-in" }])
    .png()
    .toBuffer();

  // ── 1. icon.png — 1024×1024, white square (iOS clips to circle automatically) ─
  await sharp(emblemOnWhite)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(OUT_DIR, "icon.png"));
  console.log("✓ icon.png (1024×1024, white bg)");

  // ── 2. favicon.png — 64×64 ───────────────────────────────────────────────────
  await sharp(emblemOnWhite)
    .resize(64, 64)
    .png()
    .toFile(path.join(OUT_DIR, "favicon.png"));
  console.log("✓ favicon.png (64×64)");

  // ── 3. splash-icon.png — emblem on transparent 512×512 (shown on green splash) ─
  await sharp(emblemCircle512)
    .toFile(path.join(OUT_DIR, "splash-icon.png"));
  console.log("✓ splash-icon.png (512×512, transparent bg)");

  // ── 4. android-icon-foreground.png — emblem on transparent 1024×1024 ──────────
  //    Android adaptive icon safe zone is 66% of 1024 = 681px; we scale to 700px
  const fgEmblem = await sharp(emblemCircle512)
    .resize(700, 700, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fgEmblem, gravity: "center" }])
    .png()
    .toFile(path.join(OUT_DIR, "android-icon-foreground.png"));
  console.log("✓ android-icon-foreground.png (1024×1024)");

  // ── 5. android-icon-background.png — solid brand green 1024×1024 ─────────────
  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: BRAND_GREEN },
  })
    .png()
    .toFile(path.join(OUT_DIR, "android-icon-background.png"));
  console.log("✓ android-icon-background.png (1024×1024 solid #1e4d3a)");

  // ── 6. android-icon-monochrome.png — single-colour version on transparent ─────
  //    Convert to greyscale, then threshold to white, place on transparent
  const monoEmblem = await sharp(emblemCircle512)
    .greyscale()
    .negate()         // invert so logo reads as white on transparent
    .resize(700, 700, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: monoEmblem, gravity: "center" }])
    .png()
    .toFile(path.join(OUT_DIR, "android-icon-monochrome.png"));
  console.log("✓ android-icon-monochrome.png (1024×1024)");

  // Clean up test files
  ["test-crop-0.png","test-crop-1.png","test-crop-2.png","test-crop2-0.png",
   "test-crop2-1.png","test-crop2-2.png","test-final.png","test-trim.png","test-circle.png"]
    .forEach(f => fs.existsSync(f) && fs.unlinkSync(f));

  console.log("\nAll mobile icons generated ✓");
  console.log("Location:", OUT_DIR);
}

run().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
