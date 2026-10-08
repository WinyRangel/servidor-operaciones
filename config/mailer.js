const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const nodemailer = require("nodemailer");

const limpiarValor = (val) => {
    if (!val) return '';
    return String(val).replace(/^["']|["']$/g, '').trim();
};

/**
 * Obtiene una variable de entorno de forma segura, ignorando espacios en blanco accidentales
 * tanto en el nombre de la variable (key) como en su valor, con opción de valor por defecto.
 */
const obtenerEnv = (nombre, fallback = '') => {
    if (process.env[nombre] && limpiarValor(process.env[nombre])) {
        return limpiarValor(process.env[nombre]);
    }
    const match = Object.keys(process.env).find(k => k.trim().toUpperCase() === nombre.toUpperCase());
    if (match && process.env[match] && limpiarValor(process.env[match])) {
        return limpiarValor(process.env[match]);
    }
    return fallback;
};

// Transporter nativo de Gmail forzando IPv4 (family: 4) para evitar ENETUNREACH de IPv6 en Render
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    auth: {
        user: obtenerEnv('EMAIL_USER', 'transformaciondigitalvam@gmail.com'),
        pass: obtenerEnv('EMAIL_PASS', 'atwd ujuh szea pttu'),
    },
});

/**
 * Envía un correo directo de Gmail a Gmail usando Nodemailer
 */
const enviarCorreo = async ({ from, to, subject, html, text, replyTo, bcc }) => {
    const emailUser = obtenerEnv('EMAIL_USER', 'transformaciondigitalvam@gmail.com');
    const remitenteFinal = from || `"Sistema VAM Operaciones" <${emailUser}>`;
    const replyToFinal = replyTo || emailUser;

    console.log(`[Mailer] 📧 Enviando correo vía Gmail desde ${remitenteFinal} a: ${to}...`);
    try {
        const mailPayload = {
            from: remitenteFinal,
            to: to,
            subject: subject,
            html: html,
            text: text,
            replyTo: replyToFinal
        };
        if (bcc) {
            mailPayload.bcc = bcc;
        }
        const info = await transporter.sendMail(mailPayload);
        console.log(`[Mailer] ✅ Correo entregado exitosamente vía Gmail para: ${to} (MessageId: ${info.messageId})`);
        return info;
    } catch (err) {
        console.error('[Mailer] ❌ Error al enviar correo vía Gmail:', err);
        throw err;
    }
};

/**
 * Envía un correo de resumen con el listado de actividades dentro de un rango de fechas.
 *
 * @param {Array} agendas - Lista de agendas a incluir en la tabla del correo
 * @param {string} fechaInicio - Fecha inicial del rango
 * @param {string} fechaFin - Fecha final del rango
 */
const enviarResumenAgendaEmail = async (agendas, fechaInicio, fechaFin) => {
    const emailUser = obtenerEnv('EMAIL_USER', 'transformaciondigitalvam@gmail.com');
    const emailPass = obtenerEnv('EMAIL_PASS', 'atwd ujuh szea pttu');
    const emailDestino = obtenerEnv('EMAIL_DESTINO', 'danielamanzanorangel@gmail.com');

    // Validar variables de entorno requeridas
    if (!emailUser || !emailPass) {
        throw new Error('No se han configurado credenciales de correo (definir EMAIL_USER y EMAIL_PASS en el servidor).');
    }
    if (!emailDestino) throw new Error('Variable de entorno EMAIL_DESTINO no definida en el servidor.');

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
    const fechaFinFmt = parseFechaMX(fechaFin, { day: "2-digit", month: "long", year: "numeric" });
    const emitidoEn = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });

    const rolLabel = {
        auditoria: "Auditoría",
        mercadotecnia: "Mercadotecnia",
        rh: "Recursos Humanos"
    };

    // Identificar responsable si el reporte pertenece a una persona específica
    const responsablesUnicos = [...new Set(agendas.map(ag => (ag.nombre || ag.usuario || '').trim()).filter(Boolean))];
    const rolesUnicos = [...new Set(agendas.map(ag => (ag.rol || '').toLowerCase().trim()).filter(Boolean))];
    const rolTexto = rolesUnicos.map(r => rolLabel[r] || r.toUpperCase()).join(', ') || 'Operaciones';

    let subject = `Resumen de Agenda — ${fechaInicioFmt} al ${fechaFinFmt}`;
    let bloqueResponsable = '';

    if (responsablesUnicos.length === 1) {
        const resp = responsablesUnicos[0];
        subject = `Resumen de Agenda — ${resp} (${rolTexto}) — ${fechaInicioFmt} al ${fechaFinFmt}`;
        bloqueResponsable = `
            <div style="background: rgba(255, 255, 255, 0.15); border-left: 4px solid #60a5fa; border-radius: 4px; padding: 10px 16px; margin-top: 12px;">
                <span style="color: #ffffff; font-size: 15px; font-weight: 700;">👤 Responsable: ${resp}</span>
                <span style="color: #c7d2fe; font-size: 13.5px; margin-left: 8px;">(${rolTexto})</span>
            </div>`;
    }

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
        from: `"Sistema VAM Operaciones" <${emailUser}>`,
        replyTo: emailUser,
        to: emailDestino,
        bcc: emailUser, // Copia de respaldo para la cuenta emisora
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); padding: 24px 30px;">
                    <h2 style="color: #fff; margin: 0; font-size: 22px;">📅 Resumen de Actividades Agendadas</h2>
                    ${bloqueResponsable}
                    <p style="color: #c5cae9; margin: 8px 0 0; font-size: 14px;">
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

    console.log(`[Mailer] 🚀 Iniciando envío de resumen (${agendas.length} actividades) a: ${emailDestino} (Asunto: "${subject}")...`);
    await enviarCorreo(mailOptions);
    console.log(`[Mailer] ✅ Resumen de actividades entregado exitosamente a: ${emailDestino}`);
};

module.exports = {
    transporter,
    enviarResumenAgendaEmail
};
