require('dotenv').config({ path: 'variables.env' });

const express = require('express');

const conectarDB = require('./config/db');
const cors = require("cors");

// Creamos el servidor
const app = express();

// Conectamos a la BD
conectarDB();
app.use(cors())

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', require('./routes/baucher.routes'));
app.use('/', require('./routes/coordinacion.routes'));
app.use('/', require('./routes/legales.routes'));
app.use('/', require('./routes/agenda.routes'));
app.use('/', require('./routes/ejecutivas.routes'));
app.use('/', require('./routes/depositos.routes'));



app.listen(4000, () => {
    console.log('El servidor esta corriendo perfectamente!')
})

 