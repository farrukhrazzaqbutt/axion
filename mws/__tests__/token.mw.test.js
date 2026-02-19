const tokenMw = require('../__token.mw');

describe('__token.mw', () => {
  let req, res, next;
  let managers;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() };
    next = jest.fn();
    managers = {
      responseDispatcher: { dispatch: jest.fn() },
      token: {
        verifyShortToken: jest.fn(),
      },
      user: null,
    };
  });

  const invoke = (mw) => mw({ req, res, next });

  it('should dispatch 401 when token header is missing', async () => {
    const mw = tokenMw({ managers });
    await invoke(mw);
    expect(managers.responseDispatcher.dispatch).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ ok: false, code: 401, errors: 'unauthorized' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should dispatch 401 when verifyShortToken returns null', async () => {
    req.headers.token = 'bad-token';
    managers.token.verifyShortToken.mockReturnValue(null);
    const mw = tokenMw({ managers });
    await invoke(mw);
    expect(managers.responseDispatcher.dispatch).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ ok: false, code: 401 })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should dispatch 401 when verifyShortToken throws', async () => {
    req.headers.token = 'bad-token';
    managers.token.verifyShortToken.mockImplementation(() => {
      throw new Error('invalid');
    });
    const mw = tokenMw({ managers });
    await invoke(mw);
    expect(managers.responseDispatcher.dispatch).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next with decoded when token is valid', async () => {
    req.headers.token = 'valid-token';
    const decoded = { userId: 'u1', userKey: 'k1' };
    managers.token.verifyShortToken.mockReturnValue(decoded);
    const mw = tokenMw({ managers });
    await invoke(mw);
    expect(next).toHaveBeenCalledWith(decoded);
  });

  it('should fetch user role/schoolId and call next when user model available', async () => {
    req.headers.token = 'valid-token';
    const decoded = { userId: 'u1' };
    managers.token.verifyShortToken.mockReturnValue(decoded);
    const userDoc = { role: 'school_admin', schoolId: 's1', isActive: true };
    managers.user = {
      mongomodels: {
        user: { findById: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(userDoc) }) },
      },
    };
    const mw = tokenMw({ managers });
    await invoke(mw);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', role: 'school_admin', schoolId: 's1' })
    );
  });

  it('should dispatch 401 when user not found or inactive', async () => {
    req.headers.token = 'valid-token';
    managers.token.verifyShortToken.mockReturnValue({ userId: 'u1' });
    managers.user = {
      mongomodels: {
        user: { findById: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }) },
      },
    };
    const mw = tokenMw({ managers });
    await invoke(mw);
    expect(managers.responseDispatcher.dispatch).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ code: 401, errors: 'user not found or inactive' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
