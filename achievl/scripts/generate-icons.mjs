// Draws the Achievl mark in each era's style and writes every app icon the build needs.
// Run with: npm run icons
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (...p) => path.join(root, 'assets', ...p);
const S = 1024;

const svg = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${defs}</defs>${body}</svg>`;

// The mark: a ring holding an "A" built from an upward chevron — achieve, level up.
const ring = (stroke, width, r = 300) =>
  `<circle cx="512" cy="512" r="${r}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`;
const letterA = (stroke, width, square = false) =>
  `<g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="${square ? 'square' : 'round'}" stroke-linejoin="${square ? 'miter' : 'round'}">` +
  `<path d="M372 664 L512 352 L652 664"/><path d="M430 566 L594 566"/></g>`;

// Same letter on a 12x12 grid for the pixel eras.
const PIXEL_A = [
  '.....XX.....',
  '....XXXX....',
  '....XXXX....',
  '...XX..XX...',
  '...XX..XX...',
  '..XX....XX..',
  '..XXXXXXXX..',
  '..XXXXXXXX..',
  '.XX......XX.',
  '.XX......XX.',
  'XX........XX',
  'XX........XX',
];
const pixelA = (fill, cell, dx = 0, dy = 0) => {
  const size = cell * 12;
  const x0 = (S - size) / 2 + dx;
  const y0 = (S - size) / 2 + dy;
  let rects = '';
  PIXEL_A.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'X') rects += `<rect x="${x0 + x * cell}" y="${y0 + y * cell}" width="${cell}" height="${cell}"/>`;
    })
  );
  return `<g fill="${fill}" shape-rendering="crispEdges">${rects}</g>`;
};

const ERAS = {
  // Brushed silver with a glossy green orb.
  blades: {
    background: '#D5DADF',
    full: svg(
      `<rect width="${S}" height="${S}" fill="url(#bg)"/>
       <ellipse cx="512" cy="900" rx="300" ry="42" fill="#000" opacity="0.18"/>
       <circle cx="512" cy="512" r="372" fill="url(#orb)"/>
       ${ring('#FFFFFF', 40, 262)}${letterA('#FFFFFF', 62)}
       <ellipse cx="512" cy="318" rx="270" ry="160" fill="url(#gloss)"/>`,
      `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7F8FA"/><stop offset="1" stop-color="#A9B2BA"/></linearGradient>
       <radialGradient id="orb" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stop-color="#C9F06B"/><stop offset="0.5" stop-color="#6CB52D"/><stop offset="1" stop-color="#2C6608"/></radialGradient>
       <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF" stop-opacity="0.7"/><stop offset="1" stop-color="#FFF" stop-opacity="0"/></linearGradient>`
    ),
    glyph: svg(
      `<circle cx="512" cy="512" r="372" fill="url(#orb)"/>${ring('#FFFFFF', 40, 262)}${letterA('#FFFFFF', 62)}
       <ellipse cx="512" cy="318" rx="270" ry="160" fill="url(#gloss)"/>`,
      `<radialGradient id="orb" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stop-color="#C9F06B"/><stop offset="0.5" stop-color="#6CB52D"/><stop offset="1" stop-color="#2C6608"/></radialGradient>
       <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF" stop-opacity="0.7"/><stop offset="1" stop-color="#FFF" stop-opacity="0"/></linearGradient>`
    ),
  },

  // Midnight blue with a drifting ribbon and hairline strokes.
  wave: {
    background: '#0F3B7C',
    full: svg(
      `<rect width="${S}" height="${S}" fill="url(#bg)"/>
       <path d="M-40 640 C 220 470, 420 760, 640 600 S 960 420, 1080 520 L 1080 640 C 940 560, 800 720, 620 720 S 240 600, -40 760 Z" fill="#FFFFFF" opacity="0.16"/>
       <path d="M-40 700 C 240 560, 420 820, 660 680 S 940 520, 1080 600 L 1080 660 C 920 620, 820 760, 640 770 S 260 680, -40 800 Z" fill="#9BE1FF" opacity="0.22"/>
       <g filter="url(#glow)">${ring('#FFFFFF', 18, 300)}${letterA('#FFFFFF', 30)}</g>`,
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#071636"/><stop offset="0.55" stop-color="#0F3B7C"/><stop offset="1" stop-color="#1F86C2"/></linearGradient>
       <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    ),
    glyph: svg(`${ring('#FFFFFF', 18, 300)}${letterA('#FFFFFF', 30)}`),
  },

  // Near-black fog with glass cubes and a neon mark.
  cube: {
    background: '#070D2B',
    full: svg(
      `<rect width="${S}" height="${S}" fill="url(#bg)"/>
       <g fill="#6C7BFF" fill-opacity="0.10" stroke="#8C9BFF" stroke-opacity="0.45" stroke-width="4">
         <rect x="96" y="120" width="190" height="190" transform="rotate(14 191 215)"/>
         <rect x="760" y="90" width="130" height="130" transform="rotate(-18 825 155)"/>
         <rect x="770" y="740" width="210" height="210" transform="rotate(22 875 845)"/>
         <rect x="70" y="760" width="120" height="120" transform="rotate(-10 130 820)"/>
       </g>
       <g filter="url(#glow)">${ring('#4DD0E1', 30, 300)}${letterA('#4DD0E1', 54, true)}</g>`,
      `<radialGradient id="bg" cx="0.5" cy="0.55" r="0.8"><stop offset="0" stop-color="#16277A"/><stop offset="0.6" stop-color="#070D2B"/><stop offset="1" stop-color="#02030A"/></radialGradient>
       <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
    ),
    glyph: svg(`${ring('#4DD0E1', 30, 300)}${letterA('#4DD0E1', 54, true)}`),
  },

  // A blue menu window with a gold pixel letter.
  quest: {
    background: '#2A2389',
    full: svg(
      `<rect width="${S}" height="${S}" fill="url(#bg)"/>
       <rect x="122" y="122" width="780" height="780" rx="56" fill="url(#win)" stroke="#FFFFFF" stroke-width="30"/>
       <rect x="160" y="160" width="704" height="704" rx="30" fill="none" stroke="#8A9BF2" stroke-width="8"/>
       ${pixelA('#0A1254', 44, 16, 16)}${pixelA('#FFD23F', 44)}`,
      `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140F4E"/><stop offset="1" stop-color="#57379E"/></linearGradient>
       <linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B44C7"/><stop offset="1" stop-color="#101C76"/></linearGradient>`
    ),
    glyph: svg(`${pixelA('#0A1254', 44, 16, 16)}${pixelA('#FFD23F', 44)}`),
  },

  // Dot-matrix green.
  pocket: {
    background: '#C5D49A',
    full: svg(
      `<rect width="${S}" height="${S}" fill="#C5D49A"/><rect width="${S}" height="${S}" fill="url(#dots)"/>
       <rect x="110" y="110" width="804" height="804" fill="none" stroke="#1E3319" stroke-width="36"/>
       ${pixelA('#9DB06A', 48, 20, 20)}${pixelA('#1E3319', 48)}`,
      `<pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#1E3319" fill-opacity="0.06"/></pattern>`
    ),
    glyph: svg(`${pixelA('#9DB06A', 48, 20, 20)}${pixelA('#1E3319', 48)}`),
  },

  // Black screen, white box, one loud colour.
  pixel: {
    background: '#000000',
    full: svg(
      `<rect width="${S}" height="${S}" fill="#000"/>
       <rect x="110" y="110" width="804" height="804" fill="none" stroke="#FFFFFF" stroke-width="36"/>
       <g fill="#FCA044" shape-rendering="crispEdges"><rect x="196" y="196" width="40" height="40"/><rect x="788" y="196" width="40" height="40"/><rect x="196" y="788" width="40" height="40"/><rect x="788" y="788" width="40" height="40"/></g>
       ${pixelA('#FF5A45', 48, 20, 20)}${pixelA('#FFFFFF', 48)}`
    ),
    glyph: svg(`${pixelA('#FF5A45', 48, 20, 20)}${pixelA('#FFFFFF', 48)}`),
  },

  // Today: one flat tile.
  flat: {
    background: '#15181D',
    full: svg(
      `<rect width="${S}" height="${S}" fill="#15181D"/>
       ${ring('#2A303A', 44, 300)}
       <path d="M512 212 A300 300 0 0 1 812 512" fill="none" stroke="#3DDC84" stroke-width="44" stroke-linecap="round"/>
       ${letterA('#3DDC84', 64)}`
    ),
    glyph: svg(
      `${ring('#2A303A', 44, 300)}<path d="M512 212 A300 300 0 0 1 812 512" fill="none" stroke="#3DDC84" stroke-width="44" stroke-linecap="round"/>${letterA('#3DDC84', 64)}`
    ),
  },
};

const render = (source, size = S) => sharp(Buffer.from(source)).resize(size, size);

/** Android adaptive icons crop to the middle two-thirds, so the mark is shrunk onto a clear canvas. */
async function adaptiveForeground(glyph, file) {
  const inner = Math.round(S * 0.6);
  const mark = await render(glyph, inner).png().toBuffer();
  await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toFile(file);
}

await mkdir(out('icons'), { recursive: true });

for (const [id, era] of Object.entries(ERAS)) {
  // iOS icons must be opaque.
  await render(era.full).flatten({ background: era.background }).png().toFile(out('icons', `${id}.png`));
  await adaptiveForeground(era.glyph, out('icons', `${id}-foreground.png`));
  console.log(`icons/${id}.png, icons/${id}-foreground.png`);
}

// The default icon is the first era's.
const base = ERAS.blades;
await render(base.full).flatten({ background: base.background }).png().toFile(out('icon.png'));
await adaptiveForeground(base.glyph, out('android-icon-foreground.png'));
await sharp({ create: { width: S, height: S, channels: 4, background: base.background } }).png().toFile(out('android-icon-background.png'));
await adaptiveForeground(svg(`${ring('#000000', 40, 300)}${letterA('#000000', 62)}`), out('android-icon-monochrome.png'));
await render(base.glyph, 400).png().toFile(out('splash-icon.png'));
await render(base.full, 64).flatten({ background: base.background }).png().toFile(out('favicon.png'));
console.log('icon.png, android-icon-*.png, splash-icon.png, favicon.png');
