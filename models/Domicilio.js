const mongoose = require('mongoose');

const domicilioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    unique: true,
    required: true
  }
});

module.exports = mongoose.model('Domicilio', domicilioSchema);
