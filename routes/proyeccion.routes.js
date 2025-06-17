const express = require('express');
const router = express.Router();

// Importa tu controlador, asegúrate de que la ruta y el nombre coincidan
const ProyeccionController = require('../controllers/proyeccion.controller.js');

// CREATE (bulk upload desde el Excel)
router.post('/', ProyeccionController.saveProyecciones);

// READ all
router.get('/', ProyeccionController.getAllProyecciones);

// READ one
router.get('/:id', ProyeccionController.getProyeccionById);

// UPDATE one
router.put('/:id', ProyeccionController.updateProyeccion);

// DELETE one
router.delete('/:id', ProyeccionController.deleteProyeccion);

module.exports = router;
