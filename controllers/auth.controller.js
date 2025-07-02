const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario'); // ajusta la ruta si es necesario

const SECRET_KEY = '123VAM!!'; // ⚠️ cambia esto por una variable de entorno segura

// Registrar usuario
exports.registrarUsuario = async (req, res) => {
  const { usuario, contrasenia, rol } = req.body;

  try {
    const usuarioExistente = await Usuario.findOne({ usuario });
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'El usuario ya existe' });
    }

    const hash = await bcrypt.hash(contrasenia, 10);

    const nuevoUsuario = new Usuario({
      usuario,
      contrasenia: hash,
      rol
    });

    await nuevoUsuario.save();

    res.status(201).json({ mensaje: 'Usuario registrado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor', error });
  }
};

// Iniciar sesión
exports.iniciarSesion = async (req, res) => {
  const { usuario, contrasenia } = req.body;

  try {
    const usuarioEncontrado = await Usuario.findOne({ usuario });
    if (!usuarioEncontrado) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const passwordValida = await bcrypt.compare(contrasenia, usuarioEncontrado.contrasenia);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuarioEncontrado._id, rol: usuarioEncontrado.rol },
      SECRET_KEY,
      { expiresIn: '2h' }
    );

    res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: usuarioEncontrado.usuario,
      rol: usuarioEncontrado.rol
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor', error });
  }
};
