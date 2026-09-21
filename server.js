const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;
const TIKTOK_USER = (process.env.TIKTOK_USER || "pykayoffice").replace(/^@/, "");

app.use(express.static("public"));

let tiktok;
function connectTikTok() {
  tiktok = new WebcastPushConnection(TIKTOK_USER, { processInitialData: false });

  tiktok.connect().then(state => {
    console.log(`Connected to @${TIKTOK_USER}, roomId=${state.roomId}`);
    io.emit("status", { connected: true, user: TIKTOK_USER });
  }).catch(err => {
    console.error("TikTok connect error:", err.message || err);
    io.emit("status", { connected: false, error: String(err.message || err) });
    setTimeout(connectTikTok, 15000);
  });

  tiktok.on("chat", data => io.emit("tiktok", { type:"comment", user:data.uniqueId, text:data.comment }));
  tiktok.on("like", data => io.emit("tiktok", { type:"like", user:data.uniqueId, count:data.likeCount || 1 }));
  tiktok.on("follow", data => io.emit("tiktok", { type:"follow", user:data.uniqueId }));
  tiktok.on("gift", data => {
    if (data.giftType === 1 && !data.repeatEnd) return;
    io.emit("tiktok", {
      type:"gift", user:data.uniqueId, giftName:data.giftName,
      giftId:data.giftId, repeatCount:data.repeatCount || 1,
      diamondCount:data.diamondCount || 0
    });
  });
  tiktok.on("disconnected", () => setTimeout(connectTikTok, 10000));
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DJ PYKAY bridge on port ${PORT}`);
  connectTikTok();
});
