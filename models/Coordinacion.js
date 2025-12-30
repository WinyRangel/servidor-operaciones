const mongoose = require('mongoose');

const coordinacionSchema = new mongoose.Schema({
  nombre: String,
  municipio: String,
  ejecutivas: [
    {
      nombre: String
    }
  ],
  coordinador: String,
  coche: String,
  rendimiento: Number
});

module.exports = mongoose.model('Coordinacion', coordinacionSchema);
