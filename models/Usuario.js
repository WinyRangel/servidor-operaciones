const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  usuario: {
  type: String,
  required: true,
},
 contrasenia: {
    type: String,
    requiered: true
 }, 
  rol: {
    type: String,
    required: true,
    enum:['sup', 'admin']
  }

});

module.exports = mongoose.model('Usuario', usuarioSchema);
