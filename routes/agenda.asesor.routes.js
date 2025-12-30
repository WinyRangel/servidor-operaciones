const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
// Importar controladores
const { crearAgenda, obtenerAgendas, obtenerAgendasCoordinador, actualizarAgenda, eliminarAgenda } = require('../controllers/agenda.asesor.controller');

// Rutas
router.post('/', verifyToken, crearAgenda);
router.get('/', verifyToken, obtenerAgendas);
router.get('/coordinador/:idCoordinador', verifyToken, obtenerAgendasCoordinador);
router.put('/:id', verifyToken, actualizarAgenda);
router.delete('/:id', verifyToken, eliminarAgenda);

module.exports = router;