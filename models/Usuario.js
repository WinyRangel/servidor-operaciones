const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  usuario: {
    type: String,
    required: true,
  },
  contrasenia: {
    type: String,
    required: true,
  },
  rol: {
    type: String,
    required: true,
    enum: ['sup', 'admin', 'coordinador', 'asesor']
  },
  coordinacion: {
    type: String,
    required: function () {
      return this.rol === 'coordinador' || this.rol === 'asesor';
    }
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema);
