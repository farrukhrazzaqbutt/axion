const ResponseDispatcher = require('../ResponseDispatcher.manager');

describe('ResponseDispatcher', () => {
  let dispatcher;
  let res;

  beforeEach(() => {
    dispatcher = new ResponseDispatcher();
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  it('should dispatch success with 200 when ok is true', () => {
    dispatcher.dispatch(res, { ok: true, data: { id: 1 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      ok: true,
      data: { id: 1 },
      errors: [],
      message: '',
    });
  });

  it('should dispatch 400 when ok is false', () => {
    dispatcher.dispatch(res, { ok: false, errors: 'Something wrong' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      ok: false,
      data: {},
      errors: 'Something wrong',
      message: '',
    });
  });

  it('should use custom code when provided', () => {
    dispatcher.dispatch(res, { ok: false, code: 401, errors: 'unauthorized' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ errors: 'unauthorized' })
    );
  });

  it('should support msg as alias for message', () => {
    dispatcher.dispatch(res, { ok: true, msg: 'Success message' });
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Success message' })
    );
  });
});
