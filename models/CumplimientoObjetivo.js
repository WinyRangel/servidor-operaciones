const mongoose = require('mongoose');
const { Schema } = mongoose;

const CumplimientoObjetivoSchema = new Schema({
  coordinador:      { type: String, required: true },
  semana:           { type: String, required: true },
  fechaRegistro:    { type: Date, default: Date.now },

  // Mora
  moraInicial:      { type: Number, required: true },
  moraFinal:        { type: Number, required: true },

  // Meta Mora
  gpoindm:          { type: String },
  metaM:            { type: Number },
  recupM:           { type: Number },

  // Fichas
  fichasCerrar:     { type: Number },
  fichasFaltantes:  { type: Number },
  fichasCerradas:   { type: Number },

  // Créditos / GPO/IND
  gpoindInicial:    { type: Number },
  gpoindFinal:      { type: Number },
  metaGpo:          { type: Number },
  completadoGpo:    { type: Number },
  metaInd:          { type: Number },
  completadoInd:    { type: Number },

  // Renovaciones
  gpoindProyectado: { type: Number },
  gpoindRenovado:   { type: Number },
  metaProyec:       { type: Number },
  completadosProyec:{ type: Number }
});

module.exports = mongoose.model('CumplimientoObjetivo', CumplimientoObjetivoSchema);
