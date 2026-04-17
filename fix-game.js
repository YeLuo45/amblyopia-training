const fs = require('fs');
const c = fs.readFileSync('C:/Users/YeZhimin/.openclaw/workspace-dev/proposals/amblyopia-training/web/src/pages/GameRunner.tsx', 'utf8');
const lines = c.split('\n');
// Lines 0-177 are good (component code + function defs), lines 178+ are orphaned
const fixed = lines.slice(0, 178).join('\n') + '\n';
fs.writeFileSync('C:/Users/YeZhimin/.openclaw/workspace-dev/proposals/amblyopia-training/web/src/pages/GameRunner.tsx', fixed);
console.log('Fixed. Lines:', fixed.split('\n').length, 'Chars:', fixed.length);
