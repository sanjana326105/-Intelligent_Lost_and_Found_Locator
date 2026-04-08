const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ createdAt: -1 });

    const conversationMap = {};
    for (const msg of messages) {
      const partnerId = msg.senderId.toString() === userId
        ? msg.receiverId.toString()
        : msg.senderId.toString();
      const partnerName = msg.senderId.toString() === userId
        ? msg.receiverName
        : msg.senderName;

      if (!conversationMap[partnerId]) {
        conversationMap[partnerId] = {
          partnerId,
          partnerName,
          lastMessage: msg.content,
          lastTime: msg.createdAt,
          unreadCount: 0
        };
      }
      if (!msg.isRead && msg.receiverId.toString() === userId) {
        conversationMap[partnerId].unreadCount++;
      }
    }
    res.json(Object.values(conversationMap));
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/:partnerId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { senderId: partnerId, receiverId: userId, isRead: false },
      { isRead: true }
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/send", authMiddleware, async (req, res) => {
  try {
    const { receiverId, content, postId } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ message: "Receiver and content required" });
    }
    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: "Receiver not found" });

    const newMessage = new Message({
      senderId: req.user.id,
      receiverId,
      senderName: req.user.name,
      receiverName: receiver.name,
      content,
      postId: postId || null,
    });
    await newMessage.save();
    res.status(201).json({ message: "Sent", data: newMessage });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;