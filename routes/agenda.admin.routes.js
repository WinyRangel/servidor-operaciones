const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agenda.admin.controller');

router.post('/', agendaController.crearAgendaAdmin);
router.post('/enviar-resumen', agendaController.enviarResumenAgenda);
router.get('/', agendaController.obtenerAgendasAdmin);
router.put('/:id', agendaController.actualizarAgendaAdmin);
router.delete('/:id', agendaController.eliminarAgendaAdmin);

// Obtener todas las agendas
router.get('/all', agendaController.obtenerAllAgendas);

module.exports = router;