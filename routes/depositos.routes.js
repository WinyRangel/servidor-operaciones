const DepositosController = require('../controllers/depositos.controller');
const express = require('express');
const router = express.Router();

router.post('/depositos', DepositosController.crearDeposito);
router.get('/depositos', DepositosController.obtenerDepositos);

module.exports = router;