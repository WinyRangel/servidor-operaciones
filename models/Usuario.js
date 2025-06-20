const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  usuario: { 
    type: String, 
    required: true, 
    unique: true 
  },
  contrasenia: { 
    type: String, 
    required: true 
  },
  rol: { 
    type: String, 
    enum: ['admin', 'coordinador'], 
    required: false 
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema);
