import jwtConfig from './jwt.config.js';

describe('jwtConfig (spec 002, RN-2)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falla si JWT_SECRET no está definido', () => {
    vi.stubEnv('JWT_SECRET', undefined);
    expect(() => jwtConfig()).toThrow('JWT_SECRET no está definido');
  });

  it('falla si JWT_SECRET está vacío o solo tiene espacios', () => {
    vi.stubEnv('JWT_SECRET', '   ');
    expect(() => jwtConfig()).toThrow('JWT_SECRET no está definido');
  });

  it('usa JWT_SECRET y JWT_EXPIRE_IN cuando están definidos', () => {
    vi.stubEnv('JWT_SECRET', 'secreto-de-prueba');
    vi.stubEnv('JWT_EXPIRE_IN', '1d');
    expect(jwtConfig()).toEqual({
      secret: 'secreto-de-prueba',
      signOptions: { expiresIn: '1d' },
    });
  });
});
