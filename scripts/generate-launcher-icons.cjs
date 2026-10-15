const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// High-quality bilinear interpolation with premultiplied alpha
function resizeBilinear(srcPng, targetWidth, targetHeight) {
  const dst = new PNG({ width: targetWidth, height: targetHeight });
  const xRatio = (srcPng.width - 1) / Math.max(1, targetWidth - 1);
  const yRatio = (srcPng.height - 1) / Math.max(1, targetHeight - 1);

  for (let y = 0; y < targetHeight; y++) {
    const srcY = y * yRatio;
    const yFloor = Math.floor(srcY);
    const yCeil = Math.min(srcPng.height - 1, Math.ceil(srcY));
    const yWeight = srcY - yFloor;

    for (let x = 0; x < targetWidth; x++) {
      const srcX = x * xRatio;
      const xFloor = Math.floor(srcX);
      const xCeil = Math.min(srcPng.width - 1, Math.ceil(srcX));
      const xWeight = srcX - xFloor;

      const idx00 = (srcPng.width * yFloor + xFloor) << 2;
      const idx10 = (srcPng.width * yFloor + xCeil) << 2;
      const idx01 = (srcPng.width * yCeil + xFloor) << 2;
      const idx11 = (srcPng.width * yCeil + xCeil) << 2;

      // Unpack RGBA
      const a00 = srcPng.data[idx00 + 3] / 255;
      const a10 = srcPng.data[idx10 + 3] / 255;
      const a01 = srcPng.data[idx01 + 3] / 255;
      const a11 = srcPng.data[idx11 + 3] / 255;

      // Premultiplied RGB
      const r00 = srcPng.data[idx00] * a00;
      const g00 = srcPng.data[idx00 + 1] * a00;
      const b00 = srcPng.data[idx00 + 2] * a00;

      const r10 = srcPng.data[idx10] * a10;
      const g10 = srcPng.data[idx10 + 1] * a10;
      const b10 = srcPng.data[idx10 + 2] * a10;

      const r01 = srcPng.data[idx01] * a01;
      const g01 = srcPng.data[idx01 + 1] * a01;
      const b01 = srcPng.data[idx01 + 2] * a01;

      const r11 = srcPng.data[idx11] * a11;
      const g11 = srcPng.data[idx11 + 1] * a11;
      const b11 = srcPng.data[idx11 + 2] * a11;

      // Interpolate horizontal
      const rTop = r00 * (1 - xWeight) + r10 * xWeight;
      const gTop = g00 * (1 - xWeight) + g10 * xWeight;
      const bTop = b00 * (1 - xWeight) + b10 * xWeight;
      const aTop = a00 * (1 - xWeight) + a10 * xWeight;

      const rBot = r01 * (1 - xWeight) + r11 * xWeight;
      const gBot = g01 * (1 - xWeight) + g11 * xWeight;
      const bBot = b01 * (1 - xWeight) + b11 * xWeight;
      const aBot = a01 * (1 - xWeight) + a11 * xWeight;

      // Interpolate vertical
      const rPremul = rTop * (1 - yWeight) + rBot * yWeight;
      const gPremul = gTop * (1 - yWeight) + gBot * yWeight;
      const bPremul = bTop * (1 - yWeight) + bBot * yWeight;
      const aFinal = aTop * (1 - yWeight) + aBot * yWeight;

      const dstIdx = (targetWidth * y + x) << 2;
      if (aFinal > 0.001) {
        dst.data[dstIdx] = Math.round(Math.min(255, Math.max(0, rPremul / aFinal)));
        dst.data[dstIdx + 1] = Math.round(Math.min(255, Math.max(0, gPremul / aFinal)));
        dst.data[dstIdx + 2] = Math.round(Math.min(255, Math.max(0, bPremul / aFinal)));
        dst.data[dstIdx + 3] = Math.round(Math.min(255, Math.max(0, aFinal * 255)));
      } else {
        dst.data[dstIdx] = 0;
        dst.data[dstIdx + 1] = 0;
        dst.data[dstIdx + 2] = 0;
        dst.data[dstIdx + 3] = 0;
      }
    }
  }

  return dst;
}

// Create a canvas with 10% - 12% safe-zone margin (padding) around the centered icon
function createCenteredPaddedIcon(srcPng, canvasSize, contentSize) {
  const scaledIcon = resizeBilinear(srcPng, contentSize, contentSize);
  const canvas = new PNG({ width: canvasSize, height: canvasSize });
  // Fill with 100% transparent pixels
  canvas.data.fill(0);

  const offsetX = Math.floor((canvasSize - contentSize) / 2);
  const offsetY = Math.floor((canvasSize - contentSize) / 2);

  for (let y = 0; y < contentSize; y++) {
    for (let x = 0; x < contentSize; x++) {
      const srcIdx = (contentSize * y + x) << 2;
      const dstIdx = (canvasSize * (y + offsetY) + (x + offsetX)) << 2;

      canvas.data[dstIdx] = scaledIcon.data[srcIdx];
      canvas.data[dstIdx + 1] = scaledIcon.data[srcIdx + 1];
      canvas.data[dstIdx + 2] = scaledIcon.data[srcIdx + 2];
      canvas.data[dstIdx + 3] = scaledIcon.data[srcIdx + 3];
    }
  }

  return canvas;
}

function run() {
  const rootDir = path.resolve(__dirname, '..');
  const iconSrcPath = path.join(rootDir, 'public', 'royal-athar-icon.png');

  if (!fs.existsSync(iconSrcPath)) {
    console.error('Source icon not found:', iconSrcPath);
    process.exit(1);
  }

  const srcPng = PNG.sync.read(fs.readFileSync(iconSrcPath));
  console.log(`Loaded source icon (${srcPng.width}x${srcPng.height})`);

  const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

  // Densities: legacy size (sz), foreground canvas size (fsz), centered content size (isz) with 10% - 12% safe-zone margin
  const densities = [
    { name: 'mdpi', sz: 48, fsz: 108, isz: Math.round(108 * 0.78) },
    { name: 'hdpi', sz: 72, fsz: 162, isz: Math.round(162 * 0.78) },
    { name: 'xhdpi', sz: 96, fsz: 216, isz: Math.round(216 * 0.78) },
    { name: 'xxhdpi', sz: 144, fsz: 324, isz: Math.round(324 * 0.78) },
    { name: 'xxxhdpi', sz: 192, fsz: 432, isz: Math.round(432 * 0.78) },
  ];

  for (const { name, sz, fsz, isz } of densities) {
    const dir = path.join(resDir, `mipmap-${name}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. Legacy full rounded icon
    const legacyIcon = resizeBilinear(srcPng, sz, sz);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), PNG.sync.write(legacyIcon));
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), PNG.sync.write(legacyIcon));

    // 2. Adaptive icon foreground with 10% - 12% safe-zone margin (~11% padding)
    const foreground = createCenteredPaddedIcon(srcPng, fsz, isz);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), PNG.sync.write(foreground));

    console.log(`Generated mipmap-${name}: legacy ${sz}x${sz}, foreground ${fsz}x${fsz} (content: ${isz}x${isz}, ~11% padding)`);
  }

  // Drawables
  const drawableDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(drawableDir)) {
    fs.mkdirSync(drawableDir, { recursive: true });
  }

  fs.copyFileSync(iconSrcPath, path.join(drawableDir, 'ic_launcher.png'));
  fs.copyFileSync(iconSrcPath, path.join(drawableDir, 'ic_launcher_round.png'));

  // Play Store Icon
  const playstorePath = path.join(rootDir, 'android', 'app', 'src', 'main', 'ic_launcher-playstore.png');
  fs.copyFileSync(iconSrcPath, playstorePath);

  // Adaptive Icon XMLs in mipmap-anydpi-v26
  const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  if (!fs.existsSync(anyDpiDir)) {
    fs.mkdirSync(anyDpiDir, { recursive: true });
  }

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), adaptiveXml);
  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), adaptiveXml);

  // Colors XML
  const valuesDir = path.join(resDir, 'values');
  if (!fs.existsSync(valuesDir)) {
    fs.mkdirSync(valuesDir, { recursive: true });
  }
  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#070605</color>
    <color name="colorPrimary">#D4AF37</color>
    <color name="colorPrimaryDark">#070605</color>
    <color name="colorAccent">#E6C66E</color>
</resources>
`;
  fs.writeFileSync(path.join(valuesDir, 'colors.xml'), colorsXml);

  // Strings XMLs - Strictly "أَثَرُ" without any English suffix
  const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">أَثَرُ</string>
    <string name="widget_prayer_name">مواقيت الصلاة أثر</string>
    <string name="widget_azkar_name">أذكار وورد اليوم أثر</string>
</resources>
`;
  fs.writeFileSync(path.join(valuesDir, 'strings.xml'), stringsXml);

  const valuesArDir = path.join(resDir, 'values-ar');
  if (!fs.existsSync(valuesArDir)) {
    fs.mkdirSync(valuesArDir, { recursive: true });
  }
  fs.writeFileSync(path.join(valuesArDir, 'strings.xml'), stringsXml);

  console.log('Successfully generated all launcher icons, drawables, adaptive XMLs, and confirmed app_name: أَثَرُ.');
}

run();
