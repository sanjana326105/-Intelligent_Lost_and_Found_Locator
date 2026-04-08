const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["lost", "found"],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  date_reported: {
    type: Date,
    required: true
  },
  image_url: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["pending", "approved", "resolved"],
    default: "pending"
  },
  flagged: {
    type: Boolean,
    default: false
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  postedByName: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);