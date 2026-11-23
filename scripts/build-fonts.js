// Regenerates src/assets/fontsBase64.json from the font files in /fonts.
// Usage: npm run build:fonts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontDirectory = path.join(__dirname, '../fonts');
const outputFile = path.join(__dirname, '../src/assets/fontsBase64.json'); // read by src/lib/fonts.js

if (!fs.existsSync(fontDirectory)) {
  console.error(`Directory does not exist: ${fontDirectory}`);
  process.exit(1);
}

const fontFiles = fs.readdirSync(fontDirectory).filter((file) => file.endsWith('.woff2') || file.endsWith('.ttf'));

// Map "Rajdhani-Regular.ttf" -> { "Rajdhani-Regular": "<base64>" }
const fontsBase64 = {};
for (const file of fontFiles) {
  const fontName = path.basename(file, path.extname(file));
  fontsBase64[fontName] = fs.readFileSync(path.join(fontDirectory, file)).toString('base64');
}

fs.writeFileSync(outputFile, JSON.stringify(fontsBase64, null, 2));
console.log(`Converted ${fontFiles.length} fonts to Base64 and saved them to ${path.relative(process.cwd(), outputFile)}`);
