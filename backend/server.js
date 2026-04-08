require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const matchRoutes = require("./routes/matches");
const messageRoutes = require("./routes/messages");
const adminRoutes = require("./routes/admin");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/campusdb")
  .then(() => console.log("MongoDB Connected Successfully ✅"))
  .catch((error) => console.log("MongoDB Connection Failed ❌", error));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);

const onlineUsers = {};
io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    onlineUsers[userId] = socket.id;
  });

  socket.on("sendMessage", async (data) => {
    const { senderId, senderName, receiverId, receiverName, content, postId } = data;
    try {
      const Message = require("./models/Message");
      const newMessage = new Message({
        senderId, receiverId,
        senderName, receiverName,
        content, postId: postId || null,
      });
      await newMessage.save();
      const receiverSocketId = onlineUsers[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", newMessage);
      }
      socket.emit("messageSent", newMessage);
    } catch (err) {
      socket.emit("messageError", { message: "Failed to send" });
    }
  });

  socket.on("disconnect", () => {
    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
        break;
      }
    }
  });
});

app.get("/", (req, res) => res.send("Backend running 🚀"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));