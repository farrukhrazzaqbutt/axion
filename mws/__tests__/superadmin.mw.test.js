const superadminMw = require('../__superadmin.mw');

describe('__superadmin.mw', () => {
  let req, res, next;
  let managers;
  let results;

  beforeEach(() => {
    req = {};
    res = { status: jest.fn().mockReturnThis(), send: jest.fn().mockReturnThis() };
    next = jest.fn();
    results = {};
    managers = {
      responseDispatcher: { dispatch: jest.fn() },
    };
  });

  const invoke = (mw) => {
    mw({ req, res, results, next });
  };

  it('should dispatch 401 when no token in results', () => {
    const mw = superadminMw({ managers });
    invoke(mw);
    expect(managers.responseDispatcher.dispatch).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ code: 401, errors: 'authentication required' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should dispatch 403 when token role is not superadmin', () => {
    results.__token = { role: 'school_admin' };
    const mw = superadminMw({ managers });
    invoke(mw);
    expect(managers.responseDispatcher.dispatch).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ code: 403, errors: 'superadmin access required' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next with token when role is superadmin', () => {
    const token = { role: 'superadmin', userId: 'u1' };
    results.__token = token;
    const mw = superadminMw({ managers });
    invoke(mw);
    expect(managers.responseDispatcher.dispatch).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(token);
  });

  it('should accept token from __tokenWithUser', () => {
    const token = { role: 'superadmin' };
    results.__tokenWithUser = token;
    const mw = superadminMw({ managers });
    invoke(mw);
    expect(next).toHaveBeenCalledWith(token);
  });
});
