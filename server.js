const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 10000;
const TIKTOK_USER = (process.env.TIKTOK_USER || "pykayoffice").replace(/^@/, "");

// index.html của bạn đang nằm ngay thư mục gốc
app.use(express.static(__dirname));

let tiktok = null;

async function connectTikTok() {
  try {
    const {
      TikTokLiveConnection,
      WebcastEvent
    } = await import("tiktok-live-connector");

    tiktok = new TikTokLiveConnection(TIKTOK_USER, {
      processInitialData: false
    });

    tiktok.on(WebcastEvent.CHAT, (data) => {
      io.emit("tiktok", {
        type: "comment",
        user: data.user?.uniqueId || data.uniqueId || "",
        text: data.comment || ""
      });
    });

    tiktok.on(WebcastEvent.LIKE, (data) => {
      io.emit("tiktok", {
        type: "like",
        user: data.user?.uniqueId || data.uniqueId || "",
        count: data.likeCount || 1
      });
    });

    tiktok.on(WebcastEvent.GIFT, (data) => {
      const giftType = data.giftDetails?.giftType ?? data.giftType;

      if (giftType === 1 && !data.repeatEnd) return;

      io.emit("tiktok", {
        type: "gift",
        user: data.user?.uniqueId || data.uniqueId || "",
        giftName: data.giftDetails?.giftName || data.giftName || "Gift",
        giftId: data.giftId,
        repeatCount: data.repeatCount || 1,
        diamondCount: data.diamondCount || 0
      });
    });

    tiktok.on(WebcastEvent.SOCIAL, (data) => {
      io.emit("tiktok", {
        type: "social",
        user: data.user?.uniqueId || data.uniqueId || "",
        action: data.action || data.displayType || ""
      });
    });

    const state = await tiktok.connect();

    console.log(`Connected to @${TIKTOK_USER}, roomId=${state.roomId}`);

    io.emit("status", {
      connected: true,
      user: TIKTOK_USER
    });

  } catch (err) {
    console.error("TikTok connect error:", err);

    io.emit("status", {
      connected: false,
      error: err?.message || String(err)
    });

    setTimeout(connectTikTok, 15000);
  }
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DJ PYKAY bridge running on port ${PORT}`);
  connectTikTok();
});
