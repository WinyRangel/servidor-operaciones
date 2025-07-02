const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/registro', authController.registrarUsuario);
router.post('/login', authController.iniciarSesion);

module.exports = router;
