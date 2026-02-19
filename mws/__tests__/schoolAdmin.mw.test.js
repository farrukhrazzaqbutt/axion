const schoolAdminMw = require('../__schoolAdmin.mw');

describe('__schoolAdmin.mw', () => {
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
    const mw = schoolAdminMw({ managers });
    invoke(mw);
    expect(managers.responseDispatcher.dispatch).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ code: 401, errors: 'authentication required' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should dispatch 403 when role is neither school_admin nor superadmin', () => {
    results.__token = { role: 'teacher' };
    const mw = schoolAdminMw({ managers });
    invoke(mw);
    expect(managers.responseDispatcher.dispatch).toHaveBeenCalledWith(
      res,
      expect.objectContaining({ code: 403, errors: 'school administrator access required' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should dispatch 403 when school_admin has no schoolId', () => {
    results.__token = { role: 'school_admin' };
    const mw = schoolAdminMw({ managers });
    invoke(mw);
    expect(managers.responseDispatcher.dispatch).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        code: 403,
        errors: 'school administrator must be assigned to a school',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when role is school_admin and schoolId present', () => {
    const token = { role: 'school_admin', schoolId: 's1' };
    results.__token = token;
    const mw = schoolAdminMw({ managers });
    invoke(mw);
    expect(managers.responseDispatcher.dispatch).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(token);
  });

  it('should call next when role is superadmin', () => {
    const token = { role: 'superadmin' };
    results.__token = token;
    const mw = schoolAdminMw({ managers });
    invoke(mw);
    expect(next).toHaveBeenCalledWith(token);
  });
});
