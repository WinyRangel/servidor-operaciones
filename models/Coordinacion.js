const mongoose = require('mongoose');

const coordinacionSchema = new mongoose.Schema({
  nombre: String,
  municipio: String,
  ejecutivas: [
    {
      nombre: String
    }
  ],
  coordinador: [{
    nombre: String,
    coche: String,
    rendimiento: Number // ✅ Corregido de 'float' a 'Number'
  }] 
});

module.exports = mongoose.model('Coordinacion', coordinacionSchema);
