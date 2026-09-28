const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}
// En entornos como Render no hay enrutamiento IPv6 saliente.
// Neutralizar resolve6 previene que cualquier librería intente IPv6.
if (dns.Resolver && dns.Resolver.prototype) {
    dns.Resolver.prototype.resolve6 = function (h, o, cb) {
        const callback = typeof o === 'function' ? o : cb;
        if (typeof callback === 'function') callback(null, []);
    };
}
if (dns.resolve6) {
    dns.resolve6 = (h, o, cb) => {
        const callback = typeof o === 'function' ? o : cb;
        if (typeof callback === 'function') callback(null, []);
    };
}

const fs = require('fs');
const path = require('path');

const nodemailer = require("nodemailer");

const limpiarValor = (val) => {
    if (!val) return '';
    return String(val).replace(/^["']|["']$/g, '').trim();
};

/**
 * Obtiene una variable de entorno de forma segura, ignorando espacios en blanco accidentales
 * tanto en el nombre de la variable (key) como en su valor, con opción de valor por defecto.
 * Además, verifica si fue configurada como Secret File en Render (/etc/secrets/<nombre>).
 */
const obtenerEnv = (nombre, fallback = '') => {
    if (process.env[nombre] && limpiarValor(process.env[nombre])) {
        return limpiarValor(process.env[nombre]);
    }
    const match = Object.keys(process.env).find(k => k.trim().toUpperCase() === nombre.toUpperCase());
    if (match && process.env[match] && limpiarValor(process.env[match])) {
        return limpiarValor(process.env[match]);
    }
    // Revisar si existe como Secret File en Render (/etc/secrets/<nombre>)
    try {
        const secretPath = path.join('/etc', 'secrets', nombre);
        if (fs.existsSync(secretPath)) {
            const content = limpiarValor(fs.readFileSync(secretPath, 'utf8'));
            if (content) return content;
        }
    } catch (_) {}

    return fallback;
};

/**
 * Resuelve un nombre de host (ej. 'smtp.gmail.com') a su dirección IPv4
 * para evitar que Node.js intente conectarse vía IPv6 en Render/AWS.
 */
const resolverHostIPv4 = async (hostname) => {
    if (!hostname) return '142.250.190.108'; // IP de respaldo conocida de smtp.gmail.com
    // Si ya es una dirección IP numérica IPv4
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
        return hostname;
    }
    try {
        const addresses = await dns.promises.resolve4(hostname);
        if (addresses && addresses.length > 0) {
            return addresses[0];
        }
    } catch (err) {
        console.warn(`[Mailer] No se pudo resolver IPv4 para ${hostname}, usando hostname directo:`, err.message);
    }
    return hostname;
};

const crearTransporter = async () => {
    const rawHost = obtenerEnv('EMAIL_HOST', 'smtp.gmail.com');
    const port = parseInt(obtenerEnv('EMAIL_PORT', '465'));
    const secureVal = obtenerEnv('EMAIL_SECURE', '');
    const isSecure = secureVal !== ''
        ? (secureVal.toLowerCase() === 'true')
        : (port === 465);

    const hostIPv4 = await resolverHostIPv4(rawHost);

    return nodemailer.createTransport({
        host: hostIPv4,
        port: port,
        secure: isSecure,
        auth: {
            user: obtenerEnv('EMAIL_USER', 'transformaciondigitalvam@gmail.com'),
            pass: obtenerEnv('EMAIL_PASS'),
        },
        tls: {
            servername: rawHost, // Vital para validar el certificado SSL con el nombre real del servidor
            rejectUnauthorized: false
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
    });
};

/**
 * Envía un correo utilizando la mejor estrategia disponible:
 * 1. Brevo REST API (HTTPS puerto 443 - recomendado para Render Free Tier)
 * 2. Resend REST API (HTTPS puerto 443)
 * 3. Fallback a Nodemailer SMTP tradicional (para local o planes con puertos SMTP abiertos)
 */
const enviarCorreo = async ({ from, to, subject, html, text, replyTo }) => {
    const brevoKey = obtenerEnv('BREVO_API_KEY');
    const resendKey = obtenerEnv('RESEND_API_KEY');

    // 1. BREVO API (HTTPS - puerto 443, no bloqueado por Render)
    if (brevoKey) {
        console.log(`[Mailer] 🌐 Enviando vía Brevo REST API (HTTPS) a: ${to}...`);
        const senderEmail = obtenerEnv('EMAIL_USER', 'transformaciondigitalvam@gmail.com');
        const senderName = 'Sistema VAM Operaciones';

        const destinatarios = (Array.isArray(to) ? to : to.split(','))
            .map(e => e.trim())
            .filter(Boolean)
            .map(email => ({ email }));

        const body = {
            sender: { name: senderName, email: senderEmail },
            to: destinatarios,
            subject: subject,
            htmlContent: html,
            ...(text ? { textContent: text } : {})
        };
        if (replyTo) {
            body.replyTo = { email: replyTo };
        }

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': brevoKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errData = await res.text();
            if (res.status === 401) {
                console.error(`[Mailer] ⚠️ Error 401 de Brevo ("Key not found"). Longitud de clave: ${brevoKey.length}, Prefijo: ${brevoKey.substring(0, 10)}...`);
                console.error(`[Mailer] ℹ️ Importante: En Brevo ve a "SMTP & API" -> pestaña "API Keys" (NO la pestaña "SMTP"). La clave debe empezar con "xkeysib-".`);
            }
            throw new Error(`Error en API de Brevo (${res.status}): ${errData}`);
        }

        const data = await res.json();
        console.log(`[Mailer] ✅ Correo entregado exitosamente vía Brevo API. MessageId: ${data.messageId || JSON.stringify(data)}`);
        return data;
    }

    // 2. RESEND API (HTTPS - puerto 443, no bloqueado por Render)
    if (resendKey) {
        console.log(`[Mailer] 🌐 Enviando vía Resend REST API (HTTPS) a: ${to}...`);
        const destinatarios = (Array.isArray(to) ? to : to.split(','))
            .map(e => e.trim())
            .filter(Boolean);

        const fromAddress = obtenerEnv('RESEND_FROM', '') || `"Sistema VAM Operaciones" <onboarding@resend.dev>`;

        const body = {
            from: fromAddress,
            to: destinatarios,
            subject: subject,
            html: html,
            ...(text ? { text: text } : {})
        };
        if (replyTo) {
            body.reply_to = replyTo;
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errData = await res.text();
            throw new Error(`Error en API de Resend (${res.status}): ${errData}`);
        }

        const data = await res.json();
        console.log(`[Mailer] ✅ Correo entregado exitosamente vía Resend API. ID: ${data.id || JSON.stringify(data)}`);
        return data;
    }

    // 3. FALLBACK NODEMAILER (SMTP)
    console.log(`[Mailer] 📧 Enviando vía SMTP (${obtenerEnv('EMAIL_HOST', 'smtp.gmail.com')}:${obtenerEnv('EMAIL_PORT', '465')}) a: ${to}...`);
    try {
        const transporter = await crearTransporter();
        const info = await transporter.sendMail({
            from: from || `"Sistema VAM Operaciones" <${obtenerEnv('EMAIL_USER', 'transformaciondigitalvam@gmail.com')}>`,
            to: to,
            subject: subject,
            html: html,
            text: text,
            replyTo: replyTo
        });
        console.log(`[Mailer] ✅ Correo entregado exitosamente al servidor SMTP para: ${to}`);
        return info;
    } catch (smtpErr) {
        if (smtpErr.message && (smtpErr.message.includes('timeout') || smtpErr.code === 'ETIMEDOUT')) {
            console.error('[Mailer] ❌ Error de timeout SMTP detectado. En Render (Free Tier), los puertos SMTP 465 y 587 están bloqueados por firewall. Configura la variable de entorno BREVO_API_KEY o RESEND_API_KEY en Render para enviar vía HTTPS sin bloqueos.');
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
    const brevoKey = obtenerEnv('BREVO_API_KEY');
    const resendKey = obtenerEnv('RESEND_API_KEY');
    const emailUser = obtenerEnv('EMAIL_USER', 'transformaciondigitalvam@gmail.com');
    const emailPass = obtenerEnv('EMAIL_PASS');
    const emailDestino = obtenerEnv('EMAIL_DESTINO', 'danielamanzanorangel@gmail.com');

    // Validar variables de entorno requeridas
    if (!brevoKey && !resendKey && (!emailUser || !emailPass)) {
        console.warn('[Mailer] Variables de entorno de correo no configuradas (se requiere BREVO_API_KEY, RESEND_API_KEY o EMAIL_USER/EMAIL_PASS).');
        return;
    }
    if (!emailDestino) {
        console.warn('[Mailer] Variable EMAIL_DESTINO no configurada, se omite la notificación.');
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
 * Envía un correo de resumen con el listado de actividades dentro de un rango de fechas.
 *
 * @param {Array} agendas - Lista de agendas a incluir en la tabla del correo
 * @param {string} fechaInicio - Fecha inicial del rango
 * @param {string} fechaFin - Fecha final del rango
 */
const enviarResumenAgendaEmail = async (agendas, fechaInicio, fechaFin) => {
    const brevoKey = obtenerEnv('BREVO_API_KEY');
    const resendKey = obtenerEnv('RESEND_API_KEY');
    const emailUser = obtenerEnv('EMAIL_USER', 'transformaciondigitalvam@gmail.com');
    const emailPass = obtenerEnv('EMAIL_PASS');
    const emailDestino = obtenerEnv('EMAIL_DESTINO', 'danielamanzanorangel@gmail.com');

    // Validar variables de entorno requeridas
    if (!brevoKey && !resendKey && (!emailUser || !emailPass)) {
        throw new Error('No se han configurado credenciales de correo (definir BREVO_API_KEY, RESEND_API_KEY o EMAIL_USER y EMAIL_PASS en el servidor).');
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
        replyTo: 'transformacion.digital@vamosamejorar.com',
        to: emailDestino,
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

    console.log(`[Mailer] 🚀 Iniciando envío de resumen (${agendas.length} actividades) a: ${emailDestino}...`);
    await enviarCorreo(mailOptions);
    console.log(`[Mailer] ✅ Resumen de actividades entregado exitosamente a: ${emailDestino}`);
};

module.exports = {
    enviarNotificacionAgenda,
    enviarResumenAgendaEmail
};

