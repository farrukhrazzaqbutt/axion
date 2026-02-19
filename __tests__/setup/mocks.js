// Shared mocks for unit tests

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  return res;
};

const mockReq = (overrides = {}) => ({
  method: 'get',
  params: {},
  body: {},
  headers: {},
  connection: { remoteAddress: '127.0.0.1' },
  ...overrides,
});

// Mongoose model mock factory
const createModelMock = (mockDoc = {}) => ({
  findById: jest.fn().mockResolvedValue(null),
  findOne: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockReturnValue({
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
  }),
  countDocuments: jest.fn().mockResolvedValue(0),
  save: jest.fn().mockImplementation(function () {
    return Promise.resolve(this);
  }),
  ...mockDoc,
});

const createDocMock = (attrs = {}) => ({
  _id: attrs._id || '507f1f77bcf86cd799439011',
  save: jest.fn().mockResolvedValue(attrs),
  ...attrs,
});

module.exports = { mockRes, mockReq, createModelMock, createDocMock };
