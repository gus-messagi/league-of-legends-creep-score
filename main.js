const { app, BrowserWindow, net } = require('electron');
const cron = require('node-cron');
const ejse = require('ejs-electron');
const path = require('path');

require('dotenv').config()

require('electron-reload')(__dirname + '/app/index.html', {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});

const user = {};
const gameInfo = {}
let win;

ejse.data('user', {});

setInterval(function() {

  if (!user.name) {
    const request = net.request(
      'https://127.0.0.1:2999/liveclientdata/activeplayername'
    );

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        const data = Buffer.from(chunk).toString();
        user.name = data.replace(/['"]+/g, "");
        user.nameToRequest = data.replaceAll(" ", "%20").replace(/['"]+/g, "");
      });
    });

    request.on('error', () => {});
    request.end();
    return;
  }

  const requestScore = net.request(
    `https://127.0.0.1:2999/liveclientdata/playerscores?summonerName=${user.nameToRequest}`
  );

  requestScore.on('response', (response) => {
    response.on('data', (chunk) => {
      const data = JSON.parse(Buffer.from(chunk).toString());
      console.log(data.creepScore);
      gameInfo.creepScore = data.creepScore;
    });
  });

  const requestTime = net.request(
    'https://127.0.0.1:2999/liveclientdata/gamestats'
  );

  requestTime.on('response', (response) => {
    response.on('data', (chunk) => {
      const data = JSON.parse(Buffer.from(chunk).toString());
      const { gameTime } = data;
      const ableFarmMinutes = (gameTime/60) - 1.5;

      const justMinutes = parseInt(ableFarmMinutes); 
      gameInfo.perfectFarm = justMinutes * 10;

      ejse.data('user', {
        name: user.name,
        getCurrentCreepScore: () => gameInfo.creepScore,
        getPerfectCreepScore: () => gameInfo.perfectFarm
      });

      console.log(gameInfo);
      win.loadURL(`file://${__dirname}/app/index.ejs`);

    });
  });

  requestScore.on('error', () => {});
  requestTime.on('error', () => {});

  requestScore.end();
  requestTime.end();
}, 5000);


app.commandLine.appendSwitch('ignore-certificate-errors');

app.on('ready', () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowDisplayingInsecureContent: true,
      allowRunningInsecureContent: true
    }
  });
  
  win.setMenu(null);
  win.loadURL(`file://${__dirname}/app/index.ejs`);

  process.env.NODE_ENV !== 'production' && win.openDevTools();
});

