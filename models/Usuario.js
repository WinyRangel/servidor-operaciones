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
    requiered: true,
    enum:['sup', 'admin', 'coordinador']
  }

});

module.exports = mongoose.model('Usuario', usuarioSchema);
