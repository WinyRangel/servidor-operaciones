const mongoose = require('mongoose');

const legalesSchema = new mongoose.Schema({
  coordinacion: { 
    type: String, 
    required: true 
  },
  gpoind: {
    type: String, 
    required: false 
  },
  fechaReportada: {
    type: Date,
    required: true
  },
  fechaEntrega: {
    type: Date,
    default: null 
  },
  registro: {
    type: Boolean,
    required: false,
    default: false
  }

});

module.exports = mongoose.model('Legales', legalesSchema);
