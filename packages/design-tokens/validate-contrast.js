const fs = require('fs');
const path = require('path');

const tokensPath = path.join(__dirname, '../../specs/00b-design-system/brand/tokens.json');
const tokensRaw = fs.readFileSync(tokensPath, 'utf8');
const tokens = JSON.parse(tokensRaw);

// Helper to convert hex to RGB
function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// WCAG relative luminance
function getLuminance(rgb) {
  let [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

// WCAG contrast ratio
function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  if (!rgb1 || !rgb2) throw new Error(`Invalid hex color: ${hex1} or ${hex2}`);

  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

console.log('--- BOLSILLUDO CONTRAST VALIDATION ---');
const pairs = tokens["contrast-validation"].pairs;
let hasError = false;

pairs.forEach(pair => {
  const actualRatio = getContrastRatio(pair.fg, pair.bg);
  const expectedRatio = pair.ratio;
  
  // Allowing a small tolerance for precision differences
  const diff = Math.abs(actualRatio - expectedRatio);
  const isMatch = diff < 0.1;

  if (!isMatch) {
    console.error(`❌ Mismatch for ${pair.fg} on ${pair.bg}: Expected ${expectedRatio}, Got ${actualRatio.toFixed(2)}`);
    hasError = true;
  }

  if (pair.aa && actualRatio < 4.5 && actualRatio < 3.0) {
    console.error(`❌ Fails WCAG AA for ${pair.fg} on ${pair.bg}. Ratio: ${actualRatio.toFixed(2)}`);
    hasError = true;
  } else {
    console.log(`✅ ${pair.fg} on ${pair.bg} - Ratio: ${actualRatio.toFixed(2)} (${pair.use})`);
  }
});

if (hasError) {
  console.error('\nContrast validation FAILED. See constitution P10.');
  process.exit(1);
} else {
  console.log('\nAll contrast pairs validated successfully. Meets WCAG 2.2 AA targets.');
}
