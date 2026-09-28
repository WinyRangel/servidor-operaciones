const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config({ path: 'variables.env' });
const fs = require('fs');
const path = require('path');

// Cargar variables si están configuradas como "Secret Files" en Render (/etc/secrets/<filename>)
const secretsDir = '/etc/secrets';
try {
  if (fs.existsSync(secretsDir)) {
    const files = fs.readdirSync(secretsDir);
    files.forEach(file => {
      const filePath = path.join(secretsDir, file);
      if (fs.statSync(filePath).isFile()) {
        const val = fs.readFileSync(filePath, 'utf8').trim();
        process.env[file] = val;
      }
    });
    console.log(`[Secrets] Cargadas ${files.length} variable(s) desde /etc/secrets`);
  }
} catch (e) {
  // Ignorar en local
}

const nodemailer = require("nodemailer");
const express = require('express');
const conectarDB = require('./config/db');
const cors = require("cors");
const app = express();
conectarDB();

// para localhost y producción
// const allowedOrigins = [
//   'http://localhost:4200',
//   'https://supervisor-operacion.web.app'
// ];

app.use(cors({
  origin: ['https://supervisor-operacion.web.app', 'http://localhost:4200', 'https://sistema-agendas-vam.web.app'], // tu  frontend producccion https://supervisor-operacion.web.app
  credentials: true
}));
//https://supervisor-operacion.web.app

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/', require('./routes/baucher.routes'));
app.use('/', require('./routes/coordinacion.routes'));
app.use('/', require('./routes/legales.routes'));
app.use('/', require('./routes/agenda.routes'));
app.use('/', require('./routes/ejecutivas.routes'));
app.use('/', require('./routes/depositos.routes'));
app.use('/api/proyecciones', require('./routes/proyeccion.routes'));
app.use('/', require('./routes/creditos.routes'));
app.use('/fichas', require('./routes/fichas.routes'));
app.use('/', require('./routes/auth.routes'));
app.use('/api', require('./routes/seguimiento.routes'));
app.use('/agenda-asesor', require('./routes/agenda.asesor.routes'));
app.use('/agenda-admin', require('./routes/agenda.admin.routes'));



app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);


// Iniciar servidor
app.listen(4000, async () => {
  console.log('El servidor está corriendo perfectamente en el puerto 4000!');
});
