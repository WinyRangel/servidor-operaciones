const AgendaAsesor = require('../models/AgendaAsesor');
const Usuario = require('../models/Usuario');

// -------------------------------------------------------------
// Crear agenda 
// -------------------------------------------------------------
const crearAgenda = async (req, res) => {
  try {
    const user = req.user;

    const {
      semana,
      fecha,
      objetivo,
      hora,
      domicilio,
      actividad,
      codigo,
      acordeObjetivo
    } = req.body;

    const nuevaAgenda = new AgendaAsesor({
      asesor: user.usuario,
      coordinacion: user.coordinacion,
      semana,
      fecha,
      objetivo,
      hora,
      domicilio,
      actividad,
      codigo,
      acordeObjetivo
    });

    await nuevaAgenda.save();

    res.status(201).json({
      ok: true,
      msg: 'Actividad registrada correctamente',
      agenda: nuevaAgenda
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: 'Error al registrar la actividad'
    });
  }
};


// -------------------------------------------------------------
// Obtener todas las agendas
// -------------------------------------------------------------
const obtenerAgendas = async (req, res) => {
  try {
    const user = req.user; // viene del middleware

    let agendas;

    // Si es asesor → solo su agenda
    if (user.rol === "asesor") {
      agendas = await AgendaAsesor.find({ asesor: user.usuario })
        .sort({ fecha: -1 });

      // Si es coordinador → todas las agendas de su coordinación
    } else if (user.rol === "coordinador") {
      agendas = await AgendaAsesor.find({ coordinacion: user.coordinacion })
        .sort({ fecha: -1 });

    } else {
      return res.status(403).json({
        ok: false,
        msg: "No tienes permisos para ver agendas"
      });
    }

    res.json({
      ok: true,
      agendas
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: "Error al obtener agendas" });
  }
};


// -------------------------------------------------------------
// Obtener agendas por coordinador (dashboard del coordinador)
// -------------------------------------------------------------
const obtenerAgendasCoordinador = async (req, res) => {
  try {
    const user = req.user;

    if (user.rol !== "coordinador") {
      return res.status(403).json({
        ok: false,
        msg: "No tienes permisos para ver agendas de coordinador"
      });
    }

    const agendas = await AgendaAsesor.find({
      coordinacion: user.coordinacion
    }).sort({ fecha: -1 });

    res.json({
      ok: true,
      agendas
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: "Error al obtener agendas por coordinador" });
  }
};


// -------------------------------------------------------------
// Actualizar agenda
// -------------------------------------------------------------
const actualizarAgenda = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const data = req.body;

    const agenda = await AgendaAsesor.findById(id);

    if (!agenda) {
      return res.status(404).json({ ok: false, msg: 'Agenda no encontrada' });
    }

    // -----------------------------
    // ASESOR
    // -----------------------------
    if (user.rol === 'asesor') {
      if (agenda.asesor !== user.usuario) {
        return res.status(403).json({
          ok: false,
          msg: 'No puedes modificar agendas de otro asesor'
        });
      }

      // SOLO puede actualizar resultado y evidencia
      const allowedFields = ['resultado'];
      const updateData = {};

      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      });

      if (req.file) {
        updateData.evidencia = req.file.path;
      }

      const updated = await AgendaAsesor.findByIdAndUpdate(id, updateData, { new: true });

      return res.json({
        ok: true,
        msg: 'Agenda actualizada correctamente',
        agenda: updated
      });
    }

    // -----------------------------
    // COORDINADOR
    // -----------------------------
    if (user.rol === 'coordinador') {
      if (agenda.coordinacion !== user.coordinacion) {
        return res.status(403).json({
          ok: false,
          msg: 'No puedes modificar agendas de otra coordinación'
        });
      }

      const updateData = {};

      if (data.validada !== undefined) {
        updateData.validada = data.validada;
        updateData.validadaPor = user.usuario;
      }

      if (data.resultado !== undefined) {
        updateData.resultado = data.resultado;
      }

      const updated = await AgendaAsesor.findByIdAndUpdate(id, updateData, { new: true });

      return res.json({
        ok: true,
        msg: 'Agenda validada correctamente',
        agenda: updated
      });
    }

    res.status(403).json({ ok: false, msg: 'Rol no autorizado' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: 'Error al actualizar agenda' });
  }
};

const validarAgenda = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const agenda = await AgendaAsesor.findById(id);
    if (!agenda) {
      return res.status(404).json({ ok: false, msg: "Agenda no encontrada" });
    }

    // REGLAS
    if (user.rol === "coordinador") {
      if (agenda.coordinacion !== user.coordinacion) {
        return res.status(403).json({ ok: false, msg: "No puedes validar agendas de otra coordinación" });
      }
    }

    const updateData = {
      validada: true,
      validadaPor: user.usuario
    };

    const updated = await AgendaAsesor.findByIdAndUpdate(id, updateData, { new: true });

    return res.json({
      ok: true,
      msg: 'Agenda validada correctamente',
      agenda: updated
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: 'Error al validar agenda' });
  }
};

// -------------------------------------------------------------
// Eliminar agenda
// -------------------------------------------------------------
const eliminarAgenda = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const agenda = await AgendaAsesor.findById(id);
    if (!agenda) {
      return res.status(404).json({ ok: false, msg: "Agenda no encontrada" });
    }

    // REGLAS
    if (user.rol === "asesor") {
      if (agenda.asesor !== user.usuario) {
        return res.status(403).json({ ok: false, msg: "No puedes borrar agendas de otros asesores" });
      }
    } else if (user.rol === "coordinador") {
      if (agenda.coordinacion !== user.coordinacion) {
        return res.status(403).json({ ok: false, msg: "No puedes borrar agendas de otra coordinación" });
      }
    }

    await AgendaAsesor.findByIdAndDelete(id);

    res.json({
      ok: true,
      msg: "Agenda eliminada correctamente"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: "Error al eliminar agenda" });
  }
};

const obtenerAsesoresPorCoordinacion = async (req, res) => {
  try {
    const user = req.user;

    if (user.rol !== 'coordinador') {
      return res.status(403).json({
        ok: false,
        msg: 'No autorizado'
      });
    }

    const asesores = await Usuario.find({
      rol: 'asesor',
      coordinacion: user.coordinacion
    }).select('usuario coordinacion');

    res.json({
      ok: true,
      asesores
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: 'Error al obtener asesores'
    });
  }
};



module.exports = {
  crearAgenda,
  obtenerAgendas,
  obtenerAgendasCoordinador,
  actualizarAgenda,
  eliminarAgenda,
  obtenerAsesoresPorCoordinacion,
  validarAgenda
};
