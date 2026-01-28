// start-server.cjs
const detect = require('detect-port');
const open = require('open');
const { spawn } = require('child_process');
const path = require('path');

const DEFAULT_PORT = 3000;
const SERVER_FILE = path.join(__dirname, 'server', 'server.js');

(async () => {
    const PORT = await detect(DEFAULT_PORT);
    if (PORT !== DEFAULT_PORT) {
        console.log(`Port ${DEFAULT_PORT} 已被佔用，改用 ${PORT}`);
    } else {
        console.log(`使用埠: ${PORT}`);
    }

    // 啟動 server.js
    const serverProcess = spawn('node', [SERVER_FILE], {
        env: { ...process.env, PORT },
        stdio: 'inherit',
    });

    // 開啟瀏覽器
    const openModule = require('open');
    const open = openModule.default || openModule; // 支援新版 open
    open(`http://localhost:${PORT}`);

    // 監控 public 資料夾，變動時重啟 server（熱重載）
    const chokidar = require('chokidar');
    const watcher = chokidar.watch(path.join(__dirname, 'public'), {
        ignoreInitial: true,
    });

    watcher.on('all', (event, pathChanged) => {
        console.log(`${event} 發生在 ${pathChanged}，重啟 server`);
        serverProcess.kill();
        // 延遲重新啟動避免檔案還在寫入
        setTimeout(() => {
            spawn('node', [SERVER_FILE], {
                env: { ...process.env, PORT },
                stdio: 'inherit',
            });
        }, 500);
    });
})();
