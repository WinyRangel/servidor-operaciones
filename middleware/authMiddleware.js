const jwt = require('jsonwebtoken');
const SECRET_KEY = '123VAM!!'; // cámbialo a variable de entorno

exports.verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ mensaje: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // aquí estará { id, usuario, rol }
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};
