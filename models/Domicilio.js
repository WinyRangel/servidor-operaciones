const mongoose = require('mongoose');

const domicilioSchema = new mongoose.Schema({
  nombre: {
  type: String,
  required: true,
  default: 'SIN AGENDAR'
}

});

module.exports = mongoose.model('Domicilio', domicilioSchema);
