// routes/seguimiento.routes.js
const express = require('express');
const router  = express.Router();
const CumplimientoObjetivo = require('../models/CumplimientoObjetivo');

// Crear o actualizar un seguimiento
router.post('/seguimiento_agenda', async (req, res) => {
  try {
    const nuevo = new CumplimientoObjetivo(req.body);
    const saved = await nuevo.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error('Error en POST /seguimiento_agenda:', err);
    return res.status(400).json({ error: err.message });
  }
});

// Obtener seguimiento por coordinador y semana
router.get('/seguimiento_agenda', async (req, res) => {
  const { coordinador, semana } = req.query;
  try {
    const docs = await CumplimientoObjetivo
      .find({ coordinador, semana })
      .sort({ fechaRegistro: 1 });
    return res.json(docs);
  } catch (err) {
    console.error('Error en GET /seguimiento_agenda:', err);
    return res.status(500).json({ error: err.message });
  }
});


// Actualizar un seguimiento por ID
router.put('/seguimiento_agenda/:id', async (req, res) => {
  try {
    const updated = await CumplimientoObjetivo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error('Error en PUT /seguimiento_agenda/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
