const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const authMiddleware = require("../middleware/auth");
const upload = require("../config/multer");

router.get("/", async (req, res) => {
  try {
    const { type, search } = req.query;
    let filter = { status: "approved", flagged: false };
    if (type && type !== "all") filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    const posts = await Post.find(filter).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/admin/all", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/admin/flagged", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const posts = await Post.find({ flagged: true }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/myposts", authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { type, title, description, category, location, date_reported } = req.body;
    if (!type || !title || !description || !category || !location || !date_reported) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const image_url = req.file
      ? `http://localhost:5000/uploads/${req.file.filename}`
      : "";
    const newPost = new Post({
      type, title, description, category,
      location, date_reported, image_url,
      postedBy: req.user.id,
      postedByName: req.user.name,
      status: "pending",
      flagged: false
    });
    await newPost.save();
    res.status(201).json({ message: "Post created!", post: newPost });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/:id/approve", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const post = await Post.findByIdAndUpdate(req.params.id, { status: "approved", flagged: false }, { new: true });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Approved", post });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/:id/flag", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { flagged: true }, { new: true });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Flagged", post });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/:id/unflag", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const post = await Post.findByIdAndUpdate(req.params.id, { flagged: false, status: "approved" }, { new: true });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Unflagged", post });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ Mark as resolved
router.put("/:id/resolve", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    post.status = "resolved";
    await post.save();
    res.json({ message: "Post marked as resolved!", post });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (req.user.role !== "admin" && post.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;