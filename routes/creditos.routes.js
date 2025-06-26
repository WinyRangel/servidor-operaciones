const express = require('express');
const router = express.Router();
const controller = require('../controllers/creditoproye.controller');

router.get('/dir-seg-proyecciones', controller.getProyecciones);
router.post('/dir-seg-proyecciones', controller.createProyeccion);
router.post('/dir-seg-proyecciones/batch', controller.createBatch);
router.delete('/dir-seg-proyecciones/:id', controller.deleteProyeccion);

module.exports = router;

    