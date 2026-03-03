// Generate PWA icons as SVG-based approach
// Run: node generate-icons.mjs
import fs from 'fs';

const svgIcon = (size, maskable = false) => {
  const padding = maskable ? 0 : size * 0.05;
  const r = maskable ? 0 : size * 0.18;
  const fontSize = maskable ? size * 0.38 : size * 0.45;
  const textY = maskable ? size / 2 : size / 2 - size * 0.02;
  const sparkleX = maskable ? size * 0.68 : size * 0.72;
  const sparkleY = maskable ? size * 0.32 : size * 0.28;
  const sparkleR = maskable ? size * 0.035 : size * 0.04;

  const bg = maskable
    ? `<rect width="${size}" height="${size}" fill="url(#g)"/>`
    : `<rect x="${padding}" y="${padding}" width="${size - padding * 2}" height="${size - padding * 2}" rx="${r}" fill="url(#g)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  ${bg}
  <text x="${size / 2}" y="${textY}" font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}" fill="white" text-anchor="middle" dominant-baseline="central">Q</text>
  <circle cx="${sparkleX}" cy="${sparkleY}" r="${sparkleR}" fill="rgba(255,255,255,0.6)"/>
</svg>`;
};

const iconsDir = 'public/icons';
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Generate SVG icons (browsers support SVG in manifest)
for (const size of [192, 512]) {
  fs.writeFileSync(`${iconsDir}/icon-${size}.svg`, svgIcon(size, false));
  fs.writeFileSync(`${iconsDir}/icon-maskable-${size}.svg`, svgIcon(size, true));
  console.log(`Generated: icon-${size}.svg, icon-maskable-${size}.svg`);
}

// Also generate a favicon SVG
fs.writeFileSync('public/favicon.svg', svgIcon(32, false));
console.log('Generated: favicon.svg');

console.log('Done! All PWA icons generated.');
