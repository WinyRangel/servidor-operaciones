require('dotenv').config({ path: 'variables.env' });

const express = require('express');
const conectarDB = require('./config/db');
const cors = require("cors");

// Importar el modelo Domicilio
const Domicilio = require('./models/Domicilio'); 

// Creamos el servidor
const app = express();

// Conectamos a la BD
conectarDB();

// Middleware
app.use(cors());
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
app.use('/', require('./routes/auth.routes'));
app.use('/api', require('./routes/seguimiento.routes'));






// Inicializar domicilio por defecto
const inicializarDomicilioPorDefecto = async () => {
  try {
    const existente = await Domicilio.findOne({ nombre: 'SIN AGENDAR' });
    if (!existente) {
      await Domicilio.create({ nombre: 'SIN AGENDAR' });
      console.log('Domicilio por defecto creado: SIN AGENDAR');
    } else {
      console.log('Domicilio por defecto ya existe');
    }
  } catch (error) {
    console.error('Error al crear domicilio por defecto:', error);
  }
};

// Iniciar servidor
app.listen(4000, async () => {
  console.log('El servidor está corriendo perfectamente en el puerto 4000!');
  await inicializarDomicilioPorDefecto(); // Llamamos la función aquí
});
