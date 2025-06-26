// controllers/proyeccion.controller.js
const Proyeccion = require('../models/Proyeccion');

// CREATE Bulk insert
exports.saveProyecciones = async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No se enviaron datos' });
    }

    const normalizados = items.map(item => {
      const toDateOrNull = val => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      return {
        coordinacion: (item.coordinacion != null ? String(item.coordinacion).trim() : '').trim() || '-', 
        asesor: (item.asesor != null ? String(item.asesor).trim() : '').trim() || '-',
        cliente: (item.cliente != null ? String(item.cliente).trim() : '').trim() || '-',
        fechaEntregaAgendadaOpe: toDateOrNull(item.fechaEntregaAgendadaOpe),
        fechaEntregaAgendada: toDateOrNull(item.fechaEntregaAgendada),
        fechaEnvioOperativo: toDateOrNull(item.fechaEnvioOperativo),
        hora: (item.hora != null ? String(item.hora).trim() : '').trim() || '-',
        diasRetrasoExpOp: (item.diasRetrasoExpOp != null && !isNaN(Number(item.diasRetrasoExpOp)))
                          ? Number(item.diasRetrasoExpOp)
                          : 0,
        incidenciasOperativo: (item.incidenciasOperativo != null ? String(item.incidenciasOperativo).trim() : '').trim() || '-',
        fechaLimiteEntrega: toDateOrNull(item.fechaLimiteEntrega),
        fechaRealReciboExpLegal: toDateOrNull(item.fechaRealReciboExpLegal),
        renovado: item.renovado === true,
        refil: (item.refil != null ? String(item.refil).trim() : '').trim() || '',
        mes: (item.mes != null ? String(item.mes).trim() : '').trim() || ''
      };
    });

    const docs = await Proyeccion.insertMany(normalizados);
    res.status(201).json({ inserted: docs.length, docs });
  } catch (err) {
    console.error('Error en saveProyecciones:', err);
    res.status(500).json({ message: 'Error al guardar proyecciones', error: err.message });
  }
};

// READ all
exports.getAllProyecciones = async (req, res) => {
  try {
    const list = await Proyeccion.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error('Error en getAllProyecciones:', err);
    res.status(500).json({ message: 'Error al obtener proyecciones', error: err.message });
  }
};

// READ one by ID
exports.getProyeccionById = async (req, res) => {
  try {
    const doc = await Proyeccion.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json(doc);
  } catch (err) {
    console.error('Error en getProyeccionById:', err);
    res.status(500).json({ message: 'Error al obtener la proyección', error: err.message });
  }
};

// UPDATE one by ID
exports.updateProyeccion = async (req, res) => {
  try {
    const item = req.body;
    const toDateOrNull = val => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const updateObj = {};
    if (item.coordinacion !== undefined) {
      updateObj.coordinacion = String(item.coordinacion).trim() || '-';
    }
    if (item.asesor !== undefined) {
      updateObj.asesor = String(item.asesor).trim() || '-';
    }
    if (item.cliente !== undefined) {
      updateObj.cliente = String(item.cliente).trim() || '-';
    }
    if (item.fechaEntregaAgendadaOpe !== undefined) {
      updateObj.fechaEntregaAgendadaOpe = toDateOrNull(item.fechaEntregaAgendadaOpe);
    }
    if (item.fechaEntregaAgendada !== undefined) {
      updateObj.fechaEntregaAgendada = toDateOrNull(item.fechaEntregaAgendada);
    }
    if (item.fechaEnvioOperativo !== undefined) {
      updateObj.fechaEnvioOperativo = toDateOrNull(item.fechaEnvioOperativo);
    }
    if (item.hora !== undefined) {
      updateObj.hora = String(item.hora).trim() || '-';
    }
    if (item.diasRetrasoExpOp !== undefined) {
      updateObj.diasRetrasoExpOp = !isNaN(Number(item.diasRetrasoExpOp)) ? Number(item.diasRetrasoExpOp) : 0;
    }
    if (item.incidenciasOperativo !== undefined) {
      updateObj.incidenciasOperativo = String(item.incidenciasOperativo).trim() || '-';
    }
    if (item.fechaLimiteEntrega !== undefined) {
      updateObj.fechaLimiteEntrega = toDateOrNull(item.fechaLimiteEntrega);
    }
    if (item.fechaRealReciboExpLegal !== undefined) {
      updateObj.fechaRealReciboExpLegal = toDateOrNull(item.fechaRealReciboExpLegal);
    }
    if (item.renovado !== undefined) {
      updateObj.renovado = item.renovado === true;
    }
    if (item.refil !== undefined) {
      updateObj.refil = String(item.refil).trim() || '';
    }

    const updated = await Proyeccion.findByIdAndUpdate(
      req.params.id,
      updateObj,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'No encontrado para actualizar' });
    res.json(updated);
  } catch (err) {
    console.error('Error en updateProyeccion:', err);
    res.status(500).json({ message: 'Error al actualizar la proyección', error: err.message });
  }
};

// DELETE one by ID
exports.deleteProyeccion = async (req, res) => {
  try {
    const deleted = await Proyeccion.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'No encontrado para eliminar' });
    res.json({ message: 'Eliminado correctamente' });
  } catch (err) {
    console.error('Error en deleteProyeccion:', err);
    res.status(500).json({ message: 'Error al eliminar la proyección', error: err.message });
  }
};
