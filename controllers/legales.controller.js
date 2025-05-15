const Legales = require('../models/Legales');

const obtenerLegales = async (req, res) => {
    try {
        const legales = await Legales.find()
        .populate('coordinacion', 'coordinacion') 
        .sort({ fechaReportada: -1 });
        res.status(200).json(legales);
    } catch (error) {
        console.error('Error al obtener los legales:', error);
        res.status(500).json({ mensaje: 'Error al obtener los legales' });
    }
    }

const crearLegales = async (req, res) => {
    try {
    const { coordinacion, gpoind, fechaReportada, fechaEntrega, registro } = req.body;

    // Crear un nuevo documento de Legales
    const nuevoLegal = new Legales({
    coordinacion,
    gpoind,
    fechaReportada,
    fechaEntrega,
    registro: registro, 
    ...(typeof registro !== 'undefined' && { registro })
    });
    if (req.body.fechaEntrega === '' || !req.body.fechaEntrega) {
        req.body.fechaEntrega = null;
    }


    // Guardar en la base de datos
    const legalGuardado = await nuevoLegal.save();
    console.log(req.body);
    res.status(201).json(legalGuardado);
    } catch (error) {
    console.error('Error al crear el registro legal:', error);
    res.status(500).json({ mensaje: 'Error al crear el registro legal' });
    }
};

const eliminarLegal = async (req, res) => {
    try {
        const { id } = req.params;

        // Eliminar el registro de la base de datos
        const result = await Legales.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ mensaje: 'Registro no encontrado' });
        }

        // Si la eliminación es exitosa
        res.status(200).json({ mensaje: 'Registro eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar el registro legal:', error);
        res.status(500).json({ mensaje: 'Error al eliminar el registro legal' });
    }
};

const actualizarLegal = async (req, res) => {

    try {
        const { coordinacion, gpoind, fechaReportada, fechaEntrega, registro } = req.body;
        let rlegales = await Legales.findById(req.params.id);

        if(!rlegales){ {
            res.status(404).json({ msg: 'No existe' })
        }
        }
        rlegales.coordinacion = coordinacion;
        rlegales.gpoind = gpoind;
        rlegales.fechaReportada = fechaReportada;
        rlegales.fechaEntrega = fechaEntrega;
        rlegales.registro = registro;
        
        rlegales = await Legales.findOneAndUpdate({ _id: req.params.id },rlegales, { new: true} )
        res.json(rlegales);

        } catch (error) {
        console.log(error);
        res.status(500).send('Hubo un error');
        }
    }

module.exports = {
    obtenerLegales,
    crearLegales,
    eliminarLegal,
    actualizarLegal
};
