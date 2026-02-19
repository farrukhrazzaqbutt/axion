const School = require('../School.manager');

describe('School.manager', () => {
  let schoolManager;
  let mockSchoolModel;
  let validators;
  let injectable;

  beforeEach(() => {
    mockSchoolModel = {
      findById: jest.fn(),
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    validators = {
      school: {
        createSchool: jest.fn().mockResolvedValue(null),
        updateSchool: jest.fn().mockResolvedValue(null),
      },
    };
    injectable = {
      config: {},
      cortex: {},
      validators,
      mongomodels: { school: mockSchoolModel },
    };
    schoolManager = new School(injectable);
  });

  describe('createSchool', () => {
    it('should return validation result when validation fails', async () => {
      validators.school.createSchool.mockResolvedValue({ errors: 'Invalid name' });
      const result = await schoolManager.createSchool({
        name: 'x',
        __token: { role: 'superadmin', userId: 'u1' },
      });
      expect(result).toEqual({ errors: 'Invalid name' });
    });

    it('should return error when user is not superadmin', async () => {
      const result = await schoolManager.createSchool({
        name: 'Lincoln High',
        __token: { role: 'school_admin', userId: 'u1' },
      });
      expect(result).toEqual({ errors: 'Only superadmins can create schools' });
    });

    it('should create and return school when superadmin', async () => {
      const savedSchool = { _id: 's1', name: 'Lincoln High', save: jest.fn().mockResolvedValue(true) };
      const SchoolCtor = jest.fn().mockImplementation(function (data) {
        this.save = jest.fn().mockResolvedValue({ _id: 's1', ...data });
        return this;
      });
      injectable.mongomodels.school = SchoolCtor;
      schoolManager = new School(injectable);
      schoolManager.School = SchoolCtor;
      const result = await schoolManager.createSchool({
        name: 'Lincoln High',
        address: { city: 'Springfield' },
        __token: { role: 'superadmin', userId: 'u1' },
      });
      expect(SchoolCtor).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Lincoln High', createdBy: 'u1' })
      );
      expect(result.school).toBeDefined();
    });
  });

  describe('getSchool', () => {
    it('should return error when schoolId is missing', async () => {
      const result = await schoolManager.getSchool({ __token: {} });
      expect(result).toEqual({ errors: 'School ID is required' });
    });

    it('should return error when school not found', async () => {
      mockSchoolModel.findById.mockResolvedValue(null);
      const result = await schoolManager.getSchool({
        schoolId: 's1',
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ errors: 'School not found' });
    });

    it('should return school when found and superadmin', async () => {
      const school = { _id: 's1', name: 'Lincoln' };
      mockSchoolModel.findById.mockResolvedValue(school);
      const result = await schoolManager.getSchool({
        schoolId: 's1',
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ school });
    });

    it('should deny school_admin access to other school', async () => {
      const school = { _id: 's1', name: 'Lincoln' };
      mockSchoolModel.findById.mockResolvedValue(school);
      const result = await schoolManager.getSchool({
        schoolId: 's1',
        __token: { role: 'school_admin', schoolId: { toString: () => 's2' } },
      });
      expect(result).toEqual({ errors: 'Access denied' });
    });
  });

  describe('getAllSchools', () => {
    it('should return schools and pagination', async () => {
      const schools = [{ _id: 's1', name: 'School 1' }];
      mockSchoolModel.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(schools),
      });
      mockSchoolModel.countDocuments.mockResolvedValue(1);
      schoolManager.School = mockSchoolModel;
      const result = await schoolManager.getAllSchools({
        page: 1,
        limit: 10,
        __token: { role: 'superadmin' },
      });
      expect(result.schools).toEqual(schools);
      expect(result.pagination).toEqual(
        expect.objectContaining({ page: 1, limit: 10, total: 1, pages: 1 })
      );
    });
  });

  describe('updateSchool', () => {
    it('should return error when schoolId missing', async () => {
      const result = await schoolManager.updateSchool({
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ errors: 'School ID is required' });
    });

    it('should return error when not superadmin', async () => {
      const result = await schoolManager.updateSchool({
        schoolId: 's1',
        name: 'New Name',
        __token: { role: 'school_admin' },
      });
      expect(result).toEqual({ errors: 'Only superadmins can update schools' });
    });

    it('should update school when superadmin', async () => {
      const school = {
        _id: 's1',
        name: 'Old',
        address: {},
        contact: {},
        save: jest.fn().mockResolvedValue(true),
      };
      mockSchoolModel.findById.mockResolvedValue(school);
      const result = await schoolManager.updateSchool({
        schoolId: 's1',
        name: 'New Name',
        __token: { role: 'superadmin' },
      });
      expect(school.name).toBe('New Name');
      expect(school.save).toHaveBeenCalled();
      expect(result.school).toBeDefined();
    });
  });

  describe('deleteSchool', () => {
    it('should return error when not superadmin', async () => {
      const result = await schoolManager.deleteSchool({
        schoolId: 's1',
        __token: { role: 'school_admin' },
      });
      expect(result).toEqual({ errors: 'Only superadmins can delete schools' });
    });

    it('should soft delete school when superadmin', async () => {
      const school = {
        _id: 's1',
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };
      mockSchoolModel.findById.mockResolvedValue(school);
      const result = await schoolManager.deleteSchool({
        schoolId: 's1',
        __token: { role: 'superadmin' },
      });
      expect(school.isActive).toBe(false);
      expect(school.save).toHaveBeenCalled();
      expect(result.message).toBe('School deleted successfully');
    });
  });
});
