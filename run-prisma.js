const { execSync } = require('child_process');
const path = require('path');
execSync('node node_modules/prisma/build/index.js generate', {
  stdio: 'inherit',
  cwd: path.join(__dirname, 'apps/api'),
});
