const AgendaAsesor = require('../models/AgendaAsesor');

// -------------------------------------------------------------
// Crear agenda
// -------------------------------------------------------------
const crearAgenda = async (req, res) => {
  try {
    const user = req.user; // viene del middleware

    // Datos enviados desde el frontend
    const data = req.body;

    // Sobrescribir forzosamente con el usuario logueado
    data.asesor = user.usuario; // nombre del asesor
    data.coordinacion = user.coordinacion; // id de la coordinación

    // Si traes evidencia por multer
    if (req.file) {
      data.evidencia = req.file.path;
    }

    const nuevaAgenda = new AgendaAsesor(data);
    await nuevaAgenda.save();

    res.status(201).json({
      ok: true,
      msg: "Agenda guardada correctamente",
      agenda: nuevaAgenda
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      ok: false,
      msg: 'Error al guardar agenda'
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

    // Obtener agenda
    const agenda = await AgendaAsesor.findById(id);

    if (!agenda) {
      return res.status(404).json({ ok: false, msg: "Agenda no encontrada" });
    }

    // REGLAS DE PERMISOS
    if (user.rol === "asesor") {
      // El asesor solo actualiza SU agenda
      if (agenda.asesor !== user.usuario) {
        return res.status(403).json({
          ok: false,
          msg: "No puedes modificar la agenda de otro asesor"
        });
      }

      // Bloquear campos que solo el coordinador puede actualizar
      delete data.validada;
      delete data.validadaPor;

    } else if (user.rol === "coordinador") {
      // Puede actualizar solo agendas de su coordinación
      if (agenda.coordinacion !== user.coordinacion) {
        return res.status(403).json({
          ok: false,
          msg: "No puedes modificar agendas de otra coordinación"
        });
      }

      // Si valida/rechaza, asigna quién la validó
      if (data.validada !== undefined) {
        data.validadaPor = user.usuario;
      }
    }

    // Si se subió evidencia nueva
    if (req.file) {
      data.evidencia = req.file.path;
    }

    const updated = await AgendaAsesor.findByIdAndUpdate(id, data, { new: true });

    res.json({
      ok: true,
      msg: "Agenda actualizada correctamente",
      agenda: updated
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, msg: "Error al actualizar agenda" });
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

module.exports = {
  crearAgenda,
  obtenerAgendas,
  obtenerAgendasCoordinador,
  actualizarAgenda,
  eliminarAgenda
};
