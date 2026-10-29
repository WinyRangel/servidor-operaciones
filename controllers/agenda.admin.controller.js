const AgendaAdmin = require('../models/AgendaAdmin');
const Agenda = require('../models/Agenda');
const AgendaAsesor = require('../models/AgendaAsesor');
const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const { enviarResumenAgendaEmail } = require('../config/mailer');

const SECRET_KEY = '123VAM!!'; // Misma clave secreta de autenticación
const ROLES_PERMITIDOS = ['admin', 'sup', 'mercadotecnia', 'auditoria', 'rh', 'admin-audi'];

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
// Funciones auxiliares para resolución de nombres reales de usuario con caché
// =========================================================================
let cacheMapaNombres = null;
let cacheMapaNombresTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

const construirMapaNombres = async (forceRefresh = false) => {
    const ahora = Date.now();
    if (!forceRefresh && cacheMapaNombres && (ahora - cacheMapaNombresTimestamp < CACHE_TTL_MS)) {
        return cacheMapaNombres;
    }
    try {
        const usuarios = await Usuario.find({}, 'usuario nombre').lean();
        const mapa = new Map();
        for (const u of usuarios) {
            const uLogin = (u.usuario || '').trim().toLowerCase();
            const uNom = (u.nombre || '').trim();
            if (uLogin && uNom) {
                mapa.set(uLogin, uNom);
            }
            if (uNom) {
                mapa.set(uNom.toLowerCase(), uNom);
            }
        }
        cacheMapaNombres = mapa;
        cacheMapaNombresTimestamp = ahora;
        return mapa;
    } catch (e) {
        return cacheMapaNombres || new Map();
    }
};

const resolverNombreCompleto = (mapaNombres, usuarioStr, nombreStr) => {
    const u = (usuarioStr || '').trim();
    const n = (nombreStr || '').trim();
    // Prioridad 1: Buscar si el usuario o nombre existe en la base de datos de usuarios
    const delMapa = mapaNombres.get(u.toLowerCase()) || mapaNombres.get(n.toLowerCase());
    if (delMapa) {
        return delMapa;
    }
    // Prioridad 2: Si el campo nombre guardado es diferente al username
    if (n && n.toLowerCase() !== u.toLowerCase()) {
        return n;
    }
    return n || u || 'Sin asignar';
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

            // Log para roles de auditoría, mercadotecnia y RH
            const rolesMonitoreados = ['auditoria', 'mercadotecnia', 'rh'];
            if (rolesMonitoreados.includes(rolNormalizado)) {
                const ahora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
                console.log(`[AGENDA-${rolNormalizado.toUpperCase()}][${ahora}] 📝 Registro masivo: ${guardadas.length} actividad(es) guardada(s) por '${userLogin}' (${nombreFinal}). Semana: ${semana || 'N/A'}`);
            }

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

        // Log para roles de auditoría, mercadotecnia y RH
        const rolesMonitoreados = ['auditoria', 'mercadotecnia', 'rh'];
        if (rolesMonitoreados.includes(rolNormalizado)) {
            const ahora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
            console.log(`[AGENDA-${rolNormalizado.toUpperCase()}][${ahora}] 📝 Registro individual: Guardada actividad para '${userLogin}' (${nombreFinal || nombre}). Fecha: ${fecha}, Hora: ${hora || '--:--'}, Lugar: "${domicilio || 'N/A'}", Actividad: "${actividad || 'N/A'}"`);
        }

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
        const rolConsultante = (userRol || '').toLowerCase().trim();
        const userNombreLower = (userNombre || '').toLowerCase().trim();
        const esAdminAudi = rolConsultante === 'admin-audi' || userNombreLower === 'admin-audi';
        const esAdminOSup = ['admin', 'sup'].includes(rolConsultante);

        // Si es admin-audi, aislar estrictamente a agendas de auditoría
        if (esAdminAudi) {
            filtro.rol = 'auditoria';
            if (usuario) {
                filtro.$or = [
                    { usuario: new RegExp(`^${usuario}$`, 'i') },
                    { nombre: new RegExp(`^${usuario}$`, 'i') }
                ];
            }
        } else if (!esAdminOSup && userNombre) {
            // Si no es admin ni supervisor, forzar restricción a su propio usuario
            let nombreUsuario = userNombre;
            try {
                const uDoc = await Usuario.findOne({ usuario: new RegExp(`^${userNombre}$`, 'i') }).lean();
                if (uDoc && uDoc.nombre) {
                    nombreUsuario = uDoc.nombre;
                }
            } catch (e) {
                // Si falla consulta a Usuario, continuar
            }

            filtro.$or = [
                { usuario: new RegExp(`^${userNombre}$`, 'i') },
                { nombre: new RegExp(`^${userNombre}$`, 'i') },
                { nombre: new RegExp(`^${nombreUsuario}$`, 'i') }
            ];

            if (rolConsultante) {
                filtro.rol = rolConsultante;
            }
        } else {
            // Admin o Supervisor: pueden ver todo o filtrar por usuario/rol específico
            if (usuario) {
                filtro.$or = [
                    { usuario: new RegExp(`^${usuario}$`, 'i') },
                    { nombre: new RegExp(`^${usuario}$`, 'i') }
                ];
            }
            if (rol) {
                filtro.rol = rol.toLowerCase().trim();
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

        const agendas = await AgendaAdmin.find(filtro).sort({ fecha: 1, hora: 1, createdAt: 1 }).lean();

        // Enriquecer registros anteriores con nombre real de usuario
        const mapaNombres = await construirMapaNombres();

        const agendasConNombre = agendas.map(ag => ({
            ...ag,
            nombre: resolverNombreCompleto(mapaNombres, ag.usuario, ag.nombre)
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
        const { semana, fecha, hora, domicilio, actividad, usuario, rol, nombre } = req.body;
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
        if (nombre !== undefined) agenda.nombre = nombre;
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
// Enviar resumen de agenda por correo (usuario logueado / filtros)
// =========================================================================
exports.enviarResumenAgenda = async (req, res) => {
    try {
        const { usuario: userLogin, nombre: userNombre, rol: userRol } = obtenerUsuarioYRol(req);
        const { fechaInicio, fechaFin, rol, usuario } = req.body;

        // Validar obligatoriedad del rango de fechas
        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({
                success: false,
                message: 'Es obligatorio seleccionar un rango de fechas (fecha de inicio y fecha de fin) para enviar el resumen de agendas.'
            });
        }

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

        // Siempre identificar el usuario objetivo: el recibido en el body o el usuario en sesión
        const usuarioObjetivo = (usuario || userLogin || userNombre || '').trim();

        if (usuarioObjetivo) {
            let nombreDoc = usuarioObjetivo;
            let loginDoc = usuarioObjetivo;
            try {
                const uDoc = await Usuario.findOne({
                    $or: [
                        { usuario: new RegExp(`^${usuarioObjetivo}$`, 'i') },
                        { nombre: new RegExp(`^${usuarioObjetivo}$`, 'i') }
                    ]
                }).lean();
                if (uDoc) {
                    if (uDoc.nombre) nombreDoc = uDoc.nombre;
                    if (uDoc.usuario) loginDoc = uDoc.usuario;
                }
            } catch (_) { }

            filtro.$or = [
                { usuario: new RegExp(`^${usuarioObjetivo}$`, 'i') },
                { nombre: new RegExp(`^${usuarioObjetivo}$`, 'i') },
                { usuario: new RegExp(`^${loginDoc}$`, 'i') },
                { nombre: new RegExp(`^${nombreDoc}$`, 'i') }
            ];

            if (rol) {
                filtro.rol = new RegExp(`^${rol.trim()}$`, 'i');
            }
        } else {
            // Filtrar por rol si no se especificó usuario
            const rolesNotificar = ['auditoria', 'mercadotecnia', 'rh'];
            if (rol && rolesNotificar.includes(rol.toLowerCase().trim())) {
                filtro.rol = new RegExp(`^${rol.trim()}$`, 'i');
            } else {
                filtro.rol = { $in: [/auditoria/i, /mercadotecnia/i, /^rh$/i] };
            }
        }

        const agendas = await AgendaAdmin.find(filtro).sort({ fecha: 1, hora: 1 }).lean();

        if (agendas.length === 0) {
            const periodoDesc = (fechaInicio || fechaFin) ? ' en el período seleccionado' : '';
            return res.status(200).json({
                success: false,
                message: usuarioObjetivo
                    ? `No se encontraron actividades registradas para el usuario '${usuarioObjetivo}'${periodoDesc}.`
                    : `No se encontraron actividades en el período seleccionado.`
            });
        }

        // Enriquecer registros con nombre real de usuario
        const mapaNombres = await construirMapaNombres();

        const agendasConNombre = agendas.map(ag => ({
            ...ag,
            nombre: resolverNombreCompleto(mapaNombres, ag.usuario, ag.nombre) || usuarioObjetivo || 'Sin asignar'
        }));

        const ahora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
        const remitenteFinal = (process.env.EMAIL_USER || 'transformacion.digital@vamosamejorar.com').trim();
        const destinoFinal = (process.env.EMAIL_DESTINO || 'o.alfaro@vamosamejorar.com').trim();
        const ccFinal = (process.env.EMAIL_CC || 'transformacion.digital@vamosamejorar.com').trim();
        console.log(`[AGENDA-CORREO][${ahora}] 📤 Enviando reporte de ${agendasConNombre.length} actividad(es) del usuario '${usuarioObjetivo || 'VAM'}' de '${remitenteFinal}' hacia: '${destinoFinal}' (CC: ${ccFinal})`);

        await enviarResumenAgendaEmail(agendasConNombre, fechaInicio, fechaFin);

        console.log(`[AGENDA-CORREO][${ahora}] ✅ Correo con ${agendasConNombre.length} actividad(es) enviado exitosamente a: ${destinoFinal} (CC: ${ccFinal})`);

        res.status(200).json({
            success: true,
            message: `Resumen de agenda enviado exitosamente desde ${remitenteFinal} a ${destinoFinal} (${agendasConNombre.length} actividades).`,
            remitente: remitenteFinal,
            destinatario: destinoFinal,
            total: agendasConNombre.length
        });

    } catch (error) {
        console.error('Error al enviar resumen de agenda:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar el resumen por correo: ' + (error.message || 'Error desconocido'),
            error: error.message
        });
    }
};

// =========================================================================
// Eliminar agenda
// =========================================================================
exports.eliminarAgendaAdmin = async (req, res) => {
    try {
        const { usuario: userNombre, rol: userRol } = obtenerUsuarioYRol(req);
        const rolConsultante = (userRol || '').toLowerCase().trim();
        const esAdminOSup = ['admin', 'sup'].includes(rolConsultante);

        const agenda = await AgendaAdmin.findById(req.params.id);

        if (!agenda) {
            return res.status(404).json({
                success: false,
                message: 'Agenda no encontrada'
            });
        }

        // Si no es admin ni supervisión, validar que la agenda pertenezca al usuario
        if (!esAdminOSup && userNombre) {
            const uOwner = (agenda.usuario || '').toLowerCase();
            const nOwner = (agenda.nombre || '').toLowerCase();
            const uActual = userNombre.toLowerCase();
            if (uOwner !== uActual && nOwner !== uActual) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes autorización para eliminar la agenda de otro usuario'
                });
            }
        }

        await AgendaAdmin.findByIdAndDelete(req.params.id);

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



exports.obtenerAllAgendas = async (req, res) => {
    try {
        const { usuario: userNombre, rol: userRol, nombre: userName } = obtenerUsuarioYRol(req);
        const { usuario, rol, semana, fecha, fechaInicio, fechaFin } = req.query;

        const rolConsultante = (userRol || '').toLowerCase().trim();
        const userNombreLower = (userNombre || '').toLowerCase().trim();
        const esAdminAudi = rolConsultante === 'admin-audi' || userNombreLower === 'admin-audi';
        const esAdminOSup = ['admin', 'sup', 'adminsis', 'auditoria'].includes(rolConsultante) || esAdminAudi;

        // ----------------------------------------------------------------
        // Construcción de filtros por colección
        // ----------------------------------------------------------------

        // Filtro para agendaadmin (tiene campo rol, nombre, usuario)
        const filtroAdmin = {};
        // Filtro para agendas/coordinadores (campo: coordinador, semana, fecha)
        const filtroCoord = {};
        // Filtro para agendaasesors (campo: asesor, semana, fecha)
        const filtroAsesor = {};

        if (esAdminAudi) {
            // Usuario admin-audi: SOLO ve actividades correspondientes a auditoria (los 3 auditores)
            filtroAdmin.rol = 'auditoria';
            if (usuario) {
                filtroAdmin.$or = [
                    { usuario: new RegExp(`^${usuario}$`, 'i') },
                    { nombre: new RegExp(`^${usuario}$`, 'i') }
                ];
            }
            filtroCoord._id = null;
            filtroAsesor._id = null;
        } else if (!esAdminOSup && userNombre) {
            // Usuario no-admin: solo ve sus propias actividades
            let nombreUsuario = userNombre;
            try {
                const uDoc = await Usuario.findOne({ usuario: new RegExp(`^${userNombre}$`, 'i') }).lean();
                if (uDoc && uDoc.nombre) nombreUsuario = uDoc.nombre;
            } catch (e) { }

            filtroAdmin.$or = [
                { usuario: new RegExp(`^${userNombre}$`, 'i') },
                { nombre: new RegExp(`^${nombreUsuario}$`, 'i') }
            ];
            if (rolConsultante) filtroAdmin.rol = rolConsultante;

            filtroCoord.coordinador = new RegExp(`^${nombreUsuario}$`, 'i');
            filtroAsesor.asesor = new RegExp(`^${nombreUsuario}$`, 'i');
        } else {
            // Admin/Supervisor: puede filtrar por usuario o rol
            if (usuario) {
                filtroAdmin.$or = [
                    { usuario: new RegExp(`^${usuario}$`, 'i') },
                    { nombre: new RegExp(`^${usuario}$`, 'i') }
                ];
                filtroCoord.coordinador = new RegExp(`^${usuario}$`, 'i');
                filtroAsesor.asesor = new RegExp(`^${usuario}$`, 'i');
            }
            if (rol) {
                const rolLower = rol.toLowerCase().trim();
                // Solo filtrar la colección que corresponda al rol
                if (rolLower === 'coordinador') {
                    // solo traer coordinadores, dejar los otros vacíos
                    filtroAdmin._id = null; // resultado vacío
                    filtroAsesor._id = null;
                } else if (rolLower === 'asesor') {
                    filtroAdmin._id = null;
                    filtroCoord._id = null;
                } else {
                    filtroAdmin.rol = rolLower;
                    filtroCoord._id = null;
                    filtroAsesor._id = null;
                }
            }
        }

        // Filtro por semana (aplica a todas)
        if (semana) {
            filtroAdmin.semana = semana;
            filtroCoord.semana = semana;
            filtroAsesor.semana = semana;
        }

        // Filtro por rango de fechas (aplica a todas)
        if (fechaInicio || fechaFin) {
            const rangeFecha = {};
            if (fechaInicio) {
                rangeFecha.$gte = new Date(fechaInicio);
            }
            if (fechaFin) {
                const fFin = new Date(fechaFin);
                fFin.setUTCHours(23, 59, 59, 999);
                rangeFecha.$lte = fFin;
            }
            filtroAdmin.fecha = rangeFecha;
            filtroCoord.fecha = rangeFecha;
            filtroAsesor.fecha = rangeFecha;
        } else if (fecha) {
            // Filtro por fecha exacta
            const fechaBusqueda = new Date(fecha);
            const diaSiguiente = new Date(fecha);
            diaSiguiente.setDate(diaSiguiente.getDate() + 1);
            const rangeFecha = { $gte: fechaBusqueda, $lt: diaSiguiente };
            filtroAdmin.fecha = rangeFecha;
            filtroCoord.fecha = rangeFecha;
            filtroAsesor.fecha = rangeFecha;
        }

        // ----------------------------------------------------------------
        // Proyecciones optimizadas (excluye campos pesados como firmas o evidencias)
        // ----------------------------------------------------------------
        const projAdmin = { _id: 1, usuario: 1, nombre: 1, rol: 1, semana: 1, fecha: 1, hora: 1, domicilio: 1, actividad: 1, createdAt: 1 };
        const projCoord = { _id: 1, coordinador: 1, semana: 1, fecha: 1, hora: 1, actividad: 1, domicilio: 1, codigo: 1, codigoReportado: 1, actividadReportada: 1, reportado: 1, horaReporte: 1, horaCierre: 1, cumplimientoAgenda: 1, acordeObjetivo: 1, resultado: 1, createdAt: 1 };
        const projAsesor = { _id: 1, asesor: 1, coordinacion: 1, semana: 1, fecha: 1, hora: 1, actividad: 1, domicilio: 1, codigo: 1, acordeObjetivo: 1, resultado: 1, validada: 1, motivoRechazo: 1, validadaPor: 1, createdAt: 1 };

        // ----------------------------------------------------------------
        // Consultas paralelas a las 3 colecciones y mapa de usuarios
        // ----------------------------------------------------------------
        const [agendasAdmin, agendasCoord, agendasAses, mapaNombres] = await Promise.all([
            AgendaAdmin.find(filtroAdmin, projAdmin).sort({ fecha: 1, hora: 1 }).lean(),
            esAdminAudi ? Promise.resolve([]) : Agenda.find(filtroCoord, projCoord).sort({ fecha: 1, hora: 1 }).lean(),
            esAdminAudi ? Promise.resolve([]) : AgendaAsesor.find(filtroAsesor, projAsesor).sort({ fecha: 1, hora: 1 }).lean(),
            construirMapaNombres()
        ]);

        // Normalizar agendaadmin
        const normAdmin = agendasAdmin.map(ag => {
            const loginAdmin = (ag.usuario || '').trim();
            return {
                ...ag,
                nombre: resolverNombreCompleto(mapaNombres, loginAdmin, ag.nombre),
                usuario: loginAdmin,
                rol: ag.rol || 'admin'
            };
        });

        // Normalizar coordinadores: agregar rol y nombre desde campo coordinador
        const normCoord = agendasCoord.map(ag => {
            const loginCoord = (ag.coordinador || '').trim();
            return {
                ...ag,
                rol: 'coordinador',
                nombre: resolverNombreCompleto(mapaNombres, loginCoord, ag.nombre),
                usuario: loginCoord
            };
        });

        // Normalizar asesores: agregar rol y nombre desde campo asesor
        const normAsesor = agendasAses.map(ag => {
            const loginAsesor = (ag.asesor || '').trim();
            return {
                ...ag,
                rol: 'asesor',
                nombre: resolverNombreCompleto(mapaNombres, loginAsesor, ag.nombre),
                usuario: loginAsesor
            };
        });

        // Combinar
        const todasLasAgendas = [...normAdmin, ...normCoord, ...normAsesor];

        // Ordenamiento optimizado de alto rendimiento con claves precalculadas (fecha ASC → nombre ASC → hora ASC)
        for (let i = 0; i < todasLasAgendas.length; i++) {
            const ag = todasLasAgendas[i];
            const f = ag.fecha ? (typeof ag.fecha === 'string' ? ag.fecha.substring(0, 10) : new Date(ag.fecha).toISOString().substring(0, 10)) : '';
            const n = (ag.nombre || '').toLowerCase();
            const h = (ag.hora || '').trim();
            ag._sk = `${f}_${n}_${h}`;
        }
        todasLasAgendas.sort((a, b) => a._sk.localeCompare(b._sk));
        for (let i = 0; i < todasLasAgendas.length; i++) {
            delete todasLasAgendas[i]._sk;
        }

        res.status(200).json({
            success: true,
            total: todasLasAgendas.length,
            data: todasLasAgendas
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