// controllers/depositosController.js
const Depositos = require('../models/Depositos');

// Obtener depósitos por coordinación
const obtenerDepositos = async (req, res) => {
  const { coordinacion } = req.query;

  try {
    const depositos = await Depositos.find({ coordinacion });
    res.json(depositos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los depósitos' });
  }
};

// Crear un nuevo depósito
const crearDeposito = async (req, res) => {
  const { coordinacion, nombre, horaReporte, fechaReporte } = req.body;

  try {
    const nuevoDeposito = new Depositos({
      coordinacion,
      nombre,
      horaReporte,
      fechaReporte,
    });

    await nuevoDeposito.save();
    res.status(201).json({ mensaje: 'Depósito guardado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el depósito' });
  }
};

module.exports = {
  obtenerDepositos,
  crearDeposito,
};
