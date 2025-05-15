const mongoose = require('mongoose');

const domicilioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: false
  } 
});

module.exports = mongoose.model('Domicilio', domicilioSchema);
