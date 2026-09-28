const fs = require('fs');
const path = require('path');

const tokensPath = path.join(__dirname, '../../specs/00b-design-system/brand/tokens.json');
const outPath = path.join(__dirname, 'theme.css');

const tokensRaw = fs.readFileSync(tokensPath, 'utf8');
const tokens = JSON.parse(tokensRaw);

// Very basic generator for this demo.
// In a full build, we'd use Style Dictionary.

let css = `/* 
  Bolsilludo Design Tokens 
  Auto-generated from specs/00b-design-system/brand/tokens.json 
*/

:root {\n`;

// Colors (Brand)
Object.entries(tokens.color.brand).forEach(([key, obj]) => {
  css += `  --bol-${key}: ${obj.$value};\n`;
});

// Colors (Derived)
Object.entries(tokens.color.derived).forEach(([key, obj]) => {
  css += `  --bol-${key}: ${obj.$value};\n`;
});

// Colors (Semantic)
Object.entries(tokens.color.semantic).forEach(([key, obj]) => {
  css += `  --bol-${key}: ${obj.$value};\n`;
});

// Dark Theme (default)
css += `\n  /* Theme: Dark (Default) */\n`;
Object.entries(tokens.theme.dark).forEach(([key, obj]) => {
  let val = obj.$value.replace(/\{color\.(brand|derived|semantic)\.([^}]+)\}/g, 'var(--bol-$2)');
  css += `  --${key}: ${val};\n`;
});

// Glass
css += `\n  /* Glass UI */\n`;
Object.entries(tokens.glass).forEach(([key, obj]) => {
  css += `  --glass-${key}: ${obj.$value};\n`;
});

// Depth
css += `\n  /* Depth */\n`;
Object.entries(tokens.depth).forEach(([key, obj]) => {
  css += `  --${key}: ${obj.$value};\n`;
});

// Radius
css += `\n  /* Radius */\n`;
Object.entries(tokens.radius).forEach(([key, obj]) => {
  css += `  --radius-${key}: ${obj.$value};\n`;
});

// Motion
css += `\n  /* Motion */\n`;
Object.entries(tokens.motion).forEach(([key, obj]) => {
  css += `  --${key}: ${obj.$value};\n`;
});

css += `}\n\n`;

// Light Theme
css += `:root[data-theme="light"] {\n`;
Object.entries(tokens.theme.light).forEach(([key, obj]) => {
  let val = obj.$value.replace(/\{color\.(brand|derived|semantic)\.([^}]+)\}/g, 'var(--bol-$2)');
  css += `  --${key}: ${val};\n`;
});
css += `}\n`;

fs.writeFileSync(outPath, css);
console.log('theme.css generated successfully.');
