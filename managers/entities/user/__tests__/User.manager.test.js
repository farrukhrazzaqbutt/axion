jest.mock('nanoid', () => () => 'mock-session-id');
jest.mock('md5', () => () => 'mock-device-id');

const User = require('../User.manager');

describe('User.manager', () => {
  let userManager;
  let mockUserModel;
  let mockSchoolModel;
  let validators;
  let tokenManager;

  beforeEach(() => {
    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
    };
    mockSchoolModel = { findById: jest.fn() };
    tokenManager = {
      genLongToken: jest.fn().mockReturnValue('long-token'),
      genShortToken: jest.fn().mockReturnValue('short-token'),
    };
    validators = {
      user: {
        register: jest.fn().mockResolvedValue(null),
        updateProfile: jest.fn().mockResolvedValue(null),
      },
    };
    userManager = new User({
      config: {},
      cortex: {},
      validators,
      mongomodels: { user: mockUserModel, school: mockSchoolModel },
      managers: { token: tokenManager },
    });
  });

  describe('register', () => {
    it('should return validation result when validation fails', async () => {
      validators.user.register.mockResolvedValue({ errors: 'Invalid email' });
      const result = await userManager.register({
        username: 'u',
        email: 'bad',
        password: 'p',
      });
      expect(result).toEqual({ errors: 'Invalid email' });
    });

    it('should return error when creating superadmin without being superadmin', async () => {
      const result = await userManager.register({
        username: 'admin',
        email: 'admin@test.com',
        password: 'password123',
        role: 'superadmin',
      });
      expect(result).toEqual({
        errors: 'Only existing superadmins can create new superadmin accounts',
      });
    });

    it('should return error when user already exists', async () => {
      mockUserModel.findOne.mockResolvedValue({ _id: 'existing' });
      const result = await userManager.register({
        username: 'john',
        email: 'john@test.com',
        password: 'pass123',
      });
      expect(result).toEqual({ errors: 'User with this email or username already exists' });
    });

    it('should register and return user and longToken when valid', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const UserCtor = jest.fn().mockImplementation(function (data) {
        this._id = 'u1';
        this.username = data.username;
        this.email = data.email;
        this.role = data.role;
        this.schoolId = data.schoolId || null;
        this.save = jest.fn().mockResolvedValue({ _id: 'u1', ...data });
        return this;
      });
      UserCtor.findOne = mockUserModel.findOne;
      userManager.User = UserCtor;
      const result = await userManager.register({
        username: 'john',
        email: 'john@test.com',
        password: 'pass123',
      });
      expect(UserCtor).toHaveBeenCalled();
      expect(tokenManager.genLongToken).toHaveBeenCalled();
      expect(result.user).toBeDefined();
      expect(result.longToken).toBe('long-token');
    });
  });

  describe('login', () => {
    it('should return error when email or password missing', async () => {
      const result = await userManager.login({ email: 'j@j.com' });
      expect(result).toEqual({ errors: 'Email and password are required' });
    });

    it('should return error when user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      const result = await userManager.login({
        email: 'j@j.com',
        password: 'pass',
      });
      expect(result).toEqual({ errors: 'Invalid email or password' });
    });

    it('should return error when password invalid', async () => {
      const user = {
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      mockUserModel.findOne.mockResolvedValue(user);
      const result = await userManager.login({
        email: 'j@j.com',
        password: 'wrong',
      });
      expect(result).toEqual({ errors: 'Invalid email or password' });
    });

    it('should return user and tokens when valid', async () => {
      const user = {
        _id: 'u1',
        username: 'john',
        email: 'j@j.com',
        role: 'school_admin',
        schoolId: null,
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findOne.mockResolvedValue(user);
      const result = await userManager.login({
        email: 'j@j.com',
        password: 'pass',
        __device: {},
      });
      expect(result).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.user).toBeDefined();
      expect(result.longToken).toBe('long-token');
      expect(result.shortToken).toBe('short-token');
    });
  });

  describe('getProfile', () => {
    it('should return error when user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(null),
      });
      const result = await userManager.getProfile({
        __token: { userId: 'u1' },
      });
      expect(result).toEqual({ errors: 'User not found' });
    });

    it('should return user when found', async () => {
      const user = { _id: 'u1', username: 'john', email: 'j@j.com' };
      mockUserModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(user),
      });
      const result = await userManager.getProfile({
        __token: { userId: 'u1' },
      });
      expect(result.user).toEqual(user);
    });
  });

  describe('updateProfile', () => {
    it('should return error when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);
      const result = await userManager.updateProfile({
        username: 'new',
        __token: { userId: 'u1' },
      });
      expect(result).toEqual({ errors: 'User not found' });
    });

    it('should update and return user when valid', async () => {
      const user = {
        _id: 'u1',
        username: 'old',
        email: 'old@test.com',
        role: 'school_admin',
        schoolId: null,
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockResolvedValue(user);
      const result = await userManager.updateProfile({
        username: 'newuser',
        __token: { userId: 'u1' },
      });
      expect(user.username).toBe('newuser');
      expect(result.user).toBeDefined();
    });
  });

  describe('assignSchool', () => {
    it('should return error when not superadmin', async () => {
      const result = await userManager.assignSchool({
        userId: 'u1',
        schoolId: 's1',
        __token: { role: 'school_admin' },
      });
      expect(result).toEqual({
        errors: 'Only superadmins can assign schools to users',
      });
    });

    it('should return error when userId or schoolId missing', async () => {
      const result = await userManager.assignSchool({
        userId: 'u1',
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ errors: 'User ID and School ID are required' });
    });

    it('should return error when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);
      const result = await userManager.assignSchool({
        userId: 'u1',
        schoolId: 's1',
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ errors: 'User not found' });
    });

    it('should return error when school not found', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: 'u1',
        role: 'school_admin',
        schoolId: null,
        save: jest.fn(),
      });
      mockSchoolModel.findById.mockResolvedValue(null);
      const result = await userManager.assignSchool({
        userId: 'u1',
        schoolId: 's1',
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ errors: 'School not found' });
    });

    it('should assign school and return user when valid', async () => {
      const user = {
        _id: 'u1',
        username: 'john',
        email: 'j@j.com',
        role: 'school_admin',
        schoolId: null,
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockResolvedValue(user);
      mockSchoolModel.findById.mockResolvedValue({ _id: 's1' });
      const result = await userManager.assignSchool({
        userId: 'u1',
        schoolId: 's1',
        __token: { role: 'superadmin' },
      });
      expect(user.schoolId).toBe('s1');
      expect(result.user).toBeDefined();
      expect(result.message).toBe('School assigned successfully');
    });
  });
});
