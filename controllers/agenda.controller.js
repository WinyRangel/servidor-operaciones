const Agenda = require ('../models/Agenda');
const Domicilio = require('../models/Domicilio'); // ajusta la ruta si es necesario


  const registrarAgenda = async (req, res) => {
    try {
      const { domicilio, ...datosAgenda } = req.body;

      // Si viene un domicilio, guárdalo en su propio modelo
      let domicilioGuardado = null;
      if (domicilio) {
        const nuevoDomicilio = new Domicilio({ nombre: domicilio });
        domicilioGuardado = await nuevoDomicilio.save();
      }

      // Guarda la agenda
      const nuevaAgenda = new Agenda({
        ...datosAgenda,
        domicilio: domicilioGuardado ? domicilioGuardado._id : undefined // guarda la referencia si existe
      });

      const agendaGuardada = await nuevaAgenda.save();

      res.status(201).json({
        mensaje: 'Agenda y domicilio registrados correctamente',
        agenda: agendaGuardada,
        domicilio: domicilioGuardado
      });

    } catch (error) {
      console.error('Error al crear agenda y domicilio:', error);
      res.status(500).json({ mensaje: 'Hubo un error al crear la agenda y domicilio' });
    }
  };

  const obtenerDomicilios = async (req, res) => {
  try {
    const domicilios = await Domicilio.find().sort({ nombre: 1 }); // opcional: ordena alfabéticamente
    res.status(200).json(domicilios);
  } catch (error) {
    console.error('Error al obtener domicilios:', error);
    res.status(500).json({ mensaje: 'Hubo un error al obtener los domicilios' });
  }
};



// Controlador para obtener todos los bauchers
const obtenerAgenda = async (req, res) => {
  try {
    const agendas = await Agenda.find()
      .populate('domicilio')
      .sort({ fecha: 1, hora: 1 }); // fecha descendente, luego hora descendente

    res.status(200).json(agendas);
  } catch (error) {
    console.error('Error al obtener agendas:', error);
    res.status(500).json({ mensaje: 'Hubo un error al obtener las agendas' });
  }
};





// Controlador para obtener agendas por coordinador
const obtenerAgendasPorCoordinador = async (req, res) => {
    const { coordinador } = req.params; // o req.query si usas ?coordinador=Ismael

    try {
        const agendas = await Agenda.find({ coordinador });

        if (agendas.length === 0) {
            return res.status(404).json({ mensaje: `No se encontraron agendas para el coordinador ${coordinador}` });
        }

        res.json(agendas);
    } catch (error) {
        console.error('Error al obtener agendas por coordinador:', error);
        res.status(500).json({ mensaje: 'Error al obtener las agendas' });
    }
};

const actualizarAgenda = async (req, res) => {
    console.info('Seguimiento Agenda');

    try {
        const { id } = req.params;
        const { codigo, actividadReportada, reportado, horaReporte, horaCierre, cumplimientoAgenda } = req.body;

        const agendaActualizada = await Agenda.findByIdAndUpdate(
            id,
            { codigo, actividadReportada, reportado, horaReporte, horaCierre, cumplimientoAgenda },
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




module.exports = {
    registrarAgenda,
    obtenerAgenda,
    obtenerAgendasPorCoordinador,
    actualizarAgenda,
    obtenerDomicilios
}


/**
 * const actualizarKmRecorridoSemana = async (req, res) => {
    try {
      const resumen = await Agenda.aggregate([
        {
          $group: {
            _id: { coordinador: "$coordinador", semana: "$semana" },
            totalKm: { $sum: "$kmRecorrido" }
          }
        }
      ]);
  
      for (const grupo of resumen) {
        await Agenda.updateMany(
          {
            coordinador: grupo._id.coordinador,
            semana: grupo._id.semana
          },
          {
            $set: { kmRecorridoSemana: grupo.totalKm }
          }
        );
      }
  
      res.json({ mensaje: 'Kilómetros por semana actualizados correctamente' });
    } catch (error) {
      console.error("Error al actualizar los km recorridos por semana:", error);
      res.status(500).json({ mensaje: 'Error al actualizar los kilómetros' });
    }
  };
  
 * 
 */