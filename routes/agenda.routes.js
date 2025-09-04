const  AgendaController= require ('../controllers/agenda.controller')
const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/agenda', AgendaController.registrarAgenda);
router.get('/agenda', AgendaController.obtenerAgenda);
router.get('/obtenerAgenda', verifyToken, AgendaController.obtenerAgendas); //COP SOLO PUEDE VER SUS AGENDAS
router.get('/agendas', AgendaController.obtenerAgendas1);
router.put('/agenda/:id', AgendaController.actualizarAgenda);
router.delete('/agenda/:id', AgendaController.eliminarAgenda);
module.exports = router;

