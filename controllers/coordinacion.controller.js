const Coordinacion = require('../models/Coordinacion');

// Obtener todas las coordinaciones
exports.obtenerCoordinacion = async (req, res) => {
  try {
    const coordinaciones = await Coordinacion.find({}, {
      nombre: 1,
      municipio: 1,
      coordinador: 1,
      coche: 1,
      rendimiento: 1,
      'ejecutivas.nombre': 1
    });

    res.json(coordinaciones);
  } catch (error) {
    console.log(error);
    res.status(500).send('Error');
  }
};

// Crear una coordinación
exports.crearCoordinacion = async (req, res) => {
  try {
    const { nombre, municipio, ejecutivas, coordinador, coche, rendimiento } = req.body;

    const nuevaCoordinacion = new Coordinacion({
      nombre,
      municipio,
      ejecutivas,
      coordinador,
      coche,
      rendimiento
    });

    await nuevaCoordinacion.save();

    res.status(201).json({
      mensaje: 'Coordinación creada exitosamente',
      data: nuevaCoordinacion
    });

  } catch (error) {
    console.error('Error al crear coordinación:', error);
    res.status(500).json({ mensaje: 'Error al crear coordinación', error });
  }
};
