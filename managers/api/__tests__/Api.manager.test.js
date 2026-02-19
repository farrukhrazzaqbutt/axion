const ApiHandler = require('../Api.manager');

describe('Api.manager', () => {
  let apiHandler;
  let managers;
  let responseDispatcher;
  let mwsExec;

  beforeEach(() => {
    responseDispatcher = { dispatch: jest.fn() };
    mwsExec = {
      createBolt: jest.fn().mockImplementation(({ onDone }) => ({
        run: () => {
          onDone({ req: { body: {} }, res: {}, results: {} });
        },
      })),
    };
    managers = {
      responseDispatcher,
      mwsExec,
      school: {
        httpExposed: ['post=createSchool', 'get=getSchool'],
        createSchool: jest.fn().mockResolvedValue({ school: { _id: 's1' } }),
        getSchool: jest.fn().mockResolvedValue({ school: {} }),
      },
    };
    const mwsRepo = { __token: jest.fn() };
    apiHandler = new ApiHandler({
      config: {},
      cortex: { sub: jest.fn() },
      cache: {},
      managers,
      mwsRepo,
      prop: 'httpExposed',
    });
  });

  describe('_exec', () => {
    it('should call target module method and return result', async () => {
      const result = await apiHandler._exec({
        targetModule: managers.school,
        fnName: 'createSchool',
        data: { name: 'Test', __token: { role: 'superadmin', userId: 'u1' } },
      });
      expect(managers.school.createSchool).toHaveBeenCalled();
      expect(result).toEqual({ school: { _id: 's1' } });
    });

    it('should return error object when method throws', async () => {
      managers.school.createSchool.mockRejectedValue(new Error('db error'));
      const result = await apiHandler._exec({
        targetModule: managers.school,
        fnName: 'createSchool',
        data: {},
      });
      expect(result.error).toBe('createSchool failed to execute');
    });

    it('should call cb when provided', async () => {
      const cb = jest.fn();
      await apiHandler._exec({
        targetModule: managers.school,
        fnName: 'getSchool',
        data: { schoolId: 's1', __token: {} },
        cb,
      });
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('mw', () => {
    it('should dispatch when module not found', async () => {
      const req = {
        method: 'get',
        params: { moduleName: 'nonexistent', fnName: 'getSchool' },
        body: {},
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await apiHandler.mw(req, res);
      expect(responseDispatcher.dispatch).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ ok: false, message: 'module nonexistent not found' })
      );
    });

    it('should dispatch when method not supported', async () => {
      const req = {
        method: 'patch',
        params: { moduleName: 'school', fnName: 'getSchool' },
        body: {},
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await apiHandler.mw(req, res);
      expect(responseDispatcher.dispatch).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ ok: false, message: expect.stringContaining('unsupported method') })
      );
    });

    it('should dispatch when fnName not in method matrix', async () => {
      const req = {
        method: 'get',
        params: { moduleName: 'school', fnName: 'invalidFn' },
        body: {},
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await apiHandler.mw(req, res);
      expect(responseDispatcher.dispatch).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ ok: false, message: expect.stringContaining('unable to find function') })
      );
    });

    it('should run bolt and dispatch success when module/method valid', async () => {
      const req = {
        method: 'get',
        params: { moduleName: 'school', fnName: 'getSchool' },
        body: { schoolId: 's1' },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      mwsExec.createBolt = jest.fn().mockImplementation(({ onDone }) => ({
        run: () => Promise.resolve(onDone({
          req: { body: req.body },
          res,
          results: { __token: { role: 'superadmin' } },
        })),
      }));
      apiHandler.mwsExec = mwsExec;
      await apiHandler.mw(req, res);
      await new Promise((r) => setImmediate(r));
      expect(mwsExec.createBolt).toHaveBeenCalled();
      expect(responseDispatcher.dispatch).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ ok: true, data: expect.any(Object) })
      );
    });
  });
});
