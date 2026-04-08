const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    console.log("Register hit with:", req.body);

    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!email.endsWith("@mlrit.ac.in")) {
      return res.status(400).json({ message: "Only @mlrit.ac.in emails are allowed" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "student",
      verified: true,   // ✅ auto verified — no admin approval needed
      flagged: false,   // ✅ not flagged
    });

    await newUser.save();
    console.log("User saved successfully ✅");

    res.status(201).json({ message: "Registration successful! You can now login." });

  } catch (error) {
    console.log("REGISTER ERROR ❌:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    console.log("Login hit with:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.verified) {
      return res.status(403).json({ message: "Account not yet verified." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET || "campusconnect_secret_2024",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    console.log("LOGIN ERROR ❌:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

module.exports = router;