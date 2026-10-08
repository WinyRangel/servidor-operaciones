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
    } catch (_) { }

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
            pass: obtenerEnv('EMAIL_PASS', 'ejei ksyu etie qwph'),
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
 * Envía un correo utilizando:
 * 1. Resend REST API (HTTPS puerto 443 - opcional si RESEND_API_KEY está configurado)
 * 2. Nodemailer SMTP institucional directo (HostPapa cPanel / puerto 465)
 */
const enviarCorreo = async ({ from, to, subject, html, text, replyTo, bcc }) => {
    const resendKey = obtenerEnv('RESEND_API_KEY');
    const emailUser = obtenerEnv('EMAIL_USER', 'transformaciondigitalvam@gmail.com');
    const remitenteFinal = from || `"Sistema VAM Operaciones" <${emailUser}>`;
    const replyToFinal = replyTo || emailUser;

    // 1. RESEND API (HTTPS - puerto 443, solo si está explícitamente configurado)
    if (resendKey) {
        console.log(`[Mailer] 🌐 Enviando vía Resend REST API (HTTPS) a: ${to}...`);
        const destinatarios = (Array.isArray(to) ? to : to.split(','))
            .map(e => e.trim())
            .filter(Boolean);

        const fromAddress = obtenerEnv('RESEND_FROM', '') || remitenteFinal;

        const body = {
            from: fromAddress,
            to: destinatarios,
            subject: subject,
            html: html,
            ...(text ? { text: text } : {})
        };
        if (replyToFinal) {
            body.reply_to = replyToFinal;
        }
        if (bcc) {
            body.bcc = Array.isArray(bcc) ? bcc : [bcc];
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

    // 2. ENVÍO DIRECTO VÍA SMTP
    const hostSmtp = obtenerEnv('EMAIL_HOST', 'smtp.gmail.com');
    const portSmtp = obtenerEnv('EMAIL_PORT', '465');
    console.log(`[Mailer] 📧 Enviando vía SMTP (${hostSmtp}:${portSmtp}) desde ${remitenteFinal} a: ${to} (Copia de respaldo: ${bcc || 'N/A'})...`);
    try {
        const transporter = await crearTransporter();
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
        console.log(`[Mailer] ✅ Correo entregado exitosamente al servidor SMTP para: ${to} (MessageId: ${info.messageId})`);
        return info;
    } catch (smtpErr) {
        console.error('[Mailer] ❌ Error al enviar correo vía SMTP:', smtpErr);
        throw smtpErr;
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
    const resendKey = obtenerEnv('RESEND_API_KEY');
    const emailUser = obtenerEnv('EMAIL_USER', 'transformaciondigitalvam@gmail.com');
    const emailPass = obtenerEnv('EMAIL_PASS', 'ejei ksyu etie qwph');
    const emailDestino = obtenerEnv('EMAIL_DESTINO', 'danielamanzanorangel@gmail.com');

    // Validar variables de entorno requeridas
    if (!resendKey && (!emailUser || !emailPass)) {
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
        bcc: emailUser, // Respaldo para que transformacion.digital reciba una copia en su buzón de entrada
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
    enviarResumenAgendaEmail
};

