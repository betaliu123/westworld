// The first canvas is the on-screen surface. Load package before importing the engine.
GameGlobal.canvas = wx.createCanvas();
wx.loadSubpackage({name:'resources', success(){require('./dist/game.js');},fail(error){console.error(error);wx.showModal({title:'资源未能载入',content:'请检查网络并重新打开游戏。',showCancel:false});}});
