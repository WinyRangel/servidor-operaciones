// models/AgendaAsesor.js - NUEVO SCHEMA
const mongoose = require('mongoose');

const AgendaAsesorSchema = new mongoose.Schema({
  // Campos generales (igual que antes)
  asesor: { type: String, required: true },
  coordinacion: { type: String, required: true },
  semana: { type: String, required: true },
  fecha: { type: Date, required: true },
  objetivo: { type: String, default: '' },
  firma: { type: String, default: '' },

  // Campos de actividad individual (NO array)
  hora: { type: String, required: true },
  domicilio: { type: String, default: '' },
  actividad: { type: String, default: '' },
  codigo: { type: String, default: '' },
  acordeObjetivo: { type: Boolean, default: false },

  // Campos adicionales
  resultado: { type: String, trim: true },
  validada: { type: Boolean, default: false },
  validadaPor: { type: String, default: null },
  evidencia: {
    type: String,
    default: '',
    validate: {
      validator: v => {
        if (!v) return true;
        return /\.(jpg|jpeg|png)$/i.test(v);
      },
      message: 'La evidencia debe ser una imagen'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('AgendaAsesor', AgendaAsesorSchema);