const express = require('express');
const router = express.Router();    
const LegalesController = require('../controllers/legales.controller.js');

router.post('/legales', LegalesController.crearLegales);
router.get('/legales', LegalesController.obtenerLegales);
router.put('/legales/:id', LegalesController.actualizarLegal);
router.delete('/legales/:id', LegalesController.eliminarLegal);

module.exports = router;