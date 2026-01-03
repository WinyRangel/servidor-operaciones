require('dotenv').config({ path: 'variables.env' });
const path = require('path');
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
  origin: 'https://supervisor-operacion.web.app', // tu frontend
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



app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);


// Iniciar servidor
app.listen(4000, async () => {
  console.log('El servidor está corriendo perfectamente en el puerto 4000!');
});
