/**
 * @param {...('hr'|'manager'|'employee'|'admin')} allowedRoles
 * Admin role has unrestricted access - if 'admin' is in allowedRoles, always pass
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Admin has unrestricted access to all routes
    if (req.user.role === 'admin') {
      return next();
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this resource' });
    }
    return next();
  };
}

module.exports = { requireRole };
