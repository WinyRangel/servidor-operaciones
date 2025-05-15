const  BaucherController= require ('../controllers/baucher.controller')
const express = require('express');
const router = express.Router();

router.post('/baucher', BaucherController.crearBaucher);
router.get('/baucher', BaucherController.obtenerBauchers);
router.put('/baucher/:id', BaucherController.actualizarBaucher);
router.delete('/baucher/:id', BaucherController.eliminarBaucher);

module.exports = router;