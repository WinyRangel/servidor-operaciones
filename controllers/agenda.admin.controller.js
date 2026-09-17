const AgendaAdmin = require('../models/AgendaAdmin');
const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const { enviarNotificacionAgenda, enviarResumenAgendaEmail } = require('../config/mailer');

const SECRET_KEY = '123VAM!!'; // Misma clave secreta de autenticación
const ROLES_PERMITIDOS = ['admin', 'sup', 'mercadotecnia', 'auditoria', 'rh'];

// Función auxiliar para extraer datos del usuario autenticado (desde req.user, JWT header o body)
const obtenerUsuarioYRol = (req) => {
    let usuario = req.body?.usuario || req.body?.asesor || '';
    let nombre = req.body?.nombre || '';
    let rol = req.body?.rol || '';

    // 1. Si ya pasó por middleware verifyToken
    if (req.user) {
        usuario = req.user.usuario || usuario;
        nombre = req.user.nombre || nombre;
        rol = req.user.rol || rol;
        return { usuario, nombre, rol };
    }

    // 2. Si viene token en Authorization header: Bearer <token>
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, SECRET_KEY);
                usuario = decoded.usuario || usuario;
                nombre = decoded.nombre || nombre;
                rol = decoded.rol || rol;
            } catch (err) {
                // Token no válido o expirado, se usará lo recibido en el body
            }
        }
    }

    if (!nombre && req.body?.nombre) {
        nombre = req.body.nombre;
    }

    return { usuario, nombre, rol };
};

// =========================================================================
// Crear agenda (Permite a mercadotecnia, auditoria, rh, admin y sup)
// =========================================================================
exports.crearAgendaAdmin = async (req, res) => {
    try {
        const { usuario: userLogin, nombre: userNombre, rol: userRol } = obtenerUsuarioYRol(req);
        const rolNormalizado = (userRol || '').toLowerCase().trim();

        // Validar permisos de rol
        if (rolNormalizado && !ROLES_PERMITIDOS.includes(rolNormalizado)) {
            return res.status(403).json({
                success: false,
                message: `El rol '${userRol}' no tiene autorización para registrar agendas administrativas. Roles permitidos: ${ROLES_PERMITIDOS.join(', ')}`
            });
        }

        // Obtener el nombre real del usuario si no venía en el token
        let nombreFinal = userNombre || '';
        if (!nombreFinal && userLogin) {
            const u = await Usuario.findOne({ usuario: new RegExp(`^${userLogin}$`, 'i') });
            if (u && u.nombre) nombreFinal = u.nombre;
        }
        if (!nombreFinal) nombreFinal = userLogin;

        // 1. Soporte para inserción masiva (array de actividades)
        if (Array.isArray(req.body.actividades) && req.body.actividades.length > 0) {
            const { semana, fecha } = req.body;

            const documentos = req.body.actividades.map(act => ({
                usuario: userLogin,
                nombre: act.nombre || nombreFinal,
                rol: rolNormalizado,
                semana: act.semana || semana,
                fecha: act.fecha || fecha,
                hora: act.hora || '',
                domicilio: act.domicilio || '',
                actividad: act.actividad || ''
            }));

            const guardadas = await AgendaAdmin.insertMany(documentos);

            return res.status(201).json({
                success: true,
                message: `Se registraron ${guardadas.length} actividad(es) exitosamente`,
                data: guardadas
            });
        }

        // 2. Soporte para inserción individual
        const { semana, fecha, hora, domicilio, actividad, nombre } = req.body;

        if (!semana || !fecha) {
            return res.status(400).json({
                success: false,
                message: 'La semana y la fecha son campos requeridos'
            });
        }

        const nuevaAgenda = new AgendaAdmin({
            usuario: userLogin,
            nombre: nombre || nombreFinal,
            rol: rolNormalizado,
            semana,
            fecha,
            hora: hora || '',
            domicilio: domicilio || '',
            actividad: actividad || ''
        });

        await nuevaAgenda.save();

        res.status(201).json({
            success: true,
            message: 'Actividad registrada correctamente',
            data: nuevaAgenda
        });

    } catch (error) {
        console.error('Error al crear agenda admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar la agenda',
            error: error.message
        });
    }
};

// =========================================================================
// Obtener agendas (Con filtros por usuario, rol, semana y fecha)
// =========================================================================
exports.obtenerAgendasAdmin = async (req, res) => {
    try {
        const { usuario: userNombre, rol: userRol } = obtenerUsuarioYRol(req);
        const { usuario, rol, semana, fecha } = req.query;

        const filtro = {};

        // Filtro por usuario específico
        if (usuario) {
            filtro.usuario = new RegExp(`^${usuario}$`, 'i');
        }

        // Filtro por rol específico
        if (rol) {
            filtro.rol = rol.toLowerCase().trim();
        }

        // Si el usuario que consulta es mercadotecnia, auditoria o rh (y no es admin/sup)
        // y no se filtró expresamente por otro rol/usuario, restringir a sus registros o a su rol
        const rolConsultante = (userRol || '').toLowerCase().trim();
        if (['mercadotecnia', 'auditoria', 'rh'].includes(rolConsultante)) {
            if (!filtro.rol && !filtro.usuario) {
                // Por defecto muestra las agendas de su mismo rol/departamento
                filtro.rol = rolConsultante;
            }
        }

        // Filtro por semana
        if (semana) {
            filtro.semana = semana;
        }

        // Filtro por fecha exacta
        if (fecha) {
            const fechaBusqueda = new Date(fecha);
            const diaSiguiente = new Date(fecha);
            diaSiguiente.setDate(diaSiguiente.getDate() + 1);

            filtro.fecha = {
                $gte: fechaBusqueda,
                $lt: diaSiguiente
            };
        }

        const agendas = await AgendaAdmin.find(filtro).sort({ fecha: -1, hora: 1, createdAt: -1 }).lean();

        // Enriquecer registros anteriores que no tengan guardado el campo nombre
        const usuarios = await Usuario.find({}, 'usuario nombre').lean();
        const mapaNombres = new Map(usuarios.map(u => [(u.usuario || '').toLowerCase(), u.nombre || u.usuario]));

        const agendasConNombre = agendas.map(ag => ({
            ...ag,
            nombre: ag.nombre || mapaNombres.get((ag.usuario || '').toLowerCase()) || ag.usuario || 'Sin asignar'
        }));

        res.status(200).json({
            success: true,
            total: agendasConNombre.length,
            data: agendasConNombre
        });
    } catch (error) {
        console.error('Error al obtener agendas admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error al consultar las agendas',
            error: error.message
        });
    }
};

// =========================================================================
// Actualizar agenda
// =========================================================================
exports.actualizarAgendaAdmin = async (req, res) => {
    try {
        const { semana, fecha, hora, domicilio, actividad, usuario, rol } = req.body;
        const agenda = await AgendaAdmin.findById(req.params.id);

        if (!agenda) {
            return res.status(404).json({
                success: false,
                message: 'Agenda no encontrada'
            });
        }

        if (semana !== undefined) agenda.semana = semana;
        if (fecha !== undefined) agenda.fecha = fecha;
        if (hora !== undefined) agenda.hora = hora;
        if (domicilio !== undefined) agenda.domicilio = domicilio;
        if (actividad !== undefined) agenda.actividad = actividad;
        if (usuario !== undefined) agenda.usuario = usuario;
        if (rol !== undefined) agenda.rol = rol.toLowerCase().trim();

        await agenda.save();

        res.status(200).json({
            success: true,
            message: 'Agenda actualizada correctamente',
            data: agenda
        });
    } catch (error) {
        console.error('Error al actualizar agenda admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la agenda',
            error: error.message
        });
    }
};

// =========================================================================
// Eliminar agenda
// =========================================================================
// =========================================================================
// Enviar resumen de agenda por correo (manual, con rango de fechas)
// =========================================================================
exports.enviarResumenAgenda = async (req, res) => {
    try {
        const { fechaInicio, fechaFin, rol } = req.body;

        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren fechaInicio y fechaFin para enviar el resumen.'
            });
        }

        // Construir rango de fechas considerando inicio y fin del día
        const inicioStr = fechaInicio.toString().substring(0, 10);
        const finStr = fechaFin.toString().substring(0, 10);

        const fechaMin = new Date(`${inicioStr}T00:00:00.000Z`);
        const fechaMax = new Date(`${finStr}T23:59:59.999Z`);

        const filtro = {
            fecha: {
                $gte: fechaMin,
                $lte: fechaMax
            }
        };

        // Filtrar por rol
        const rolesNotificar = ['auditoria', 'mercadotecnia', 'rh'];
        if (rol && rolesNotificar.includes(rol.toLowerCase().trim())) {
            filtro.rol = new RegExp(`^${rol.trim()}$`, 'i');
        } else {
            filtro.rol = { $in: [/auditoria/i, /mercadotecnia/i, /^rh$/i] };
        }

        const agendas = await AgendaAdmin.find(filtro).sort({ fecha: 1, hora: 1 }).lean();

        if (agendas.length === 0) {
            return res.status(200).json({
                success: false,
                message: 'No se encontraron actividades en el rango de fechas seleccionado para los roles correspondientes (Auditoría, Mercadotecnia y RH).'
            });
        }

        // Enriquecer registros con nombre real de usuario
        const usuarios = await Usuario.find({}, 'usuario nombre').lean();
        const mapaNombres = new Map(usuarios.map(u => [(u.usuario || '').toLowerCase(), u.nombre || u.usuario]));

        const agendasConNombre = agendas.map(ag => ({
            ...ag,
            nombre: ag.nombre || mapaNombres.get((ag.usuario || '').toLowerCase()) || ag.usuario || 'Sin asignar'
        }));

        // Enviar por correo utilizando el helper
        await enviarResumenAgendaEmail(agendasConNombre, fechaInicio, fechaFin);

        res.status(200).json({
            success: true,
            message: `Resumen enviado correctamente con ${agendas.length} actividad(es).`,
            total: agendas.length
        });

    } catch (error) {
        console.error('Error al enviar resumen de agenda:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar el resumen por correo.',
            error: error.message
        });
    }
};

// =========================================================================
// Eliminar agenda
// =========================================================================
exports.eliminarAgendaAdmin = async (req, res) => {
    try {
        const agenda = await AgendaAdmin.findByIdAndDelete(req.params.id);

        if (!agenda) {
            return res.status(404).json({
                success: false,
                message: 'Agenda no encontrada'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Agenda eliminada correctamente',
            data: agenda
        });
    } catch (error) {
        console.error('Error al eliminar agenda admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la agenda',
            error: error.message
        });
    }
};
