// run-jest.js
const { exec } = require('child_process');

exec('node --max-old-space-size=10240 ./node_modules/jest/bin/jest.js ' + process.argv.slice(2).join(' '), (err, stdout, stderr) => {
  console.log(stdout);
  console.error(stderr);
  if (err) process.exit(err.code);
});
