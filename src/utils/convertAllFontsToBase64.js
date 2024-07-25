import fs from 'fs';
import path from 'path';

// Function to convert font to base64
const getBase64Font = (fontPath) => {
  const font = fs.readFileSync(fontPath);
  return font.toString('base64');
};

// Directory containing the font files
const fontDirectory = path.join(process.cwd(), '/fonts');

// Ensure the directory exists
if (!fs.existsSync(fontDirectory)) {
  console.error(`Directory does not exist: ${fontDirectory}`);
  process.exit(1);
}

// Read all font files in the directory
const fontFiles = fs.readdirSync(fontDirectory).filter(file => file.endsWith('.woff2') || file.endsWith('.ttf'));

// Convert each font file to base64 and save to an object
const fontsBase64 = {};
fontFiles.forEach(file => {
  const fontPath = path.join(fontDirectory, file);
  const base64 = getBase64Font(fontPath);
  const fontName = path.basename(file, path.extname(file));
  fontsBase64[fontName] = base64;
});

// Save the base64 strings to a JSON file for use in your project
fs.writeFileSync(path.join(process.cwd(), 'fontsBase64.json'), JSON.stringify(fontsBase64, null, 2));

console.log('Fonts converted to Base64 and saved to fontsBase64.json');