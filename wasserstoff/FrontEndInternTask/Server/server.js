import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

const getRandomColor = () => {
  const colors = [
    "#FF6633",
    "#FFB399",
    "#FF33FF",
    "#FFFF99",
    "#00B3E6",
    "#E6B333",
    "#3366E6",
    "#999966",
    "#99FF99",
    "#B34D4D",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle joining a room
  socket.on("join-room", ({ roomId, username }) => {
    if (!username?.trim()) {
      socket.emit("error", "Username is required");
      return;
    }

    if (!roomId) roomId = "default-room";

    socket.join(roomId);

    // Initialize room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        content: "",
        users: {},
      };
    }

    // Add user to room
    rooms[roomId].users[socket.id] = {
      username,
      color: getRandomColor(),
    };

    // Send current state to new user
    socket.emit("init", {
      content: rooms[roomId].content,
      users: Object.values(rooms[roomId].users),
    });

    // Notify others about new user
    socket.to(roomId).emit("user-joined", {
      userId: socket.id,
      username,
      color: rooms[roomId].users[socket.id].color,
    });
  });

  // Handle content updates
  socket.on("update-content", ({ roomId, content, username }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].content = content;

    // Broadcast to all in room except sender
    socket.to(roomId).emit("content-updated", {
      content,
      username,
      timestamp: new Date().toLocaleTimeString(),
    });
  });

  // Handle user activity
  socket.on("user-activity", ({ roomId, username, action }) => {
    socket.to(roomId).emit("activity-update", {
      username,
      action,
      timestamp: new Date().toLocaleTimeString(),
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    Object.entries(rooms).forEach(([roomId, room]) => {
      if (room.users[socket.id]) {
        const { username } = room.users[socket.id];
        delete room.users[socket.id];

        socket.to(roomId).emit("user-left", {
          userId: socket.id,
          username,
        });
      }
    });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
