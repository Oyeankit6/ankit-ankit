import { Server } from "socket.io";

const io = new Server(3001, {
  cors: {
    origin: "*",
  },
});

console.log("Server running on http://localhost:3001");

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("text-change", (data) => {
    socket.broadcast.emit("text-change", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});
