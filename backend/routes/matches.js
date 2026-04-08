const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const authMiddleware = require("../middleware/auth");

// Helper: calculate match score between two posts
function calculateMatchScore(lostPost, foundPost) {
  let score = 0;

  // Category match — high weight
  if (lostPost.category === foundPost.category) {
    score += 40;
  }

  // Location match — medium weight
  if (lostPost.location === foundPost.location) {
    score += 30;
  }

  // Keyword match in title — high weight
  const lostWords = lostPost.title.toLowerCase().split(/\s+/);
  const foundWords = foundPost.title.toLowerCase().split(/\s+/);
  const commonTitleWords = lostWords.filter(word =>
    word.length > 2 && foundWords.includes(word)
  );
  score += commonTitleWords.length * 15;

  // Keyword match in description — lower weight
  const lostDesc = lostPost.description.toLowerCase().split(/\s+/);
  const foundDesc = foundPost.description.toLowerCase().split(/\s+/);
  const commonDescWords = lostDesc.filter(word =>
    word.length > 3 && foundDesc.includes(word)
  );
  score += commonDescWords.length * 5;

  // Date proximity — if found within 7 days of lost
  const lostDate = new Date(lostPost.date_reported);
  const foundDate = new Date(foundPost.date_reported);
  const daysDiff = Math.abs((foundDate - lostDate) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 7) score += 10;

  return score;
}

// GET matches for a specific lost post
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const lostPost = await Post.findById(req.params.id);
    if (!lostPost) return res.status(404).json({ message: "Post not found" });
    if (lostPost.type !== "lost") {
      return res.status(400).json({ message: "Matching only works for lost items" });
    }

    // Get all approved found posts
    const foundPosts = await Post.find({
      type: "found",
      status: "approved",
      flagged: false
    });

    // Score each found post
    const scored = foundPosts
      .map(foundPost => ({
        post: foundPost,
        score: calculateMatchScore(lostPost, foundPost)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // top 5 matches

    res.json({
      lostPost,
      matches: scored.map(item => ({
        ...item.post.toObject(),
        matchScore: item.score,
        matchPercent: Math.min(Math.round((item.score / 95) * 100), 99)
      }))
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET all suggested matches for current user's lost posts
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Get user's lost posts
    const myLostPosts = await Post.find({
      postedBy: req.user.id,
      type: "lost"
    });

    if (myLostPosts.length === 0) {
      return res.json({ matches: [] });
    }

    // Get all approved found posts
    const foundPosts = await Post.find({
      type: "found",
      status: "approved",
      flagged: false
    });

    // Find best matches for each lost post
    const allMatches = [];

    for (const lostPost of myLostPosts) {
      const scored = foundPosts
        .map(foundPost => ({
          lostPost,
          foundPost,
          score: calculateMatchScore(lostPost, foundPost)
        }))
        .filter(item => item.score >= 20) // minimum score threshold
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // top 3 per lost item

      allMatches.push(...scored);
    }

    // Sort all matches by score
    allMatches.sort((a, b) => b.score - a.score);

    res.json({
      matches: allMatches.map(item => ({
        lostPost: item.lostPost,
        foundPost: item.foundPost,
        matchScore: item.score,
        matchPercent: Math.min(Math.round((item.score / 95) * 100), 99)
      }))
    });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;