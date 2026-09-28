const nodemailer = require("nodemailer");

const crearTransporter = () => {
    const port = parseInt(process.env.EMAIL_PORT || '465');
    const isSecure = process.env.EMAIL_SECURE !== undefined
        ? (String(process.env.EMAIL_SECURE).trim().toLowerCase() === 'true')
        : (port === 465);

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: port,
        secure: isSecure,
        family: 4,           // Forzar IPv4 — evita timeouts en Render y otros clouds
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
    });
};


/**
 * Envía un correo de notificación cuando se registra una nueva agenda
 * para los roles: auditoria, mercadotecnia, rh.
 *
 * @param {Object} agenda - Datos de la agenda guardada
 */
const enviarNotificacionAgenda = async (agenda) => {
    // Validar variables de entorno requeridas
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_DESTINO) {
        console.warn('[Mailer] Variables de entorno de correo no configuradas, se omite la notificación.');
        return;
    }
    const rolesNotificar = ["auditoria", "mercadotecnia", "rh"];

    if (!rolesNotificar.includes((agenda.rol || "").toLowerCase().trim())) {
        return; // No aplica notificación para este rol
    }

    let fechaFormateada = "N/A";
    if (agenda.fecha) {
        const raw = typeof agenda.fecha === "string" ? agenda.fecha.substring(0, 10) : new Date(agenda.fecha).toISOString().substring(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const [y, m, d] = raw.split("-").map(Number);
            fechaFormateada = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString("es-MX", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "America/Mexico_City",
            });
        } else {
            fechaFormateada = new Date(agenda.fecha).toLocaleDateString("es-MX", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "America/Mexico_City",
            });
        }
    }

    const rolLabel = {
        auditoria: "Auditoría",
        mercadotecnia: "Mercadotecnia",
        rh: "Recursos Humanos (RH)",
    }[(agenda.rol || "").toLowerCase().trim()] || agenda.rol;

    const mailOptions = {
        from: `"Sistema VAM Operaciones" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_DESTINO,
        subject: `Nueva agenda registrada — ${rolLabel}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #1a237e; padding: 20px 24px;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Nueva Agenda Registrada</h2>
                    <p style="color: #c5cae9; margin: 4px 0 0; font-size: 14px;">Sistema VAM Operaciones</p>
                </div>
                <div style="padding: 24px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                        <tr>
                            <td style="padding: 10px 8px; font-weight: bold; color: #555; width: 40%;">Usuario</td>
                            <td style="padding: 10px 8px; color: #222;">${agenda.usuario || "N/A"}</td>
                        </tr>
                        <tr style="background-color: #f5f5f5;">
                            <td style="padding: 10px 8px; font-weight: bold; color: #555;">Rol / Departamento</td>
                            <td style="padding: 10px 8px; color: #222;">${rolLabel}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 8px; font-weight: bold; color: #555;">Fecha</td>
                            <td style="padding: 10px 8px; color: #222;">${fechaFormateada}</td>
                        </tr>
                        <tr style="background-color: #f5f5f5;">
                            <td style="padding: 10px 8px; font-weight: bold; color: #555;">Hora</td>
                            <td style="padding: 10px 8px; color: #222;">${agenda.hora || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 8px; font-weight: bold; color: #555;">Domicilio / Lugar</td>
                            <td style="padding: 10px 8px; color: #222;">${agenda.domicilio || "N/A"}</td>
                        </tr>
                        <tr style="background-color: #f5f5f5;">
                            <td style="padding: 10px 8px; font-weight: bold; color: #555;">Actividad</td>
                            <td style="padding: 10px 8px; color: #222;">${agenda.actividad || "N/A"}</td>
                        </tr>
                    </table>
                </div>
                <div style="background-color: #f5f5f5; padding: 14px 24px; text-align: center; font-size: 12px; color: #999;">
                    Este correo fue generado automáticamente por el Sistema VAM Operaciones.
                </div>
            </div>
        `,
    };

    await crearTransporter().sendMail(mailOptions);
    console.log(`[Mailer] Notificacion enviada a ${process.env.EMAIL_DESTINO} (rol: ${agenda.rol})`);
};

/**
 * Envía un correo de resumen con el listado de actividades dentro de un rango de fechas.
 *
 * @param {Array} agendas - Lista de agendas a incluir en la tabla del correo
 * @param {string} fechaInicio - Fecha inicial del rango
 * @param {string} fechaFin - Fecha final del rango
 */
const enviarResumenAgendaEmail = async (agendas, fechaInicio, fechaFin) => {
    // Validar variables de entorno requeridas
    if (!process.env.EMAIL_USER) throw new Error('Variable de entorno EMAIL_USER no definida en el servidor.');
    if (!process.env.EMAIL_PASS) throw new Error('Variable de entorno EMAIL_PASS no definida en el servidor.');
    if (!process.env.EMAIL_DESTINO) throw new Error('Variable de entorno EMAIL_DESTINO no definida en el servidor.');
    const parseFechaMX = (f, opts) => {
        if (!f) return "N/A";
        const raw = typeof f === "string" ? f.substring(0, 10) : new Date(f).toISOString().substring(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const [y, m, d] = raw.split("-").map(Number);
            return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString("es-MX", { ...opts, timeZone: "America/Mexico_City" });
        }
        return new Date(f).toLocaleDateString("es-MX", { ...opts, timeZone: "America/Mexico_City" });
    };

    const fechaInicioFmt = parseFechaMX(fechaInicio, { day: "2-digit", month: "long", year: "numeric" });
    const fechaFinFmt   = parseFechaMX(fechaFin, { day: "2-digit", month: "long", year: "numeric" });
    const emitidoEn     = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });

    const rolLabel = {
        auditoria: "Auditoría",
        mercadotecnia: "Mercadotecnia",
        rh: "Recursos Humanos"
    };

    const filas = agendas.map((ag, i) => {
        const fechaFmt = parseFechaMX(ag.fecha, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
        const bgColor = i % 2 === 0 ? "#ffffff" : "#f8fafc";
        const rolNormalizado = (ag.rol || "").toLowerCase().trim();
        const rolNombre = rolLabel[rolNormalizado] || (ag.rol || "").toUpperCase();

        return `
            <tr style="background-color: ${bgColor};">
                <td style="padding: 10px 8px; text-align: center; color: #94a3b8; font-size: 13px; border-bottom: 1px solid #e2e8f0;">${i + 1}</td>
                <td style="padding: 10px 8px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${ag.nombre || ag.usuario || "N/A"}</td>
                <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                    <span style="background:#e0e7ff; color:#3730a3; border-radius:12px; padding:3px 10px; font-size:12px; font-weight:700;">
                        ${rolNombre}
                    </span>
                </td>
                <td style="padding: 10px 8px; text-align: center; color: #334155; border-bottom: 1px solid #e2e8f0;">${fechaFmt}</td>
                <td style="padding: 10px 8px; text-align: center; color: #334155; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${ag.hora || "--:--"}</td>
                <td style="padding: 10px 8px; color: #64748b; border-bottom: 1px solid #e2e8f0;">${ag.domicilio || "N/A"}</td>
                <td style="padding: 10px 8px; color: #334155; border-bottom: 1px solid #e2e8f0;">${ag.actividad || "N/A"}</td>
            </tr>`;
    }).join("");

    const mailOptions = {
        from: `"Sistema VAM Operaciones" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_DESTINO,
        subject: `Resumen de Agenda — ${fechaInicioFmt} al ${fechaFinFmt}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); padding: 24px 30px;">
                    <h2 style="color: #fff; margin: 0; font-size: 22px;">📅 Resumen de Actividades Agendadas</h2>
                    <p style="color: #c5cae9; margin: 6px 0 0; font-size: 14px;">
                        Período: <strong>${fechaInicioFmt}</strong> al <strong>${fechaFinFmt}</strong>
                    </p>
                </div>
                <div style="background: #f8fafc; padding: 14px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color:#64748b; font-size:13px;">Total de actividades: <strong style="color:#1e293b;">${agendas.length}</strong></span>
                    <span style="color:#94a3b8; font-size:12px;">Generado: ${emitidoEn}</span>
                </div>
                <div style="padding: 16px 20px; overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
                        <thead>
                            <tr style="background-color: #1a237e; color: #ffffff;">
                                <th style="padding: 10px 8px; text-align: center; font-weight: 600;">#</th>
                                <th style="padding: 10px 8px; font-weight: 600;">Responsable</th>
                                <th style="padding: 10px 8px; text-align: center; font-weight: 600;">Área</th>
                                <th style="padding: 10px 8px; text-align: center; font-weight: 600;">Fecha</th>
                                <th style="padding: 10px 8px; text-align: center; font-weight: 600;">Hora</th>
                                <th style="padding: 10px 8px; font-weight: 600;">Lugar / Domicilio</th>
                                <th style="padding: 10px 8px; font-weight: 600;">Actividad</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filas}
                        </tbody>
                    </table>
                </div>
                <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                    Este resumen fue emitido desde el Sistema VAM Operaciones.
                </div>
            </div>`
    };

    console.log(`[Mailer] 🚀 Conectando a ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT} para enviar resumen (${agendas.length} actividades) a: ${process.env.EMAIL_DESTINO}...`);
    await crearTransporter().sendMail(mailOptions);
    console.log(`[Mailer] ✅ Correo entregado exitosamente al servidor SMTP para: ${process.env.EMAIL_DESTINO}`);
};

module.exports = {
    enviarNotificacionAgenda,
    enviarResumenAgendaEmail
};

