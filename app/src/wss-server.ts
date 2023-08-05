import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const port = process.env.NEXT_PUBLIC_SOCKET_URL?.split(":")?.[2] ?? process.env.PORT ?? 3318;

const app = express();
app.use(cors());
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // Listen to 'join' event to add this socket to a specific room.
  socket.on("join", (room: string) => {
    socket.join(room)?.catch((err) => console.log(err));
  });

  // When a 'message' event is received, emit it to the room specified
  socket.on("message", (msg: { channel: string; payload: unknown }) => {
    socket.to(msg.channel).emit("message", msg.payload);
  });
});

server.listen(port, () => {
  console.log(`listening on *:${port}`);
});
