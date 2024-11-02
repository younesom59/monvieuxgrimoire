const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_jwt_secret';

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ message: 'Accès refusé. Pas de token fourni.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Token invalide.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Mettre l'utilisateur décodé dans la requête
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalide.' });
  }
};

module.exports = authMiddleware;