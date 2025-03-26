// /backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;
  // --- START DEBUG LOGGING ---
  console.log('--- Backend Protect Middleware Triggered ---');
  console.log('Request Path:', req.originalUrl); // See which path triggered it
  console.log('Incoming Cookies:', req.cookies); // Check if cookies are parsed
  // --- END DEBUG LOGGING ---

  // 1) Getting token from cookie
  if (req.cookies && req.cookies.authToken) { // Check req.cookies exists first
    token = req.cookies.authToken;
    console.log('Backend Protect Middleware: Found authToken cookie.');
  } else {
    console.log('Backend Protect Middleware: authToken cookie NOT FOUND in req.cookies.');
  }

  if (!token) {
    console.log('Backend Protect Middleware: No token found, rejecting with 401.');
    // Ensure response is sent ONLY ONCE
    return res.status(401).json({ message: 'You are not logged in! Please log in to get access.' });
  }

  try {
    console.log('Backend Protect Middleware: Verifying token...');
    // Ensure JWT_SECRET is loaded
    if (!process.env.JWT_SECRET) {
        console.error("CRITICAL: JWT_SECRET environment variable not set on backend!");
        return res.status(500).json({ message: "Internal server error (Auth config missing)"});
    }
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log('Backend Protect Middleware: Token verified. User ID:', decoded.id);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      console.log('Backend Protect Middleware: User for token not found, rejecting with 401.');
      return res.status(401).json({ message: 'The user belonging to this token does no longer exist.' });
    }

    // GRANT ACCESS
    req.user = currentUser;
    console.log('Backend Protect Middleware: Access granted.');
    next();
  } catch (err) {
    console.error("Backend Protect Middleware: Token verification FAILED.", err.name, err.message);
    if (err.name === 'JsonWebTokenError') {
       return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    } else if (err.name === 'TokenExpiredError') {
       return res.status(401).json({ message: 'Your token has expired! Please log in again.' });
    } else {
       // Avoid sending detailed errors in production
       return res.status(500).json({ message: 'Authentication error.' });
    }
  }
};