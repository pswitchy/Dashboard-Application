// /backend/src/controllers/authController.js

const User = require('../models/User');
const jwt = require('jsonwebtoken');
// const { promisify } = require('util'); // Only needed if using promisify for jwt.verify elsewhere

// Helper function to sign JWT
const signToken = (id) => {
    // Ensure JWT_SECRET and JWT_EXPIRES_IN are loaded from .env
    if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
        console.error("CRITICAL: JWT_SECRET or JWT_EXPIRES_IN missing from environment variables!");
        // Handle this case appropriately - maybe throw an error?
        // For now, we'll let jwt.sign potentially fail below if secret is missing.
    }
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
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create new user (Password hashing happens via Mongoose pre-save hook)
    const newUser = await User.create({ username, password });

    // Don't send password back in the user object response
    const userOutput = { id: newUser._id, username: newUser.username };

    // --- Sign up does NOT set the auth cookie, user needs to log in separately ---
    // (Alternatively, you could log them in immediately by setting the cookie here too)

    res.status(201).json({
      status: 'success',
      // Optionally return token/user if needed immediately after signup,
      // but standard practice often requires a separate login.
      // Let's not return the token here to enforce login.
      message: 'Signup successful. Please log in.',
      data: {
        user: userOutput,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    // Handle potential Mongoose validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// --- Login ---
exports.login = async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
      }

      const user = await User.findOne({ username }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        // Use a generic message for security - don't reveal if username exists
        return res.status(401).json({ message: 'Incorrect username or password' });
      }

      // If password is correct, generate token
      const token = signToken(user._id);

      // --- Define Cookie Options ---
      const cookieOptions = {
        httpOnly: true, // Prevent client-side JS access
        secure: true, // REQUIRED for SameSite=None - Ensure backend runs on HTTPS (Render does)
        sameSite: 'None', // REQUIRED for cross-domain (Vercel <-> Render) cookies
        maxAge: 1 * 60 * 60 * 1000, // 1 hour in milliseconds (match JWT expiry)
        path: '/', // Make cookie available across the entire site
        // domain: '.your-base-domain.com' // Optional: Only needed if sharing cookie across subdomains
      };

      // Log options being used (useful for debugging)
      console.log(`Login: Setting authToken cookie for user ${user.username} with options:`, cookieOptions);

      // Set the cookie in the response header
      res.cookie('authToken', token, cookieOptions);

      // Prepare user data for the response body (without password)
      const userOutput = { id: user._id, username: user.username };

      // Send success response (token is NOT in the body, only in the cookie)
      res.status(200).json({
        status: 'success',
        data: {
          user: userOutput,
        }
      });
    } catch (error) {
       console.error("Login Error:", error);
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
  };

// --- Logout ---
exports.logout = (req, res) => {
    console.log("Logout: Clearing authToken cookie");
    try {
        // Clear the cookie by setting an expired date and matching secure/sameSite options
        res.cookie('authToken', 'loggedout', { // Value can be anything
          httpOnly: true,
          expires: new Date(Date.now() + 5 * 1000), // Expire 5 seconds from now
          secure: true, // Match login setting (REQUIRED for SameSite=None)
          sameSite: 'None', // Match login setting (REQUIRED for cross-domain)
          path: '/',
          // domain: '.your-base-domain.com' // Optional: Match login if used
        });
        res.status(200).json({ status: 'success', message: 'Logged out successfully' });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({ message: 'Logout failed', error: error.message });
    }
};

// --- Get Me (Protected Route) ---
exports.getMe = async (req, res) => {
    // Assumes the 'protect' middleware has run successfully and attached 'req.user'
    if (!req.user) {
        // This case should technically be caught by 'protect', but safety check is okay
        console.warn("getMe controller reached without req.user attached!");
        return res.status(401).json({ status: 'fail', message: 'Not authorized.' });
    }

    // Send back the user data attached by the middleware
    const userOutput = { id: req.user._id, username: req.user.username };
    res.status(200).json({
        status: 'success',
        data: {
             user: userOutput
            }
        });
};