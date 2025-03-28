const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { promisify } = require('util'); // To promisify jwt.sign/verify if needed

// Helper to sign JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// --- Signup ---
exports.signup = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create new user
    const newUser = await User.create({ username, password });

    // Don't send password back, even hashed
    newUser.password = undefined;

    // Generate token
    const token = signToken(newUser._id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: { id: newUser._id, username: newUser.username },
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// backend/src/controllers/authController.js

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect username or password' });
    }

    const token = signToken(user._id);

    // --- SET COOKIE ---
    res.cookie('authToken', token, {
      httpOnly: true, // Crucial: Prevents client-side JS access
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS only)
      sameSite: 'None', // Good practice for CSRF protection
      maxAge: 1 * 60 * 60 * 1000, // 1 hour in milliseconds (match JWT expiry)
      path: '/', // Make cookie available across the entire site
    });
    // --- /SET COOKIE ---


    const userOutput = { id: user._id, username: user.username };

    // Send response *without* the token in the body
    res.status(200).json({
      status: 'success',
      // token, // <-- REMOVE token from response body
      data: {
        user: userOutput,
      }
    });
  } catch (error) {
     console.error("Login Error:", error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// Optional but Recommended: Add a Logout Endpoint to Clear Cookie
exports.logout = (req, res) => {
  console.log("Clearing authToken cookie");
  res.cookie('authToken', 'loggedout', { // Set dummy value or clear
    httpOnly: true,
    expires: new Date(Date.now() + 5 * 1000), // Expire very quickly
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    path: '/',
  });
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};

// --- Get Current User (Example) ---
exports.getMe = async (req, res) => {
    // req.user is added by the authMiddleware
    if (!req.user) {
        return res.status(404).json({ message: 'User not found' });
    }
     // Ensure we only send necessary info
    const userOutput = { id: req.user._id, username: req.user.username };
    res.status(200).json({ status: 'success', data: { user: userOutput } });
};