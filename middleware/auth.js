const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.slice(7).trim(); // Remove 'Bearer ' and trim whitespace
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Invalid token format.' });
  }

  try {
    // Ensure JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate payload
    if (!decoded.userId) {
      return res.status(401).json({ error: 'Access denied. Invalid token payload.' });
    }

    // Attach user ID to request
    req.userId = decoded.userId;

    next();
  } catch (err) {
    // Log error for debugging (in production, consider a logger like Winston)
    console.error('JWT verification failed:', err.message);

    // Handle specific JWT errors for better UX
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access denied. Token has expired.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Access denied. Invalid token.' });
    }

    // Generic catch-all
    res.status(401).json({ error: 'Access denied. Token verification failed.' });
  }
};

module.exports = { protect };