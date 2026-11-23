// Regenerates src/assets/fontsBase64.json from the font files in /fonts.
// Usage: npm run build:fonts
//
// Every card embeds these fonts, so they are made as small as possible:
// - subset to the characters a card can show (Latin scripts, incl. Vietnamese, plus punctuation);
//   text in other scripts falls back to the next font in the CSS font-family list
// - converted to WOFF2, which is compressed
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontDirectory = path.join(__dirname, '../fonts');
const outputFile = path.join(__dirname, '../src/assets/fontsBase64.json'); // read by src/lib/fonts.js

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String.fromCodePoint(from + i)).join('');

const ASCII = range(0x20, 0x7e);
const LATIN = [
  ASCII,
  range(0xa0, 0x24f), // Latin-1 Supplement, Latin Extended-A and -B
  range(0x300, 0x36f), // combining diacritical marks
  range(0x1e00, 0x1eff), // Latin Extended Additional (Vietnamese)
  range(0x2000, 0x206f), // general punctuation
  range(0x20a0, 0x20cf), // currency symbols
  '™', // ™
].join('');

// The barcode font only ever renders the profile URL.
const charactersFor = (fontName) => (fontName.startsWith('LibreBarcode') ? ASCII : LATIN);

if (!fs.existsSync(fontDirectory)) {
  console.error(`Directory does not exist: ${fontDirectory}`);
  process.exit(1);
}

const fontFiles = fs.readdirSync(fontDirectory).filter((file) => /\.(ttf|otf|woff2?)$/.test(file)).sort();

// Map "Rajdhani-Regular.ttf" -> { "Rajdhani-Regular": { mime, format, data } }
const fonts = {};
for (const file of fontFiles) {
  const fontName = path.basename(file, path.extname(file));
  const source = fs.readFileSync(path.join(fontDirectory, file));
  const subset = await subsetFont(source, charactersFor(fontName), { targetFormat: 'woff2' });
  fonts[fontName] = { mime: 'font/woff2', format: 'woff2', data: subset.toString('base64') };
  console.log(`${file}: ${(source.length / 1024).toFixed(0)} KB -> ${(subset.length / 1024).toFixed(0)} KB`);
}

fs.writeFileSync(outputFile, JSON.stringify(fonts, null, 2) + '\n');
console.log(`Saved ${fontFiles.length} fonts to ${path.relative(process.cwd(), outputFile)}`);
