const  CoordinacionController= require ('../controllers/coordinacion.controller')
const express = require('express');
const Coordinacion = require('../models/Coordinacion');
const router = express.Router();

router.get('/coordinacion', CoordinacionController.obtenerCoordinacion);
router.post('/coordinacion', CoordinacionController.crearCoordinacion);

module.exports = router;