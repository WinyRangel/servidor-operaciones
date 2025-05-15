const Coordinacion = require('../models/Coordinacion');

// Controlador para obtener todos los bauchers
exports.obtenerCoordinacion = async (req, res)=>{
    try{
        const coordinaciones = await Coordinacion.find({}, {
            nombre: 1,
            municipio: 1,
            'coordinador.nombre': 1,
            'ejecutivas.nombre': 1
          });
          
        res.json(coordinaciones)
    } catch(error){
        console.log(error);
        res.status(500).send('Error')
    }
}

exports.crearCoordinacion = async (req, res) => {
  try {
    const { nombre, municipio, ejecutivas, coordinador } = req.body;

    // Crear nuevo documento
    const nuevaCoordinacion = new Coordinacion({
      nombre,
      municipio,
      ejecutivas,
      coordinador
    });

    // Guardar en la base de datos
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