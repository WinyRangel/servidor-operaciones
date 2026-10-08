const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const nodemailer = require("nodemailer");

// Configuración del transporter forzando IPv4 (family: 4) en port 465 (SSL) para evitar ENETUNREACH en Render
const obtenerConfiguracionTransporter = () => {
    const user = (process.env.EMAIL_USER || "transformaciondigitalvam@gmail.com").trim();
    const pass = (process.env.EMAIL_PASS || "atwd ujuh szea pttu").trim();
    const host = (process.env.EMAIL_HOST || "smtp.gmail.com").trim();
    const port = Number(process.env.EMAIL_PORT) || 465;
    const secure = process.env.EMAIL_SECURE !== undefined
        ? (process.env.EMAIL_SECURE === "true" || process.env.EMAIL_SECURE === true)
        : port === 465;

    return {
        host,
        port,
        secure,
        family: 4, // CRÍTICO: Forzar IPv4 para evitar ENETUNREACH en contenedores Linux / Render
        auth: {
            user,
            pass
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
    };
};

const transporter = nodemailer.createTransport(obtenerConfiguracionTransporter());

/**
 * Función central para despachar correos:
 * 1. Si existe GMAIL_WEBHOOK_URL (Google Apps Script HTTPS puerto 443) -> Envía nativo por Gmail sin bloqueo.
 * 2. Si existe BREVO_API_KEY -> Envía vía Brevo REST API (HTTPS puerto 443).
 * 3. Fallback: SMTP directo con Nodemailer (funciona en local).
 */
const enviarCorreo = async ({ from, to, subject, html, text }) => {
    const gmailWebhook = (process.env.GMAIL_WEBHOOK_URL || '').trim();
    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    const emailUser = (process.env.EMAIL_USER || 'transformaciondigitalvam@gmail.com').trim();
    const emailDestino = to || (process.env.EMAIL_DESTINO || 'danielamanzanorangel@gmail.com').trim();

    // 1. VÍA GOOGLE APPS SCRIPT WEBHOOK (HTTPS - PUERTO 443, NATIVO GMAIL, 0 BLOQUEOS EN RENDER)
    if (gmailWebhook) {
        console.log(`[Mailer] 🌐 Enviando vía Google Apps Script (HTTPS 443) a: ${emailDestino}...`);
        const resp = await fetch(gmailWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: emailDestino,
                subject: subject,
                html: html,
                text: text || ''
            })
        });
        const respText = await resp.text();
        console.log(`[Mailer] ✅ Correo entregado exitosamente vía Google Apps Script:`, respText);
        return { success: true, via: 'google-script', response: respText };
    }

    // 2. VÍA BREVO REST API (HTTPS - PUERTO 443)
    if (brevoKey) {
        console.log(`[Mailer] 🌐 Enviando vía Brevo API (HTTPS 443) a: ${emailDestino}...`);
        const destinatarios = (Array.isArray(emailDestino) ? emailDestino : emailDestino.split(','))
            .map(e => ({ email: e.trim() }))
            .filter(d => d.email);

        const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': brevoKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Sistema VAM Operaciones', email: emailUser },
                to: destinatarios,
                subject: subject,
                htmlContent: html,
                textContent: text || ''
            })
        });

        if (!resp.ok) {
            const errData = await resp.text();
            throw new Error(`Error en API de Brevo (${resp.status}): ${errData}`);
        }

        const data = await resp.json();
        console.log(`[Mailer] ✅ Correo entregado exitosamente vía Brevo API:`, data);
        return data;
    }

    // 3. VÍA NODEMAILER SMTP DIRECTO
    console.log(`[Mailer] 📧 Enviando vía Nodemailer SMTP (${process.env.EMAIL_HOST || 'smtp.gmail.com'}:465) a: ${emailDestino}...`);
    try {
        const info = await transporter.sendMail({
            from: from || `"Sistema VAM Operaciones" <${emailUser}>`,
            to: emailDestino,
            subject: subject,
            html: html,
            text: text
        });
        console.log(`[Mailer] ✅ Correo entregado exitosamente vía SMTP (MessageId: ${info.messageId})`);
        return info;
    } catch (smtpErr) {
        if (smtpErr.message && (smtpErr.message.includes('timeout') || smtpErr.code === 'ETIMEDOUT')) {
            throw new Error('Connection timeout: Render bloquea puertos SMTP (465/587). Configura GMAIL_WEBHOOK_URL en Render para enviar por HTTPS (puerto 443).');
        }
        throw smtpErr;
    }
};

/**
 * Envía un correo de notificación cuando se registra una nueva agenda
 * para los roles: auditoria, mercadotecnia, rh.
 *
 * @param {Object} agenda - Datos de la agenda guardada
 */
const enviarNotificacionAgenda = async (agenda) => {
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

    const emailUser = (process.env.EMAIL_USER || "transformaciondigitalvam@gmail.com").trim();
    const emailDestino = (process.env.EMAIL_DESTINO || "danielamanzanorangel@gmail.com").trim();

    const mailOptions = {
        from: `"Sistema VAM Operaciones" <${emailUser}>`,
        to: emailDestino,
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

    await enviarCorreo(mailOptions);
    console.log(`[Mailer] Notificacion enviada a ${emailDestino} (rol: ${agenda.rol})`);
};

/**
 * Envía un correo de resumen con el listado de actividades del usuario.
 *
 * @param {Array} agendas - Lista de agendas a incluir en la tabla del correo
 * @param {string} fechaInicio - Fecha inicial del rango (opcional)
 * @param {string} fechaFin - Fecha final del rango (opcional)
 */
const enviarResumenAgendaEmail = async (agendas, fechaInicio, fechaFin) => {
    const parseFechaMX = (f, opts) => {
        if (!f) return "N/A";
        const raw = typeof f === "string" ? f.substring(0, 10) : new Date(f).toISOString().substring(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const [y, m, d] = raw.split("-").map(Number);
            return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString("es-MX", { ...opts, timeZone: "America/Mexico_City" });
        }
        return new Date(f).toLocaleDateString("es-MX", { ...opts, timeZone: "America/Mexico_City" });
    };

    let periodoTexto = "Todas las actividades registradas";
    if (fechaInicio && fechaFin) {
        const fechaInicioFmt = parseFechaMX(fechaInicio, { day: "2-digit", month: "long", year: "numeric" });
        const fechaFinFmt = parseFechaMX(fechaFin, { day: "2-digit", month: "long", year: "numeric" });
        periodoTexto = (fechaInicio === fechaFin) ? fechaInicioFmt : `${fechaInicioFmt} al ${fechaFinFmt}`;
    } else if (fechaInicio || fechaFin) {
        periodoTexto = parseFechaMX(fechaInicio || fechaFin, { day: "2-digit", month: "long", year: "numeric" });
    }

    const emitidoEn = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });

    const responsable = agendas[0]?.nombre || agendas[0]?.usuario || 'Usuario';
    const emailRemitente = (process.env.EMAIL_USER || "transformaciondigitalvam@gmail.com").trim();
    const emailDestino = (process.env.EMAIL_DESTINO || "danielamanzanorangel@gmail.com").trim();

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
        from: `"Sistema VAM Operaciones" <${emailRemitente}>`,
        to: emailDestino,
        subject: `Resumen de Agenda — ${responsable} (${periodoTexto})`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); padding: 24px 30px;">
                    <h2 style="color: #fff; margin: 0; font-size: 22px;">📅 Resumen de Actividades Agendadas</h2>
                    <div style="background: rgba(255, 255, 255, 0.15); border-left: 4px solid #60a5fa; border-radius: 4px; padding: 10px 16px; margin-top: 12px;">
                        <span style="color: #ffffff; font-size: 15px; font-weight: 700;">👤 Responsable: ${responsable}</span>
                    </div>
                    <p style="color: #c5cae9; margin: 8px 0 0; font-size: 14px;">
                        Período: <strong>${periodoTexto}</strong>
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
                    Este resumen fue emitido desde el Sistema VAM Operaciones (${emailRemitente} → ${emailDestino}).
                </div>
            </div>`
    };

    await enviarCorreo(mailOptions);
    console.log(`[Mailer] Resumen de agenda enviado a ${emailDestino} (${agendas.length} actividades)`);
};

module.exports = {
    transporter,
    enviarCorreo,
    enviarNotificacionAgenda,
    enviarResumenAgendaEmail
};
