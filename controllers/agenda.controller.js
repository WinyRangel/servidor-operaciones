const Agenda = require ('../models/Agenda');


  const registrarAgenda = async (req, res) => {
    try {
      const { ...datosAgenda } = req.body;


      const nuevaAgenda = new Agenda({
        ...datosAgenda
      });

      const agendaGuardada = await nuevaAgenda.save();

      res.status(201).json({
        mensaje: 'Agenda registrada correctamente',
        agenda: agendaGuardada,
      });

    } catch (error) {
      console.error('Error al crear agenda y domicilio:', error);
      res.status(500).json({ mensaje: 'Hubo un error al crear la agenda y domicilio' });
    }
  };

  // Controlador para obtener todas las agendas
  const obtenerAgendas1 = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 315;
      const skip = (page - 1) * limit;

      const projection = {
        _id: 1,
        semana: 1, 
        coordinador:1,
        fecha: 1,
        hora: 1,
        actividad: 1,
        codigo:1,
        codigoReportado: 1,
        actividadReportada: 1,
        reportado: 1,
        horaReporte: 1,
        horaCierre: 1,
        kmRecorrido: 1,
        cumplimientoAgenda: 1,
        domicilio: 1
      };

      const [agendas, total] = await Promise.all([
        Agenda.find({}, projection)
          .sort({ fecha: 1, hora: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
          
        Agenda.countDocuments()
      ]);

      res.status(200).json({
        agendas,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      });
    } catch (error) {
      console.error('Error al obtener agendas:', error);
      res.status(500).json({ mensaje: 'Hubo un error al obtener las agendas' });
    }
  };

  // Controlador para obtener todos los bauchers
  const obtenerAgenda = async (req, res) => {
    try {
      const agendas = await Agenda.find()
        .sort({ fecha: 1, hora: 1 }); // fecha descendente, luego hora descendente

      res.status(200).json(agendas);
    } catch (error) {
      console.error('Error al obtener agendas:', error);
      res.status(500).json({ mensaje: 'Hubo un error al obtener las agendas' });
    }
  };


  const actualizarAgenda = async (req, res) => {
      console.info('Seguimiento Agenda');

      try {
          const { id } = req.params;
          const { fecha, hora, domicilio, codigo, codigoReportado, actividadReportada, reportado, horaReporte, horaCierre, cumplimientoAgenda, kmRecorrido, acordeObjetivo } = req.body;

          const agendaActualizada = await Agenda.findByIdAndUpdate(
              id,
              { fecha, hora, domicilio, codigo, codigoReportado, actividadReportada, reportado, horaReporte, horaCierre, cumplimientoAgenda, kmRecorrido, acordeObjetivo },
              { new: true }
          );

          if (!agendaActualizada) {
              return res.status(404).json({ msg: 'No se ha registrado esta agenda.' });
          }

          res.json(agendaActualizada);
      } catch (error) {
          console.error('Error al actualizar la agenda:', error);
          res.status(500).send('Hubo un error');
      }
  };

  const eliminarAgenda = async (req, res) => {
    try {
      const { id } = req.params;

      // Buscar la agenda por ID
      const agenda = await Agenda.findById(id);

      if (!agenda) {
        return res.status(404).json({ mensaje: 'Agenda no encontrada' });
      }

      // Eliminar la agenda
      await Agenda.findByIdAndDelete(id);

      res.status(200).json({ mensaje: 'Agenda eliminada correctamente' });
    } catch (error) {
      console.error('Error al eliminar la agenda:', error);
      res.status(500).json({ mensaje: 'Hubo un error al eliminar la agenda' });
    }
  };



module.exports = {
    registrarAgenda,
    obtenerAgenda,
    actualizarAgenda,
    eliminarAgenda,
    obtenerAgendas1
}

