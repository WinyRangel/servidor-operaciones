const mongoose = require('mongoose');

const FichasSchema = new mongoose.Schema({
  semana: String,
  coordinacion: String,
  asesor: String,
  cliente: String,
  diaAtencion: String,
  fechaInicio: String,
  fechaFin: String,
  estado: { type: Boolean, default: false },
  fechahora: { type: String, default: '' },
  tipopago: { type: [String], default: [] }, 
  reportada: { type: Boolean, default: false }
});

module.exports = mongoose.model('Fichas', FichasSchema);
