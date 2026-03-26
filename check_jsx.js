const fs = require('fs');
const babel = require('@babel/core');

const code = fs.readFileSync('src/pages/FacultyDash.jsx', 'utf-8');

try {
  babel.parseSync(code, {
    presets: ['@babel/preset-react'],
    filename: 'src/pages/FacultyDash.jsx'
  });
  console.log('Parsed successfully!');
} catch (e) {
  console.error('Babel Parse Error:', e.message);
}
