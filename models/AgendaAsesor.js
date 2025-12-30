const mongoose = require('mongoose');

const AgendaAsesorSchema = new mongoose.Schema({
  semana: String,
  coordinacion: String,
  asesor: String,
  semana: String,
  fecha: String,
  objetivo: String,
  horaActividad: String,
  domicilio: String,
  actividad: String,
  codigo: String,
  resultado: String,
  firma: String,
  validada: { type: Boolean, default: false },
  validadaPor: String,
  evidencia: String,
  estado: { type: Boolean, default: false },
});

module.exports = mongoose.model('AgendaAsesor', AgendaAsesorSchema);
