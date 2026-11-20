import { afterEach, describe, expect, it } from 'vitest';
import { focusManager, onlineManager, QueryObserver } from '@tanstack/react-query';
import { conectarConsultas, crearQueryClient } from './reconexion';
import type { EstadoRed } from '../sync/network';

// Fuentes falsas de red y de estado de la app, para disparar los cambios a mano.
function fuentes() {
  let red: ((e: EstadoRed) => void) | null = null;
  let app: ((e: string) => void) | null = null;
  conectarConsultas({
    suscribirRed: (oyente) => ((red = oyente), () => (red = null)),
    suscribirApp: (oyente) => ((app = oyente), () => (app = null)),
  });
  return {
    red: (e: EstadoRed) => red?.(e),
    app: (e: string) => app?.(e),
  };
}

// Una consulta observada (como una pantalla abierta) que falla la primera vez y después responde.
function consultaQueFallaUnaVez() {
  const client = crearQueryClient();
  client.mount(); // lo hace QueryClientProvider en la app
  let llamadas = 0;
  const observer = new QueryObserver(client, {
    queryKey: ['perfil'],
    retry: false,
    queryFn: async () => {
      llamadas++;
      if (llamadas === 1) throw new Error('servidor caído');
      return 'blu';
    },
  });
  const quitar = observer.subscribe(() => {});
  return { observer, quitar, llamadas: () => llamadas };
}

const esperar = (cond: () => boolean) =>
  new Promise<void>((resolve, reject) => {
    const inicio = Date.now();
    const revisar = () => {
      if (cond()) return resolve();
      if (Date.now() - inicio > 1000) return reject(new Error('tiempo agotado'));
      setTimeout(revisar, 5);
    };
    revisar();
  });

afterEach(() => {
  onlineManager.setOnline(true);
  focusManager.setFocused(undefined);
});

describe('reconexión de consultas (spec 011, F7)', () => {
  it('una consulta con error se repite cuando vuelve la red', async () => {
    const f = fuentes();
    const c = consultaQueFallaUnaVez();
    await esperar(() => c.observer.getCurrentResult().isError);

    f.red({ isConnected: false });
    f.red({ isConnected: true, isInternetReachable: true });

    await esperar(() => c.observer.getCurrentResult().isSuccess);
    expect(c.observer.getCurrentResult().data).toBe('blu');
    expect(c.llamadas()).toBe(2);
    c.quitar();
  });

  it('una consulta con error se repite cuando la app vuelve al frente', async () => {
    const f = fuentes();
    const c = consultaQueFallaUnaVez();
    await esperar(() => c.observer.getCurrentResult().isError);

    f.app('background');
    f.app('active');

    await esperar(() => c.observer.getCurrentResult().isSuccess);
    expect(c.llamadas()).toBe(2);
    c.quitar();
  });

  it('sin red las consultas se siguen ejecutando: cada una decide qué hacer (copia local)', async () => {
    const f = fuentes();
    f.red({ isConnected: false });
    const client = crearQueryClient();
    client.mount();
    const observer = new QueryObserver(client, {
      queryKey: ['contactos'],
      queryFn: async () => 'copia del teléfono',
    });
    const quitar = observer.subscribe(() => {});

    await esperar(() => observer.getCurrentResult().isSuccess);
    expect(observer.getCurrentResult().fetchStatus).toBe('idle');
    quitar();
  });
});
