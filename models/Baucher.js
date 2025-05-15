const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const baucherSchema = new mongoose.Schema({
  coordinacion: { 
    type: Schema.Types.ObjectId, 
    ref: 'Coordinacion', // ← Aquí le dices de qué colección viene
    required: true 
  },
  ejecutiva: { 
    type: String, // O un objeto si prefieres
    required: false 
  },
  coordinador: { 
    type: String, // O un objeto si prefieres
    required: false 
  },
  fechaBaucher: {
    type: Date,
    required: false
  },
  fechaReporte: {
    type: Date,
    required: true
  },
  diasDiferencia: {
    type: Number,
    required: false
  },
  grupo: {
    type: String,
    required: false
  },
  concepto: {
    type: String,
    required: false
  },
  titular: {
    type: String,
    required: false
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
  
});

module.exports = mongoose.model('Baucher', baucherSchema);
