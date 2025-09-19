const XLSX = require('xlsx');
const Fichas = require('../models/Fichas');
const fs = require('fs');
const ExcelJS = require("exceljs");
const QuickChart = require("quickchart-js");

exports.saveBulk = async (req, res) => {
  try {
    const payload = req.body;
    if (!Array.isArray(payload)) {
      return res.status(400).json({ message: 'Se espera un arreglo de registros en el body.' });
    }

    // Normalizar y mapear
    const docs = payload.map((p) => {
      const fechaInicio = p.fechaInicio ? new Date(p.fechaInicio) : null;
      const fechaFin = p.fechaFin ? new Date(p.fechaFin) : null;
      const fechahora = p.fechahora ? new Date(p.fechahora) : null;

      return {
        semana: String(p.semana ?? ''),
        coordinacion: String(p.coordinacion ?? ''),
        asesor: String(p.asesor ?? ''),
        cliente: String(p.cliente ?? ''),
        diaAtencion: String(p.diaAtencion ?? ''),
        fechaInicio: isNaN(fechaInicio) ? null : fechaInicio,
        fechaFin: isNaN(fechaFin) ? null : fechaFin,
        estado: !!p.estado,
        fechahora: isNaN(fechahora) ? null : fechahora,
        tipopago: String(p.tipopago ?? ''),
        reportada: !!p.reportada,
        sheetName: String(p.sheetName ?? '')
      };
    });

    // Insert many (ordered:false para seguir insertando si una fila falla)
    const inserted = await Fichas.insertMany(docs, { ordered: false });

    return res.status(201).json({
      message: 'Registros guardados correctamente',
      inserted: inserted.length,
      docs: inserted
    });
  } catch (err) {
    console.error('Error en saveBulk:', err);
    // devolver detalles (sin exponer todo en producción)
    return res.status(500).json({ message: 'Error guardando registros', error: err.message });
  }
};

// Opcional: subir y parsear excel en el servidor (si lo necesitas)
exports.uploadAndParse = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió archivo' });

    const fullPath = req.file.path;
    const wb = XLSX.readFile(fullPath, { cellDates: true });
    const sheetNames = wb.SheetNames;
    const preview = {};

    sheetNames.forEach((name) => {
      const ws = wb.Sheets[name];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      preview[name] = aoa.slice(0, 50);
    });

    // opcional: fs.unlinkSync(fullPath);

    return res.status(200).json({ sheetNames, preview });
  } catch (err) {
    console.error('Error en uploadAndParse:', err);
    return res.status(500).json({ message: 'Error procesando archivo', error: err.message });
  }
};

// exports.getAllFichas = async (req, res) => {
//   try {
//     let query = {};

//     if (req.user.rol === 'asesor' || req.user.rol === 'coordinador') {
//       query.coordinacion = { $regex: new RegExp(`^${req.user.coordinacion.trim()}$`, 'i') };
//     }

//     console.log('Rol usuario:', req.user.rol);
//     console.log('Coordinacion usuario:', req.user.coordinacion);


//     const items = await Fichas.find(query).sort({ createdAt: -1 }).limit(2000);
//     res.status(200).json(items);
//   } catch (err) {
//     console.error('Error getAllFichas:', err);
//     res.status(500).json({ message: 'Error obteniendo fichas', error: err.message });
//   }
// };
exports.getAllFichas = async (req, res) => {
  try {
    let query = {};

    // Filtrado para asesores y coordinadores
    if (req.user.rol === 'asesor' || req.user.rol === 'coordinador') {
      query.coordinacion = req.user.coordinacion; // ID de la coordinación
      query.asesor = req.user.usuario; // nombre del asesor
    }

    console.log('Rol usuario:', req.user.rol);
    console.log('Coordinacion usuario:', req.user.coordinacion);
    console.log('Usuario:', req.user.usuario);

    const items = await Fichas.find(query).sort({ createdAt: -1 }).limit(2000);
    res.status(200).json(items);
  } catch (err) {
    console.error('Error getAllFichas:', err);
    res.status(500).json({ message: 'Error obteniendo fichas', error: err.message });
  }
};



exports.getFichasById = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Fichas.findById(id);
    if (!item) return res.status(404).json({ message: 'Ficha no encontrada' });

    if ((req.user.rol === 'asesor' || req.user.rol === 'coordinador') &&
        item.coordinacion !== req.user.coordinacion) {
      return res.status(403).json({ message: 'No tienes permiso para ver esta ficha' });
    }

    res.status(200).json(item);
  } catch (err) {
    console.error('Error getFichasById:', err);
    res.status(500).json({ message: 'Error obteniendo ficha', error: err.message });
  }
};


exports.updateFichas = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    // Validar fechas
    if (update.fechaInicio) update.fechaInicio = new Date(update.fechaInicio);
    if (update.fechaFin) update.fechaFin = new Date(update.fechaFin);
    if (update.fechahora) update.fechahora = new Date(update.fechahora);

    // Validar tipopago como array
    if (update.tipopago && !Array.isArray(update.tipopago)) {
      update.tipopago = [update.tipopago];
    }

    const ficha = await Fichas.findById(id);
    if (!ficha) return res.status(404).json({ message: 'Ficha no encontrada' });

    if ((req.user.rol === 'asesor' || req.user.rol === 'coordinador') &&
        ficha.coordinacion !== req.user.coordinacion) {
      return res.status(403).json({ message: 'No tienes permiso para actualizar esta ficha' });
    }

    const updated = await Fichas.findByIdAndUpdate(id, update, { new: true });
    res.status(200).json({ message: 'Ficha actualizada', doc: updated });
  } catch (err) {
    console.error('Error updateFichas:', err);
    res.status(500).json({ message: 'Error actualizando ficha', error: err.message });
  }
};



exports.deleteFichas = async (req, res) => {
  try {
    const { id } = req.params;
    const ficha = await Fichas.findById(id);
    if (!ficha) return res.status(404).json({ message: 'Ficha no encontrada para eliminar' });

    if ((req.user.rol === 'asesor' || req.user.rol === 'coordinador') &&
        ficha.coordinacion !== req.user.coordinacion) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta ficha' });
    }

    const deleted = await Fichas.findByIdAndDelete(id);
    res.status(200).json({ message: 'Ficha eliminada', doc: deleted });
  } catch (err) {
    console.error('Error deleteFichas:', err);
    res.status(500).json({ message: 'Error eliminando ficha', error: err.message });
  }
};



