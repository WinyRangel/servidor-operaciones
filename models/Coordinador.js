const mongoose = require('mongoose');

const coordinadorSchema = new mongoose.Schema({
  nombre: String,
  coche: String,
  rendimiento: Number,
});

module.exports = mongoose.model('Coordinador', coordinadorSchema);
