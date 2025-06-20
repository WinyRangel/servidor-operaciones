const mongoose = require('mongoose');
require('dotenv').config({ path: 'variables.env' });

const Agenda = require('../models/Agenda'); // ajusta el path si es necesario
const Usuario = require('../models/Usuario');

const conectarDB = async () => {

    try {

        await mongoose.connect(process.env.DB_MONGO, {
           
        })
        console.log('BD Conectada');
        
    } catch (error) {
        console.log(error);
        process.exit(1); // Detenemos la app
    }

}

module.exports = conectarDB;