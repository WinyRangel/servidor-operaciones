const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EjecutivaSchema = new Schema({
  nombre: { type: String, required: true },
  ejecutiva: { type: String, required: true },
  fecha: { type: String, required: true },
  actividad: { type: String, required: true },
  frecuencia: { type: String, required: true },
  hora: { type: String, required: true },
  actRealizada: { type: String, default: '' },
  horaReporte: { type: String, default: '-' }
}, {
  timestamps: true 
});

module.exports = mongoose.model('Ejecutiva', EjecutivaSchema);
