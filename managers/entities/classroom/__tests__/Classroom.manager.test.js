const Classroom = require('../Classroom.manager');

describe('Classroom.manager', () => {
  let classroomManager;
  let mockClassroomModel;
  let mockSchoolModel;
  let validators;

  beforeEach(() => {
    mockClassroomModel = {
      findById: jest.fn(),
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    mockSchoolModel = { findById: jest.fn() };
    validators = {
      classroom: {
        createClassroom: jest.fn().mockResolvedValue(null),
        updateClassroom: jest.fn().mockResolvedValue(null),
      },
    };
    classroomManager = new Classroom({
      config: {},
      cortex: {},
      validators,
      mongomodels: {
        classroom: mockClassroomModel,
        school: mockSchoolModel,
      },
    });
  });

  describe('createClassroom', () => {
    it('should return error when not school_admin', async () => {
      const result = await classroomManager.createClassroom({
        name: 'Grade 10',
        schoolId: 's1',
        capacity: 30,
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ errors: 'Only school administrators can create classrooms' });
    });

    it('should return error when school not found', async () => {
      mockSchoolModel.findById.mockResolvedValue(null);
      const result = await classroomManager.createClassroom({
        name: 'Grade 10',
        schoolId: 's1',
        capacity: 30,
        __token: { role: 'school_admin', userId: 'u1' },
      });
      expect(result).toEqual({ errors: 'School not found' });
    });

    it('should deny when school_admin creates for other school', async () => {
      mockSchoolModel.findById.mockResolvedValue({ _id: 's1' });
      const result = await classroomManager.createClassroom({
        name: 'Grade 10',
        schoolId: 's1',
        capacity: 30,
        __token: { role: 'school_admin', schoolId: { toString: () => 's2' }, userId: 'u1' },
      });
      expect(result).toEqual({
        errors: 'Access denied: You can only create classrooms for your own school',
      });
    });
  });

  describe('getClassroom', () => {
    it('should return error when classroomId missing', async () => {
      const result = await classroomManager.getClassroom({ __token: {} });
      expect(result).toEqual({ errors: 'Classroom ID is required' });
    });

    it('should return error when classroom not found', async () => {
      mockClassroomModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      const result = await classroomManager.getClassroom({
        classroomId: 'c1',
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ errors: 'Classroom not found' });
    });

    it('should return classroom when found', async () => {
      const classroom = { _id: 'c1', name: 'Grade 10', schoolId: { _id: 's1' } };
      mockClassroomModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(classroom),
      });
      const result = await classroomManager.getClassroom({
        classroomId: 'c1',
        __token: { role: 'superadmin' },
      });
      expect(result.classroom).toEqual(classroom);
    });
  });

  describe('getAllClassrooms', () => {
    it('should return error when school_admin has no schoolId', async () => {
      const result = await classroomManager.getAllClassrooms({
        __token: { role: 'school_admin' },
      });
      expect(result).toEqual({
        errors: 'School administrator must be assigned to a school',
      });
    });

    it('should return classrooms with pagination', async () => {
      const classrooms = [{ _id: 'c1', name: 'Grade 10' }];
      mockClassroomModel.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(classrooms),
        }),
      });
      mockClassroomModel.countDocuments.mockResolvedValue(1);
      classroomManager.Classroom = mockClassroomModel;
      const result = await classroomManager.getAllClassrooms({
        __token: { role: 'school_admin', schoolId: 's1' },
      });
      expect(result.classrooms).toEqual(classrooms);
      expect(result.pagination).toBeDefined();
    });
  });

  describe('updateClassroom', () => {
    it('should return error when classroomId missing', async () => {
      const result = await classroomManager.updateClassroom({
        __token: { role: 'school_admin' },
      });
      expect(result).toEqual({ errors: 'Classroom ID is required' });
    });

    it('should return error when capacity less than currentEnrollment', async () => {
      const classroom = {
        _id: 'c1',
        schoolId: 's1',
        capacity: 30,
        currentEnrollment: 25,
        name: 'G10',
        gradeLevel: '10',
        resources: {},
        save: jest.fn(),
      };
      mockClassroomModel.findById.mockResolvedValue(classroom);
      const result = await classroomManager.updateClassroom({
        classroomId: 'c1',
        capacity: 20,
        __token: { role: 'school_admin', schoolId: 's1' },
      });
      expect(result).toEqual({
        errors: 'Capacity cannot be less than current enrollment (25)',
      });
    });
  });

  describe('deleteClassroom', () => {
    it('should soft delete when school_admin and access allowed', async () => {
      const classroom = {
        _id: 'c1',
        schoolId: 's1',
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };
      mockClassroomModel.findById.mockResolvedValue(classroom);
      const result = await classroomManager.deleteClassroom({
        classroomId: 'c1',
        __token: { role: 'school_admin', schoolId: 's1' },
      });
      expect(classroom.isActive).toBe(false);
      expect(result.message).toBe('Classroom deleted successfully');
    });
  });
});
