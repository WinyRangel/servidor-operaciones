const Proyeccion = require('../models/Creditosproyec');

// Crear una sola proyección
exports.createProyeccion = async (req, res) => {
  try {
    const nueva = new Proyeccion(req.body);
    const guardada = await nueva.save();
    res.status(201).json(guardada);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Guardar múltiples proyecciones (batch)
exports.createBatch = async (req, res) => {
  try {
    const data = await Proyeccion.insertMany(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Obtener todas las proyecciones
exports.getProyecciones = async (req, res) => {
  try {
    const proyecciones = await Proyeccion.find().sort({ fechaEntrega: -1 });
    res.json(proyecciones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar una proyección por ID
exports.deleteProyeccion = async (req, res) => {
  try {
    const result = await Proyeccion.findByIdAndDelete(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
