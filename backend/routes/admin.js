const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/auth");

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

// GET all users
router.get("/users", authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT verify user
router.put("/users/:id/verify", authMiddleware, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { verified: true, flagged: false },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User verified", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT block user
router.put("/users/:id/block", authMiddleware, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { verified: false, flagged: true },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User blocked", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE user
router.delete("/users/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET analytics
router.get("/analytics", authMiddleware, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "student" });
    const totalPosts = await Post.countDocuments();
    const lostPosts = await Post.countDocuments({ type: "lost" });
    const foundPosts = await Post.countDocuments({ type: "found" });
    const pendingPosts = await Post.countDocuments({ status: "pending" });
    const approvedPosts = await Post.countDocuments({ status: "approved" });
    const flaggedPosts = await Post.countDocuments({ flagged: true });
    const totalMessages = await Message.countDocuments();
    const resolvedPosts = await Post.countDocuments({ status: "resolved" });

    const categoryStats = await Post.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const locationStats = await Post.aggregate([
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyStats = await Post.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalUsers, totalPosts, lostPosts, foundPosts,
      pendingPosts, approvedPosts, flaggedPosts,
      totalMessages, resolvedPosts,
      categoryStats, locationStats, dailyStats
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;