const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let connectedPCs = {}; // Track connected PCs
let adminCount = 0; // Track connected admins

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Handle PC registration
  socket.on("register-pc", (pcId, callback) => {
    connectedPCs[pcId] = socket.id;
    console.log(`PC registered: ${pcId}`);
    io.emit("update-pc-list", Object.keys(connectedPCs)); // Notify admins
    if (callback) callback({ success: true });
  });

  // Handle camera frames
  socket.on("camera-stream", ({ pcId, frame }) => {
    if (connectedPCs[pcId]) {
      io.emit("camera-frame", { pcId, frame }); // Broadcast frame to admin
    }
  });

  // Handle start-camera command from admin
  socket.on("start-camera", (pcId) => {
    const pcSocketId = connectedPCs[pcId];
    if (pcSocketId) {
      io.to(pcSocketId).emit("start-camera");
      console.log(`Start camera command sent to PC: ${pcId}`);
    }
  });

  // Handle close-camera command from admin
  socket.on("close-camera", (pcId) => {
    const pcSocketId = connectedPCs[pcId];
    if (pcSocketId) {
      io.to(pcSocketId).emit("close-camera");
      console.log(`Close camera command sent to PC: ${pcId}`);
    }
  });

  // Handle admin connection
  socket.on("admin-connect", () => {
    adminCount++;
    console.log(`Admin connected. Total admins: ${adminCount}`);
    socket.emit("update-pc-list", Object.keys(connectedPCs));
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const pcId = Object.keys(connectedPCs).find(
      (id) => connectedPCs[id] === socket.id
    );
    if (pcId) {
      delete connectedPCs[pcId];
      console.log(`PC disconnected: ${pcId}`);
      io.emit("update-pc-list", Object.keys(connectedPCs));
    } else {
      adminCount--;
      console.log(`Admin disconnected. Total admins: ${Math.max(adminCount, 0)}`);
    }
  });
});

server.listen(8000, () => {
  console.log("Server running on http://localhost:8000");
});
