const Usuario = require('../models/Usuario');
const Coordinacion  = require ('../models/Coordinacion')
const Agenda  = require ('../models/Agenda')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Registro de usuario
const registrarUsuario = async (req, res) => {
  const { usuario, contrasenia, rol } = req.body;

  try {
    // Verificar si el usuario ya existe
    const existe = await Usuario.findOne({ usuario });
    if (existe) {
      return res.status(400).json({ mensaje: 'El usuario ya existe' });
    }

    // Encriptar contraseña
    const hash = await bcrypt.hash(contrasenia, 10);

    const nuevoUsuario = new Usuario({
      usuario,
      contrasenia: hash,
      rol
    });

    await nuevoUsuario.save();

    res.status(201).json({ mensaje: 'Usuario registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar usuario', error });
  }
};


const iniciarSesion = async (req, res) => {
  try {
    const { contrasenia, usuario } = req.body;

    // Buscar el usuario por nombre
    const user = await Usuario.findOne({ usuario });
    if (!user) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    // Validar contraseña
    const contraseniaMatch = await bcrypt.compare(contrasenia, user.contrasenia);
    if (!contraseniaMatch) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    // Buscar al coordinador relacionado
    const coordinacion = await Coordinacion.findOne(
      { 'coordinador.user': user._id },
      { 'coordinador.$': 1 }
    );
    const datosCoordinador = coordinacion ? coordinacion.coordinador[0] : null;

    // Buscar agendas por nombre del coordinador
    let agendas = [];
    if (datosCoordinador?.nombre) {
        agendas = await Agenda.find({ coordinador: datosCoordinador._id });
    }

    // Generar token
    const token = jwt.sign(
      {
        usuarioId: user._id,
        rol: user.rol,
        coordinadorId: datosCoordinador?._id
      },
      'secreto',
      { expiresIn: '2h' }
    );

    // Enviar respuesta
    res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: user._id,
        nombre: user.usuario,
        rol: user.rol
      },
      coordinador: datosCoordinador,
      agendas
    });
    console.log("usuario> ", usuario, "con el rol", user.rol)

  } catch (error) {
    console.error('Error en iniciarSesion:', error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};



module.exports = { iniciarSesion, registrarUsuario };
