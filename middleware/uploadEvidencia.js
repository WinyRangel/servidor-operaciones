const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear carpeta si no existe
const uploadPath = path.join(__dirname, '../uploads/evidencias');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const nombreUnico = `evidencia-${Date.now()}${ext}`;
        cb(null, nombreUnico);
    }
});

// Filtro de archivos (solo imágenes)
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png/;
    const mimeType = tiposPermitidos.test(file.mimetype);
    const extName = tiposPermitidos.test(
        path.extname(file.originalname).toLowerCase()
    );

    if (mimeType && extName) {
        return cb(null, true);
    }

    cb(new Error('Solo se permiten imágenes (jpg, jpeg, png)'));
};

// Límite de tamaño (5MB)
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

module.exports = upload;
