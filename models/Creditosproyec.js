const mongoose = require('mongoose');

const CreditoProyeccionSchema = new mongoose.Schema({
  coordinador: { type: String, required: true },
  mesArchivo:   { type: String, required: true },
  fechaEntrega: { type: Date,   required: true },
  concepto:     { type: String, required: true },
  proyectada:   { type: Number, required: true },
  colocacion:   { type: Number, required: true },
  diferencia:   { type: Number, required: true },
}, { timestamps: true });


module.exports = mongoose.model('CreditosProyeccion', CreditoProyeccionSchema);
