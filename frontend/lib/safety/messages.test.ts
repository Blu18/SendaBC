import { describe, expect, it } from 'vitest';
import { UMBRALES } from './inactivity';
import {
  AVISO_911,
  CONTACTS_PAGE_MESSAGES,
  formatoCuentaRegresiva,
  listaNombres,
  SAFETY_MESSAGES,
  textoAlertaEnviada,
  textoInvitacion,
  textoPregunta,
  textoPruebaFallida,
  textoRegreso,
  textoQuitar,
  textoSeguridadActiva,
  textoTerminarSinRed,
} from './messages';

const TZ = 'America/Tijuana';
const H = 60 * 60_000;
// 22 oct 2026, 9:00 en Tijuana (UTC-7).
const T = Date.UTC(2026, 9, 22, 16, 0);

describe('listaNombres', () => {
  it('une los nombres en español', () => {
    expect(listaNombres([])).toBe('');
    expect(listaNombres(['Mamá'])).toBe('Mamá');
    expect(listaNombres(['Mamá', 'Beto'])).toBe('Mamá y Beto');
    expect(listaNombres(['Mamá', 'Beto', 'Tía'])).toBe('Mamá, Beto y Tía');
  });
});

describe('al iniciar (CA-8, CA-9, CA-10)', () => {
  it('dice a quiénes se avisaría', () => {
    expect(textoSeguridadActiva(['Mamá', 'Beto'])).toBe(
      'Seguridad activa: si te pasa algo, avisaríamos a Mamá y Beto.'
    );
  });

  it('sin contactos activos avisa que no se puede avisar a nadie, con una forma de configurarlos', () => {
    expect(SAFETY_MESSAGES.sinContactos).toContain('no podremos avisar a nadie');
    expect(SAFETY_MESSAGES.configurar).toBe('Configurar contactos');
  });

  it('explica para qué es el permiso en segundo plano y qué pasa sin él', () => {
    expect(SAFETY_MESSAGES.permisoExplicacion).toContain('solo mientras grabas una actividad');
    expect(SAFETY_MESSAGES.sinPermiso).toContain('solo funciona con la app abierta');
  });
});

describe('"¿Estás bien?" (CA-11)', () => {
  it('usa los umbrales de RN-4', () => {
    expect(textoPregunta()).toEqual({
      titulo: '¿Estás bien?',
      cuerpo:
        'Llevas 10 minutos sin moverte. Si no respondes en 2 minutos, avisaremos a tus contactos de emergencia.',
      boton: 'Estoy bien',
    });
  });

  it('refleja los umbrales cortos de los casos manuales', () => {
    expect(textoPregunta({ ...UMBRALES, quietoMs: 60_000, respuestaMs: 60_000 }).cuerpo).toContain(
      'Llevas 1 minuto sin moverte. Si no respondes en 1 minuto'
    );
  });

  it('formatea la cuenta regresiva como m:ss, redondeando hacia arriba', () => {
    expect(formatoCuentaRegresiva(120_000)).toBe('2:00');
    expect(formatoCuentaRegresiva(65_000)).toBe('1:05');
    expect(formatoCuentaRegresiva(500)).toBe('0:01');
    expect(formatoCuentaRegresiva(0)).toBe('0:00');
    expect(formatoCuentaRegresiva(-1000)).toBe('0:00');
  });
});

describe('alerta y hora de regreso (CA-17, CA-21, CA-23)', () => {
  it('dice cuándo se envió la alerta y a quiénes', () => {
    expect(textoAlertaEnviada(T + 5 * 60_000, ['Mamá', 'Beto'], TZ)).toBe(
      'Alerta enviada a las 09:05 a Mamá y Beto.'
    );
    expect(textoAlertaEnviada(T, [], TZ)).toBe('Alerta enviada a las 09:00.');
    expect(textoRegreso(T + 3 * 60 * 60_000, TZ)).toBe('Regreso a las 12:00');
  });

  it('al terminar sin red avisa a qué hora llegaría el mensaje (regreso + 30 min)', () => {
    expect(textoTerminarSinRed(T + 3 * H, TZ)).toBe(
      'No tienes conexión. Si tu teléfono no se conecta antes de las 12:30, tus contactos recibirán un mensaje de que no has confirmado tu regreso.'
    );
  });

  it('dice si la hora de regreso está enviada o pendiente', () => {
    expect(SAFETY_MESSAGES.regresoEnviado).toBe('Hora de regreso enviada.');
    expect(SAFETY_MESSAGES.regresoPendiente).toContain('el servidor no podrá avisar');
  });
});

describe('invitación y aviso del 911', () => {
  it('el texto de la invitación lleva el enlace y cómo aceptar (CA-1)', () => {
    const texto = textoInvitacion('https://t.me/senda_bc_bot?start=abc');
    expect(texto).toContain('contacto de emergencia en SendaBC');
    expect(texto).toContain('toca "Iniciar"');
    expect(texto.endsWith('https://t.me/senda_bc_bot?start=abc')).toBe(true);
  });

  it('dice que SendaBC no sustituye al 911 y de qué dependen las alertas', () => {
    expect(AVISO_911).toContain('no sustituye a los servicios de emergencia (911)');
    expect(AVISO_911).toContain('señal');
  });
});

describe('pantalla "Seguridad" (CA-1 a CA-7)', () => {
  it('explica qué hacer con un pendiente y con uno que no recibe mensajes', () => {
    expect(CONTACTS_PAGE_MESSAGES.pendiente).toContain('Telegram');
    expect(CONTACTS_PAGE_MESSAGES.inalcanzable).toContain('Vuelve a compartirle la invitación');
  });

  it('confirma antes de quitar un contacto (CA-3)', () => {
    expect(textoQuitar('Mamá')).toBe(
      '¿Quitar a Mamá? Dejará de recibir tus avisos y su invitación ya no servirá.'
    );
  });

  it('dice por qué no se envió la prueba (CA-6)', () => {
    expect(textoPruebaFallida('El contacto bloqueó a SendaBC o borró la conversación en Telegram')).toBe(
      'No se envió: El contacto bloqueó a SendaBC o borró la conversación en Telegram.'
    );
    expect(textoPruebaFallida(null)).toBe('No se envió el mensaje de prueba.');
  });
});
