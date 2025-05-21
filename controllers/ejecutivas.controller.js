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

// Eliminar una actividad por su ID
exports.eliminarActividad = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await Ejecutiva.findByIdAndDelete(id);
    if (!eliminado) {
      return res.status(404).json({ mensaje: 'Actividad no encontrada' });
    }
    res.json({ mensaje: 'Actividad eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    res.status(500).json({ mensaje: 'Error al eliminar actividad', error });
  }
};