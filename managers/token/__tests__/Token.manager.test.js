const TokenManager = require('../Token.manager');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('TokenManager', () => {
  const config = {
    dotEnv: {
      LONG_TOKEN_SECRET: 'long-secret',
      SHORT_TOKEN_SECRET: 'short-secret',
    },
  };
  let tokenManager;

  beforeEach(() => {
    jest.clearAllMocks();
    tokenManager = new TokenManager({ config });
  });

  describe('genLongToken', () => {
    it('should call jwt.sign with correct payload and long token secret', () => {
      jwt.sign.mockReturnValue('mock-long-token');
      const result = tokenManager.genLongToken({
        userId: 'user123',
        userKey: 'key123',
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        { userKey: 'key123', userId: 'user123' },
        'long-secret',
        expect.objectContaining({ expiresIn: '3y' })
      );
      expect(result).toBe('mock-long-token');
    });
  });

  describe('genShortToken', () => {
    it('should call jwt.sign with short token secret', () => {
      jwt.sign.mockReturnValue('mock-short-token');
      tokenManager.genShortToken({
        userId: 'u1',
        userKey: 'k1',
        sessionId: 's1',
        deviceId: 'd1',
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        { userKey: 'k1', userId: 'u1', sessionId: 's1', deviceId: 'd1' },
        'short-secret',
        expect.objectContaining({ expiresIn: '1y' })
      );
    });
  });

  describe('_verifyToken', () => {
    it('should return decoded payload when token is valid', () => {
      const decoded = { userId: 'u1' };
      jwt.verify.mockReturnValue(decoded);
      const result = tokenManager._verifyToken({
        token: 'valid-token',
        secret: 'short-secret',
      });
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'short-secret');
      expect(result).toEqual(decoded);
    });

    it('should return null when verification throws', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });
      const result = tokenManager._verifyToken({
        token: 'bad-token',
        secret: 'short-secret',
      });
      expect(result).toBeNull();
    });
  });

  describe('verifyLongToken', () => {
    it('should verify using LONG_TOKEN_SECRET', () => {
      jwt.verify.mockReturnValue({ userId: 'u1' });
      tokenManager.verifyLongToken({ token: 't' });
      expect(jwt.verify).toHaveBeenCalledWith('t', 'long-secret');
    });
  });

  describe('verifyShortToken', () => {
    it('should verify using SHORT_TOKEN_SECRET', () => {
      jwt.verify.mockReturnValue({ userId: 'u1' });
      tokenManager.verifyShortToken({ token: 't' });
      expect(jwt.verify).toHaveBeenCalledWith('t', 'short-secret');
    });
  });

  describe('v1_createShortToken', () => {
    it('should return shortToken from long token and device', () => {
      jwt.sign.mockReturnValue('new-short-token');
      const result = tokenManager.v1_createShortToken({
        __longToken: { userId: 'u1', userKey: 'k1' },
        __device: { ua: 'test' },
      });
      expect(result).toEqual({ shortToken: 'new-short-token' });
      expect(jwt.sign).toHaveBeenCalled();
    });
  });
});
