const Ejecutiva = require('../models/Ejecutivas');

// Crear nueva actividad
exports.crearActividad = async (req, res) => {
  try {
    const nuevaActividad = new Ejecutiva(req.body);
    await nuevaActividad.save();
    res.status(201).json({ mensaje: 'Actividad guardada correctamente', actividad: nuevaActividad });
  } catch (error) {
    console.error('Error al guardar actividad:', error);
    res.status(500).json({ mensaje: 'Error al guardar actividad', error });
  }
};

// Obtener todas las actividades
exports.obtenerActividades = async (req, res) => {
  try {
    const actividades = await Ejecutiva.find();
    res.status(200).json(actividades);
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    res.status(500).json({ mensaje: 'Error al obtener actividades', error });
  }
};
