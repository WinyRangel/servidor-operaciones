// // routes/fichas.routes.js
// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });
// const FichasController = require('../controllers/fichas.controller');

// // Endpoint para recibir array JSON y guardarlo en BD
// router.post('/bulk', FichasController.saveBulk);

// // Opcional: subir archivo y parsearlo en servidor
// router.post('/upload', upload.single('file'), FichasController.uploadAndParse);

// // CRUD
// router.get('/', FichasController.getAllFichas);
// router.get('/:id', FichasController.getFichasById);
// router.put('/:id', FichasController.updateFichas);
// router.delete('/:id', FichasController.deleteFichas);

// module.exports = router;


// routes/fichas.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const FichasController = require('../controllers/fichas.controller');
const { verifyToken } = require('../middleware/authMiddleware');

// Endpoint para recibir array JSON y guardarlo en BD
router.post('/bulk', verifyToken, FichasController.saveBulk);

// Opcional: subir archivo y parsearlo en servidor
router.post('/upload', verifyToken, upload.single('file'), FichasController.uploadAndParse);

// CRUD
router.get('/', verifyToken, FichasController.getAllFichas);
router.get('/:id', verifyToken, FichasController.getFichasById);
router.put('/:id', verifyToken, FichasController.updateFichas);
router.delete('/:id', verifyToken, FichasController.deleteFichas);

module.exports = router;
