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
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    coche: String,
    rendimiento: Number 
  }] 
});

module.exports = mongoose.model('Coordinacion', coordinacionSchema);
