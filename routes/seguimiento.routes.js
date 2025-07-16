const express = require('express');
const router  = express.Router();
const CumplimientoObjetivo = require('../models/CumplimientoObjetivo');

// POST /api/seguimiento_agenda
router.post('/seguimiento_agenda', async (req, res) => {
  try {
    const nuevo = new CumplimientoObjetivo(req.body);
    const saved = await nuevo.save();
    return res.status(201).json(saved);
  } catch (err) {
    console.error('Error en POST /api/seguimiento_agenda:', err);
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/seguimiento_agenda?coordinador=X&semana=Y
router.get('/seguimiento_agenda', async (req, res) => {
  const { coordinador, semana } = req.query;
  let filtro = {};

  if (coordinador) filtro.coordinador = coordinador;
  if (semana) filtro.semana = semana;

  try {
    const docs = await CumplimientoObjetivo.find(filtro).sort({ fechaRegistro: 1 });
    return res.json(docs);
  } catch (err) {
    console.error('Error en GET /seguimiento_agenda:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.put('/seguimiento_agenda/:id', async (req, res) => {
  try {
    const updated = await CumplimientoObjetivo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error en PUT /api/seguimiento_agenda/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;