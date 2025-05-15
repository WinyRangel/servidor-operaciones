const express = require('express');
const router = express.Router();
const ejecutivasController = require('../controllers/ejecutivas.controller');

// Ruta para crear y consultar actividad
router.post('/ejecutivas', ejecutivasController.crearActividad);
router.get('/ejecutivas', ejecutivasController.obtenerActividades);

module.exports = router;
