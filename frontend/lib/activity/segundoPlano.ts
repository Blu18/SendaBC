// ¿Se graba en segundo plano o con la pantalla encendida? (spec 008, CA-10). Sin React Native,
// para probarlo con Vitest (constitución 6.1). La app funciona sin el permiso (constitución 3.5).

export type ModoGrabacion = 'background' | 'foreground';

export type DecisionSegundoPlano = ModoGrabacion | 'cancelar';

export type DependenciasSegundoPlano = {
  // Estado actual del permiso de ubicación en segundo plano.
  permiso(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  pedir(): Promise<{ granted: boolean }>;
  // Explica para qué es el permiso y dice si el usuario quiere darlo. Solo se pasa con contactos
  // activos: sin ellos no hay a quién avisar.
  explicar?: () => Promise<boolean>;
  // El sistema ya no deja pedirlo: avisa antes de iniciar. Devuelve true para grabar así, o false
  // si el usuario fue a los ajustes y la actividad no debe iniciar todavía (spec 011, F2).
  avisarSinPermiso?: () => Promise<boolean>;
};

export async function decidirSegundoPlano(
  deps: DependenciasSegundoPlano
): Promise<DecisionSegundoPlano> {
  const actual = await deps.permiso();
  if (actual.granted) return 'background';
  if (!deps.explicar) return 'foreground';
  if (!actual.canAskAgain) {
    if (deps.avisarSinPermiso && !(await deps.avisarSinPermiso())) return 'cancelar';
    return 'foreground';
  }
  if (!(await deps.explicar())) return 'foreground';
  return (await deps.pedir()).granted ? 'background' : 'foreground';
}
