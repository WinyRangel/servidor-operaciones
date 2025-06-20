const  AgendaController= require ('../controllers/agenda.controller')
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');

router.post('/agenda',verifyToken,  AgendaController.registrarAgenda);
router.get('/agenda', AgendaController.obtenerAgenda);
router.get('/agendas', AgendaController.obtenerAgendas1);
router.get('/agendas/agendasCoordinador', verifyToken, AgendaController.obtenerPorCoordinador);
router.get('/domicilios', AgendaController.obtenerDomicilios);
router.put('/agenda/:id', AgendaController.actualizarAgenda);
router.delete('/agenda/:id', AgendaController.eliminarAgenda);
module.exports = router;

