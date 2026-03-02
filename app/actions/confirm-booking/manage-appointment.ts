'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { revalidatePath } from 'next/cache'
import { compileEmailTemplate } from '@/lib/email-helper'
import { sendWhatsAppNotification } from '@/lib/whatsapp-helper'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --- CREATE ---
export async function createAppointment(slug: string, bookingData: any) {
  try {
    // 1. Validaciones iniciales
    const { data: negocio } = await supabase.from('negocios').select('*').eq('slug', slug).single()
    if (!negocio) throw new Error('Negocio no encontrado')

    // 2. Preparar los datos (Mantenemos tu lógica de servicio + profesional)
    const servicioConProfesional = `${bookingData.service} - ${bookingData.workerName || 'Cualquiera'}`;
    const emailNormalizado = bookingData.clientEmail?.trim().toLowerCase();

    const turnoData = {
        negocio_id: negocio.id,
        cliente_nombre: bookingData.clientName,
        cliente_telefono: bookingData.clientPhone,
        cliente_email: bookingData.clientEmail,
        servicio: servicioConProfesional,
        fecha_inicio: bookingData.start,
        fecha_fin: bookingData.end,
        mensaje: bookingData.message,
        fotos: bookingData.images,
        estado: 'pendiente', // <--- CAMBIO: Ahora nace como pendiente
        google_event_id: null, // <--- No tiene evento aún
        recordatorio_enviado: false
    };

    // 3. Guardar en Supabase (Tu lógica A, B y C intacta)
    const { data: turnosExistentes } = await supabase
      .from('turnos')
      .select('id')
      .eq('negocio_id', negocio.id)
      .ilike('cliente_email', emailNormalizado)
      .limit(1)
    
    const turnoExistente = turnosExistentes && turnosExistentes.length > 0 ? turnosExistentes[0] : null;

    let turnoGuardadoId = null;

    if (turnoExistente) {
      const { error } = await supabase.from('turnos').update(turnoData).eq('id', turnoExistente.id)
      if (error) throw error
      turnoGuardadoId = turnoExistente.id;
    } else {
      const { data: nuevoTurno, error } = await supabase.from('turnos').insert(turnoData).select('id').single()
      if (error) throw error
      turnoGuardadoId = nuevoTurno.id;
    }

    // --- NUEVO: LÓGICA DE AUTO-CONFIRMACIÓN DESDE EL BACKEND ---
    const configWeb = negocio.config_web || {};
    const requireManual = configWeb.booking?.requireManualConfirmation ?? true;

    if (!requireManual && turnoGuardadoId) {
        
        // 1. Buscamos el servicio en la configuración del negocio
        const allServices = [
            ...(configWeb.servicios?.items || []), 
            ...(configWeb.services || [])
        ];
        
        // Comparamos el nombre que llegó con los títulos de los servicios guardados
        const serviceFound = allServices.find((s: any) => 
            (s.titulo === bookingData.service || s.name === bookingData.service)
        );

        // 2. Extraemos el precio y lo convertimos a número limpio
        const rawPrice = serviceFound?.precio || serviceFound?.price || 0;
        const finalPrice = typeof rawPrice === 'string' ? Number(rawPrice.replace(/[^0-9.-]+/g,"")) : Number(rawPrice);

        // 3. Ejecutamos la aprobación automática internamente
        const approvalRes = await approveAppointment(turnoGuardadoId, finalPrice);
        
        if (!approvalRes.success) {
            console.error("Error en auto-confirmación:", approvalRes.error);
        }
        
        revalidatePath('/dashboard')
        return { success: true, pending: false } // Avisamos al frontend que NO quedó pendiente
    }
    
    // notificacion profesional

    try {
        const configWeb = negocio.config_web;
        const profesionales = configWeb?.equipo?.items || [];
        
        // Buscamos los datos del profesional usando el workerId de la reserva
        const trabajador = profesionales.find((p: any) => String(p.id) === String(bookingData.workerId));
        
        // Destinatario: prioridad al mail del profesional, fallback al mail del negocio
        const emailDestino = trabajador?.email || negocio.email_contacto || negocio.usuario_email;

        if (emailDestino && negocio.google_refresh_token) {
            
            // --- AGREGAMOS LA AUTENTICACIÓN AQUÍ PARA EVITAR EL ERROR ---
            const auth = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID, 
                process.env.GOOGLE_CLIENT_SECRET
            );
            auth.setCredentials({ refresh_token: negocio.google_refresh_token });
            // -----------------------------------------------------------

            const gmail = google.gmail({ version: 'v1', auth });
            
            // Formateamos la fecha para que se lea bien en Argentina
            const textoFecha = new Date(bookingData.start).toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            const subject = `Nueva Reserva: ${bookingData.service} - ${bookingData.clientName}`;
            const htmlBody = `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Nueva Cita en Agenda</h2>
                    <p>Hola <strong>${trabajador?.nombre || 'Equipo'}</strong>,</p>
                    <p>Tienes un nuevo turno:</p>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Servicio:</strong> ${bookingData.service}</li>
                        <li><strong>Fecha:</strong> ${textoFecha}</li>
                        <li><strong>Cliente:</strong> ${bookingData.clientName}</li>
                        <li><strong>Teléfono:</strong> ${bookingData.clientPhone}</li>
                    </ul>
                </div>
            `;

            const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
            const messageParts = [
                `To: ${emailDestino}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                `Subject: ${utf8Subject}`,
                '',
                htmlBody,
            ];

            const raw = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            
            await gmail.users.messages.send({
                userId: 'me',
                requestBody: { raw },
            });
        }
    } catch (errorNotificacion) {
        console.error("No se pudo notificar al profesional/negocio:", errorNotificacion);
    }

    revalidatePath('/dashboard')
    return { success: true, pending: true } // Avisamos al frontend que SÍ quedó pendiente

  } catch (error: any) {
    console.error('Error creating request:', error)
    return { success: false, error: error.message }
  }
}

export async function approveAppointment(appointmentId: string, finalPrice?: number) {
  try {
    // 1. Obtener datos
    const { data: turno, error: tErr } = await supabase
      .from('turnos')
      .select('*, negocios(*)')
      .eq('id', appointmentId)
      .single()

    if (tErr || !turno) throw new Error('Turno no encontrado')
    const negocio = turno.negocios
    
    // 2. Auth y Validación de Google Calendar
    if (!negocio?.google_refresh_token) {
        throw new Error('El negocio no tiene conectado Google Calendar')
    }

    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID, 
        process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: negocio.google_refresh_token });
    const calendar = google.calendar({ version: 'v3', auth });

    // 3. Determinar flujo
    const configWeb = negocio.config_web || {};
    const teamConfig = configWeb.equipo || {};
    const bookingConfig = configWeb.booking || { requestDeposit: false, depositPercentage: 50 };
    
    const necesitaSenia = bookingConfig.requestDeposit && bookingConfig.depositPercentage > 0;
    
    let nuevoEstado = necesitaSenia ? 'esperando_senia' : 'confirmado';
    let googleEventId = null;

    // --- CREACIÓN DEL EVENTO EN GOOGLE CALENDAR ---
    // Solo creamos el evento AHORA si NO necesita seña. 
    // Si necesita seña, se crea después cuando pagan.
    if (!necesitaSenia) {
        try {
            const event = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: `Turno: ${turno.cliente_nombre}`,
                    description: `Servicio: ${turno.servicio}\nTel: ${turno.cliente_telefono}\nCONFIRMADO`,
                    start: { dateTime: turno.fecha_inicio, timeZone: 'America/Argentina/Buenos_Aires' },
                    end: { dateTime: turno.fecha_fin, timeZone: 'America/Argentina/Buenos_Aires' },
                    attendees: turno.cliente_email ? [{ email: turno.cliente_email }] : [],
                    extendedProperties: { shared: { saas_service_type: 'confirm_booking' } },
                    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 1440 }] }
                }
            });
            // Guardamos el ID para actualizar Supabase
            googleEventId = event.data.id;
        } catch (calendarError) {
            console.error("Error al crear evento en Calendar:", calendarError);
            // Opcional: podrías lanzar un error aquí si quieres que falle todo si Google falla
        }
    }
    // ---------------------------------------------

    // 4. Enviar Email
    const templateType = necesitaSenia ? 'deposit' : 'confirmation';
    const notifConfig = configWeb.notifications?.[templateType] || { enabled: true, sendViaEmail: true, sendViaWhatsapp: false };

    if (notifConfig.enabled) {
        const precioNumerico = finalPrice || 0;
        const depositAmount = necesitaSenia ? (precioNumerico * bookingConfig.depositPercentage) / 100 : 0;
        
        const serviceString = turno.servicio || "";
        const parts = serviceString.split(" - ");
        const workerName = parts.length > 1 ? parts[parts.length - 1] : null;

        const trabajadorElegido = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName);

        const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        // Variables comunes para ambos canales
        const variablesNotificacion = {
            cliente: turno.cliente_nombre,
            servicio: turno.servicio,
            fecha: fechaLegible,
            profesional: workerName || '',
            precio_total: `$${precioNumerico}`, 
            monto_senia: `$${depositAmount}`,
            link_pago: "", 
            alias: trabajadorElegido?.aliasCvu || '',
            telefono_trabajador: trabajadorElegido?.telefono || ''
        };

        // --- CANAL: WHATSAPP ---
        if (notifConfig.sendViaWhatsapp && turno.cliente_telefono) {
            await sendWhatsAppNotification(
                turno.cliente_telefono, 
                templateType, 
                variablesNotificacion,
                negocio.whatsapp_access_token, // O instancia correspondiente
                notifConfig.whatsappBody || notifConfig.body, // Prioridad al texto de WA
                notifConfig.bannerUrl

            );
        }

        // --- CANAL: EMAIL ---
        if (notifConfig.sendViaEmail !== false && turno.cliente_email) {
            const emailData = compileEmailTemplate(templateType, configWeb, variablesNotificacion);

            if (emailData) {
                const gmail = google.gmail({ version: 'v1', auth });
                const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;
                const messageParts = [
                    `To: ${turno.cliente_email}`,
                    'Content-Type: text/html; charset=utf-8',
                    'MIME-Version: 1.0',
                    `Subject: ${utf8Subject}`,
                    '',
                    emailData.html,
                ];
                
                const rawMessage = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                try {
                    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } });
                } catch (e) {
                    console.error("Error enviando correo:", e);
                }
            }
        }
    }

    // 5. Actualizar DB 
    const { error } = await supabase
      .from('turnos')
      .update({ 
          estado: nuevoEstado, 
          google_event_id: googleEventId, // Guardamos el ID del calendario aquí
          precio_total: finalPrice || 0 
      })
      .eq('id', appointmentId)

    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true }

  } catch (error: any) {
    console.error('Error approving:', error)
    return { success: false, error: error.message }
  }
}

// --- AGREGAR: markDepositPaid ---
// Esta función es la que FINALMENTE crea el evento en Google cuando pagan.
export async function markDepositPaid(turnoId: string) {
    try {
        const { data: turno, error: tErr } = await supabase
            .from('turnos')
            .select('*, negocios(*)')
            .eq('id', turnoId)
            .single()

        if (tErr || !turno) throw new Error('Turno no encontrado');
        const negocio = turno.negocios;
        
        // Auth Google
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
        auth.setCredentials({ refresh_token: negocio.google_refresh_token })
        const calendar = google.calendar({ version: 'v3', auth })
        const gmail = google.gmail({ version: 'v1', auth });

        // 1. CHEQUEO DE DISPONIBILIDAD (CRÍTICO)
        // Como no bloqueamos antes, puede que alguien haya ocupado el lugar manualmente.
        const conflictCheck = await calendar.events.list({
            calendarId: 'primary',
            timeMin: turno.fecha_inicio, 
            timeMax: turno.fecha_fin,
            singleEvents: true,
            timeZone: 'America/Argentina/Buenos_Aires'
        })

        if (conflictCheck.data.items && conflictCheck.data.items.length > 0) {
            // Filtramos eventos transparentes o cancelados
            const conflicts = conflictCheck.data.items.filter(e => e.transparency !== 'transparent' && e.status !== 'cancelled');
            if (conflicts.length > 0) {
                 throw new Error('⚠️ ¡CUIDADO! El horario se ocupó en Google Calendar mientras esperábamos el pago.');
            }
        }

        // 2. Crear Evento en Google
        const event = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: `Turno: ${turno.cliente_nombre}`,
                description: `Servicio: ${turno.servicio}\nTel: ${turno.cliente_telefono}\nSEÑA ABONADA - CONFIRMADO`,
                start: { dateTime: turno.fecha_inicio, timeZone: 'America/Argentina/Buenos_Aires' },
                end: { dateTime: turno.fecha_fin, timeZone: 'America/Argentina/Buenos_Aires' },
                attendees: turno.cliente_email ? [{ email: turno.cliente_email }] : [],
                extendedProperties: { shared: { saas_service_type: 'confirm_booking' } },
                reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 1440 }] }
            }
        })

        const configWeb = negocio.config_web || {};
        const bookingConfig = configWeb.booking || { depositPercentage: 50 };
        const notifConfig = configWeb.notifications?.['confirmation'] || { enabled: true, sendViaEmail: true, sendViaWhatsapp: false };

        if (notifConfig.enabled) {
            // A. Recuperamos valores
            const precioTotal = turno.precio_total || 0; 
            const porcentajeSenia = bookingConfig.depositPercentage || 50;

            // B. Calculamos
            const montoPagado = (precioTotal * porcentajeSenia) / 100;
            const saldoRestante = precioTotal - montoPagado;
            
            // Formatear Fecha
            const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            // Buscar al profesional
            const serviceString = turno.servicio || "";
            const parts = serviceString.split(" - ");
            const workerName = parts.length > 1 ? parts[parts.length - 1] : null;
            const trabajadorElegido = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName);

            const variablesNotificacion = {
                cliente: turno.cliente_nombre,
                servicio: turno.servicio,
                fecha: fechaLegible,
                precio_total: `$${precioTotal}`,     
                monto_senia: `$${montoPagado}`,      
                precio_a_pagar: `$${saldoRestante}`, 
                alias: trabajadorElegido?.aliasCvu || '',
                telefono_trabajador: trabajadorElegido?.telefono || '',
                profesional: workerName || ''
            };

            // --- CANAL: WHATSAPP ---
            if (notifConfig.sendViaWhatsapp && turno.cliente_telefono && negocio.whatsapp_access_token) {
                try {
                    await sendWhatsAppNotification(
                        turno.cliente_telefono,
                        'confirmation',
                        variablesNotificacion,
                        negocio.whatsapp_access_token,
                        // CAMBIO: Usar whatsappBody con fallback a body
                        notifConfig.whatsappBody || notifConfig.body, 
                        // CAMBIO: Agregar el bannerUrl como 6to parámetro
                        notifConfig.bannerUrl 
                    );
                } catch(e) {
                    console.error("Error WhatsApp confirmación final:", e);
                }
            }

            // --- CANAL: EMAIL ---
            if (notifConfig.sendViaEmail !== false && turno.cliente_email) {
                const emailData = compileEmailTemplate('confirmation', configWeb, variablesNotificacion);

                if (emailData) {
                    const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;
                    const messageParts = [
                        `To: ${turno.cliente_email}`,
                        'Content-Type: text/html; charset=utf-8',
                        'MIME-Version: 1.0',
                        `Subject: ${utf8Subject}`,
                        '',
                        emailData.html,
                    ];
                    const rawMessage = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    try { 
                        await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } }); 
                    } catch(e) { console.error("Error Email confirmación final:", e); }
                }
            }
        }

        // 4. Actualizar DB
        const { error } = await supabase
            .from('turnos')
            .update({ estado: 'confirmado', google_event_id: event.data.id })
            .eq('id', turnoId);

        if (error) throw error;
        revalidatePath('/dashboard');
        return { success: true };

    } catch (error: any) {
        console.error('Error marking paid:', error);
        return { success: false, error: error.message };
    }
}

// --- CANCEL ---
export async function cancelAppointment(appointmentId: string) {
  try {
    // 1. Obtener datos del turno y refresh token del negocio asociado
    const { data: turno, error: turnoError } = await supabase
      .from('turnos')
      .select('*, negocios(google_refresh_token)')
      .eq('id', appointmentId)
      .single()

    if (turnoError || !turno) throw new Error('Turno no encontrado')

    // @ts-ignore: Supabase join returns array or object depending on query, assuming object here due to FK
    const refreshToken = turno.negocios?.google_refresh_token
    
    if (!refreshToken) throw new Error('No se pudo conectar con Google Calendar del negocio')

    // 2. Auth con Google
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
        auth.setCredentials({ refresh_token: refreshToken })
        const calendar = google.calendar({ version: 'v3', auth })

    // 3. Eliminar de Google Calendar (si tiene ID de evento)
    if (turno.google_event_id) {
          try {
            await calendar.events.delete({ calendarId: 'primary', eventId: turno.google_event_id })
          } catch (gError) { console.warn('Evento ya borrado en Google', gError) }
        }

    // 4. Actualizar estado en Supabase
    const { error: deleteError } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado' }) 
      .eq('id', appointmentId)

    if (deleteError) throw deleteError

    // 5. Revalidar UI
    revalidatePath('/dashboard') 
    
    return { success: true }

  } catch (error: any) {
    console.error('Error canceling appointment:', error)
    return { success: false, error: error.message }
  }
}

export async function createManualAppointment(slug: string, bookingData: any) {
  try {
    // 1. Obtener negocio y auth
    const { data: negocio } = await supabase.from('negocios').select('*').eq('slug', slug).single()
    if (!negocio?.google_refresh_token) throw new Error('Negocio no conectado')

    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // 2. Crear evento en Google Calendar primero para tener el ID
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Turno Manual: ${bookingData.clientName}`,
        description: `Servicio: ${bookingData.service}\nTel: ${bookingData.clientPhone}\nAgendado manualmente desde el dashboard.`,
        start: { dateTime: bookingData.start, timeZone: 'America/Argentina/Buenos_Aires' },
        end: { dateTime: bookingData.end, timeZone: 'America/Argentina/Buenos_Aires' },
        extendedProperties: {
          shared: {
            saas_worker_id: bookingData.workerId,
            saas_service_type: 'confirm_booking_manual'
          }
        }
      }
    })

    // 3. Guardar en Supabase directamente como 'confirmado'
    const { error } = await supabase.from('turnos').insert({
      negocio_id: negocio.id,
      cliente_nombre: bookingData.clientName,
      cliente_telefono: bookingData.clientPhone,
      cliente_email: bookingData.clientEmail,
      servicio: `${bookingData.service} - ${bookingData.workerName}`,
      fecha_inicio: bookingData.start,
      fecha_fin: bookingData.end,
      estado: 'confirmado',
      google_event_id: event.data.id
    })

    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error manual booking:', error)
    return { success: false, error: error.message }
  }
}