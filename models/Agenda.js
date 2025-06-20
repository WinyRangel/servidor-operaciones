const mongoose = require('mongoose');

const AgendaSchema = new mongoose.Schema({
  coordinador: { 
  type: mongoose.Schema.Types.ObjectId, 
  ref: 'Usuario', 
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
  hora: {
    type: String,
    required: false
  }, 
  domicilio: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Domicilio',
        required: false

  },
  actividad: {
    type: String,
    required: false
  },
  codigo: {
    type: String,
    required: false
  },
  codigoReportado: {
  type: String,
  required: false
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
    enum: ['SI', 'NO'],
    required: false
  },
  kmRecorrido: { 
    type: Number,
    default: 0
  },
  cumplimientoAgenda: { 
    type: Boolean,
    required: false
  }
});


module.exports = mongoose.model('Agenda', AgendaSchema);
