import { describe, expect, it } from 'vitest';
import {
  enlaceMapa,
  escaparHtml,
  hora,
  mensajeAlerta,
  mensajeBienvenida,
  mensajeCancelada,
  mensajeInvitacionInvalida,
  mensajeNoRegreso,
  mensajePrueba,
  mensajeQueEsElBot,
  mensajeTermino,
  mensajeUbicacion,
  type Ubicacion,
} from './messages.js';

// 22 oct 2026 en Tijuana es horario de verano (UTC-7): 21:05Z son las 14:05.
const ALERTA = new Date('2026-10-22T21:05:00Z');
const UBICACION: Ubicacion = {
  lat: 32.0471,
  lng: -115.4614,
  at: new Date('2026-10-22T20:58:00Z'),
};
const MAPA =
  'https://www.google.com/maps/search/?api=1&amp;query=32.0471,-115.4614';
const CORREO = 'ana@senda.bc';
const FALTA_SENAL = 'falta de señal';

const alerta = (motivo: 'INACTIVITY_TIMEOUT' | 'MANUAL_SOS') =>
  mensajeAlerta({
    usuario: 'Ana',
    motivo,
    triggeredAt: ALERTA,
    tipo: 'HIKING',
    ubicacion: UBICACION,
  });

const noRegreso = (ubicacion: Ubicacion | null = UBICACION) =>
  mensajeNoRegreso({
    usuario: 'Ana',
    returnBy: new Date('2026-10-22T20:30:00Z'),
    tipo: 'TRAIL_RUNNING',
    ubicacion,
  });

const todos = () => [
  mensajeBienvenida({ usuario: 'Ana', contacto: 'Mamá' }),
  mensajePrueba({ usuario: 'Ana', contacto: 'Mamá' }),
  alerta('INACTIVITY_TIMEOUT'),
  alerta('MANUAL_SOS'),
  noRegreso(),
  mensajeUbicacion({ usuario: 'Ana', ubicacion: UBICACION }),
  mensajeCancelada({ usuario: 'Ana' }),
  mensajeTermino({ usuario: 'Ana', endedAt: ALERTA }),
];

describe('formato (spec 008, T3)', () => {
  it('escribe las horas en America/Tijuana, de 24 h', () => {
    expect(hora(ALERTA)).toBe('14:05');
    // Invierno (UTC-8).
    expect(hora(new Date('2026-12-01T21:05:00Z'))).toBe('13:05');
  });

  it('agrega el día si la hora no es del mismo día que la referencia (RN-5)', () => {
    const ayer = new Date('2026-10-21T18:00:00Z');
    expect(hora(ayer, ALERTA)).toMatch(/^21 oct\.?, 11:00$/);
  });

  it('arma el enlace de Google Maps con lat,lng', () => {
    expect(enlaceMapa(32.0471, -115.4614)).toBe(
      'https://www.google.com/maps/search/?api=1&query=32.0471,-115.4614',
    );
  });

  it('escapa el HTML de Telegram', () => {
    expect(escaparHtml('<b>"Ana" & co</b>')).toBe(
      '&lt;b&gt;&quot;Ana&quot; &amp; co&lt;/b&gt;',
    );
  });
});

describe('mensajes (spec 008, T3)', () => {
  it('la bienvenida dice quién lo registró y qué recibirá (CA-5)', () => {
    const texto = mensajeBienvenida({ usuario: 'Ana', contacto: 'Mamá' });
    expect(texto).toContain('Hola, Mamá.');
    expect(texto).toContain(
      '<b>Ana</b> te registró como contacto de emergencia en SendaBC',
    );
    expect(texto).toContain('alerta con su última ubicación');
    expect(texto).toContain('no silenciar');
  });

  it('la prueba dice que es una prueba de parte del usuario (CA-6)', () => {
    const texto = mensajePrueba({ usuario: 'Ana', contacto: 'Mamá' });
    expect(texto).toContain('Mensaje de prueba de SendaBC');
    expect(texto).toContain('Ana envió este mensaje');
  });

  it('la alerta por inactividad lleva todo lo de RN-6 (CA-14)', () => {
    const texto = alerta('INACTIVITY_TIMEOUT');
    expect(texto).toContain('Alerta de SendaBC');
    expect(texto).toContain('Ana dejó de moverse y no respondió');
    expect(texto).toContain('Puede necesitar ayuda.');
    expect(texto).toContain('Hora de la alerta: 14:05');
    expect(texto).toContain('Actividad: Senderismo');
    expect(texto).toContain('Última ubicación, de las 13:58');
    expect(texto).toContain(`<a href="${MAPA}">ver en el mapa</a>`);
  });

  it('la alerta por SOS dice que pidió ayuda (CA-24)', () => {
    const texto = alerta('MANUAL_SOS');
    expect(texto).toContain('Ana pidió ayuda desde la app.');
    expect(texto).toContain('Puede necesitar ayuda.');
    expect(texto).not.toContain('dejó de moverse');
  });

  it('la alerta dice de cuándo es una ubicación vieja (RN-5)', () => {
    const texto = mensajeAlerta({
      usuario: 'Ana',
      motivo: 'INACTIVITY_TIMEOUT',
      triggeredAt: ALERTA,
      tipo: 'CYCLING',
      ubicacion: { ...UBICACION, at: new Date('2026-10-21T18:00:00Z') },
    });
    expect(texto).toMatch(/Última ubicación, de las 21 oct\.?, 11:00/);
    expect(texto).toContain('Actividad: Ciclismo');
  });

  it('el de hora de regreso dice que no ha confirmado su regreso y menciona la falta de señal (CA-18)', () => {
    const texto = noRegreso();
    expect(texto).toContain('Ana <b>no ha confirmado su regreso</b>');
    expect(texto).toContain('regresaría a las 13:30');
    expect(texto).toContain('Puede deberse a falta de señal');
    expect(texto).toContain('Actividad: Trail running');
    expect(texto).toContain('Última ubicación, de las 13:58');
    expect(texto).toContain(`<a href="${MAPA}">`);
    expect(texto).not.toContain('Puede necesitar ayuda');
  });

  it('sin ubicación registrada lo dice en lugar del enlace', () => {
    const texto = noRegreso(null);
    expect(texto).toContain('la app no registró ninguna');
    expect(texto).not.toContain('google.com/maps');
  });

  it('solo el de hora de regreso menciona la falta de señal (P11)', () => {
    const conFalta = todos().filter((t) => t.includes(FALTA_SENAL));
    expect(conFalta).toEqual([noRegreso()]);
  });

  it('la ubicación actualizada lleva la hora y el enlace (CA-16)', () => {
    const texto = mensajeUbicacion({ usuario: 'Ana', ubicacion: UBICACION });
    expect(texto).toContain('Ubicación actualizada de Ana, de las 13:58');
    expect(texto).toContain(`<a href="${MAPA}">`);
  });

  it('cancelada dice que el usuario está bien (CA-25)', () => {
    expect(mensajeCancelada({ usuario: 'Ana' })).toContain(
      '<b>Ana está bien.</b>',
    );
  });

  it('terminó dice que terminó su actividad y está bien (CA-22)', () => {
    const texto = mensajeTermino({ usuario: 'Ana', endedAt: ALERTA });
    expect(texto).toContain('<b>Ana terminó su actividad y está bien.</b>');
    expect(texto).toContain('a las 14:05');
  });

  it('escapa el nombre del usuario y del contacto en todos los textos', () => {
    const usuario = '<i>Ana</i> & "Beto"';
    const textos = [
      mensajeBienvenida({ usuario, contacto: '<script>' }),
      mensajePrueba({ usuario, contacto: '<script>' }),
      mensajeAlerta({
        usuario,
        motivo: 'MANUAL_SOS',
        triggeredAt: ALERTA,
        tipo: 'HIKING',
        ubicacion: UBICACION,
      }),
      mensajeNoRegreso({
        usuario,
        returnBy: ALERTA,
        tipo: 'HIKING',
        ubicacion: null,
      }),
      mensajeUbicacion({ usuario, ubicacion: UBICACION }),
      mensajeCancelada({ usuario }),
      mensajeTermino({ usuario, endedAt: ALERTA }),
    ];
    for (const texto of textos) {
      expect(texto).toContain('&lt;i&gt;Ana&lt;/i&gt; &amp; &quot;Beto&quot;');
      expect(texto).not.toContain('<i>');
      expect(texto).not.toContain('<script>');
    }
  });

  it('ningún texto incluye el correo del usuario (RN-6)', () => {
    for (const texto of todos()) {
      expect(texto).not.toContain(CORREO);
      expect(texto).not.toContain('@');
    }
  });
});

describe('respuestas del bot (spec 008, T5)', () => {
  it('la invitación inválida explica por qué y qué hacer', () => {
    const texto = mensajeInvitacionInvalida();
    expect(texto).toContain('no es válida');
    expect(texto).toContain('ya se haya usado');
    expect(texto).toContain('ya seas contacto de emergencia');
    expect(texto).toContain('te comparta el enlace de nuevo');
  });

  it('a otro mensaje explica qué es el bot', () => {
    const texto = mensajeQueEsElBot();
    expect(texto).toContain('bot de avisos de SendaBC');
    expect(texto).toContain('enlace de invitación');
  });
});
