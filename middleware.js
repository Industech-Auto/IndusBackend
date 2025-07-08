const jwt = require('jsonwebtoken');

const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).send({ error: 'Forbidden: Insufficient privileges' });
    }
    req.user = decoded; // Attach user info to the request
    next();
  } catch (error) {
    return res.status(401).send({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = { requireAdminAuth };