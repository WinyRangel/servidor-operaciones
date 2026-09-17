const mongoose = require('mongoose');

const AgendaAdminSchema = new mongoose.Schema({
    usuario: {
        type: String,
        required: false,
        default: ''
    },
    nombre: {
        type: String,
        required: false,
        default: ''
    },
    rol: {
        type: String,
        required: false,
        default: ''
    },
    semana: {
        type: String,
        required: true
    },
    fecha: {
        type: Date,
        required: true
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
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('AgendaAdmin', AgendaAdminSchema);
