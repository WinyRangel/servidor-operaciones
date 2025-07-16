const mongoose = require('mongoose');

const AgendaSchema = new mongoose.Schema({
  coordinador: { 
    type: String, 
    required: false 
  },
  semana: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    required: true
  },
  objetivo:{
    type: String,
    required: false
  },
  meta: {
  type: String,
  required: false
},
  hora: {
    type: String,
    required: false
  }, 
  domicilio: {
    type: String,
    required: false,
    default: ''
  },
  actividad: {
    type: String,
    required: false,
    default: ''
  },
  codigo: {
    type: String,
    required: false,
    default: ''
  },
  codigoReportado: {
  type: String,
  required: false,
  default: ''
},
  actividadReportada: {
    type: String,
    default: ''
  },
  reportado: {
    type: Boolean,
    default: false
  },
  horaReporte: {
    type: String,
    default: ''
  },
  horaCierre: {
    type: String,
    default: ''
  },
  traslado: {
    type: String,
    default: 'NO',
    enum: ['SI', 'NO'],
    required: false
  },
  kmRecorrido: { 
    type: Number,
    default: 0
  },
  cumplimientoAgenda: { 
    type: Boolean,
    required: false,
    default: false
  },
 acordeObjetivo: { 
    type: Boolean,
    required: false,
    default: false
  }
});


module.exports = mongoose.model('Agenda', AgendaSchema);
