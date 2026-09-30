const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser', timeout: 30000, workers: 1,
  use: { baseURL:'http://127.0.0.1:5173', channel:'msedge', headless:true, viewport:{width:1366,height:900} },
  reporter: 'list',
  webServer: { command:'node node_modules/serve/build/main.js . -l tcp://127.0.0.1:5173 --no-clipboard', url:'http://127.0.0.1:5173', reuseExistingServer:true }
});