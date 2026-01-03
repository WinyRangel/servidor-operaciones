const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { crearAgenda, obtenerAgendas, obtenerAgendasCoordinador, actualizarAgenda, eliminarAgenda, obtenerAsesoresPorCoordinacion, validarAgenda } = require('../controllers/agenda.asesor.controller');
const upload = require('../middleware/uploadEvidencia');

// Rutas
router.post('/', verifyToken, crearAgenda);
router.get('/', verifyToken, obtenerAgendas);
router.get('/asesores', verifyToken, obtenerAsesoresPorCoordinacion);
router.get('/coordinador/:idCoordinador', verifyToken, obtenerAgendasCoordinador);
router.put('/:id', verifyToken, upload.single('evidencia'), actualizarAgenda);
router.put('/:id/validar', verifyToken, validarAgenda);
router.delete('/:id', verifyToken, eliminarAgenda);

module.exports = router;