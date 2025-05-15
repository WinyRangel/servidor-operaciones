const { Schema, model } = require('mongoose');

const DepositosSchema = new Schema({
    coordinacion: { type: String, required: false },
    nombre: { type: String, required: false },
    horaReporte: { type: String, required: false },
    fechaReporte: { type: String, required: false }
});

module.exports = model('Depositos', DepositosSchema);