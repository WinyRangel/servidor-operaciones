// models/Proyeccion.js
const mongoose = require('mongoose');

const ProyeccionSchema = new mongoose.Schema({
  coordinacion: { type: String, default: '' },
  asesor: { type: String, default: '' },
  cliente: { type: String, default: '' },
  fechaEntregaAgendadaOpe: { type: Date, default: null },
  fechaEntregaAgendada: { type: Date, default: null },
  refil: { type: String, default: '' },
  mes: { type: String, default: '' },
  fechaEnvioOperativo: { type: Date, default: null },
  hora: { type: String, default: '' },
  diasRetrasoExpOp: { type: Number, default: 0 },
  incidenciasOperativo: { type: String, default: '' },
  fechaLimiteEntrega: { type: Date, default: null },
  fechaRealReciboExpLegal: { type: Date, default: null },
  renovado: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Proyeccion', ProyeccionSchema);
