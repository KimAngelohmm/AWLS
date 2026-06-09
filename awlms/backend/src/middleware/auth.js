const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to a strong string (min 16 characters)');
  }
  return 'awlms-dev-jwt-secret-min16';
}

/**
 * Verifies Bearer JWT and attaches req.user = { id, email, role }.
 */
function authenticateToken(req, res, next) {
  try {
    getJwtSecret();
  } catch (e) {
    return res.status(500).json({ error: 'Server authentication is not configured' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { authenticateToken, getJwtSecret };
