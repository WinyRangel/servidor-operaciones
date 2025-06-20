// middleware/verifyToken.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, 'secreto');
    req.user = decoded; // ✅ aquí se asigna
    next();
  } catch (error) {
    return res.status(403).json({ mensaje: 'Token inválido' });
  }
};

module.exports = verifyToken;
