const Student = require('../Student.manager');

describe('Student.manager', () => {
  let studentManager;
  let mockStudentModel;
  let mockClassroomModel;
  let mockSchoolModel;
  let validators;

  beforeEach(() => {
    mockStudentModel = {
      findById: jest.fn(),
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    mockClassroomModel = { findById: jest.fn(), findByIdAndUpdate: jest.fn().mockResolvedValue({}) };
    mockSchoolModel = { findById: jest.fn() };
    validators = {
      student: {
        createStudent: jest.fn().mockResolvedValue(null),
        updateStudent: jest.fn().mockResolvedValue(null),
      },
    };
    studentManager = new Student({
      config: {},
      cortex: {},
      validators,
      mongomodels: {
        student: mockStudentModel,
        classroom: mockClassroomModel,
        school: mockSchoolModel,
      },
    });
  });

  describe('createStudent', () => {
    it('should return error when not school_admin', async () => {
      const result = await studentManager.createStudent({
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '2010-01-01',
        schoolId: 's1',
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ errors: 'Only school administrators can create students' });
    });

    it('should return error when school not found', async () => {
      mockSchoolModel.findById.mockResolvedValue(null);
      const result = await studentManager.createStudent({
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '2010-01-01',
        schoolId: 's1',
        __token: { role: 'school_admin', userId: 'u1', schoolId: 's1' },
      });
      expect(result).toEqual({ errors: 'School not found' });
    });

    it('should create student when school_admin and school exists', async () => {
      mockSchoolModel.findById.mockResolvedValue({ _id: 's1' });
      const savedStudent = {
        _id: 'st1',
        firstName: 'Jane',
        lastName: 'Doe',
        schoolId: 's1',
        save: jest.fn().mockResolvedValue(true),
      };
      const StudentCtor = jest.fn().mockImplementation(function (data) {
        this.save = jest.fn().mockResolvedValue({ _id: 'st1', ...data });
        return this;
      });
      studentManager.Student = StudentCtor;
      studentManager.School = mockSchoolModel;
      const result = await studentManager.createStudent({
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '2010-01-01',
        schoolId: 's1',
        __token: { role: 'school_admin', userId: 'u1', schoolId: 's1' },
      });
      expect(StudentCtor).toHaveBeenCalled();
      expect(result.student).toBeDefined();
    });
  });

  describe('getStudent', () => {
    it('should return error when studentId missing', async () => {
      const result = await studentManager.getStudent({ __token: {} });
      expect(result).toEqual({ errors: 'Student ID is required' });
    });

    it('should return error when student not found', async () => {
      mockStudentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });
      const result = await studentManager.getStudent({
        studentId: 'st1',
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ errors: 'Student not found' });
    });

    it('should return student when found', async () => {
      const student = {
        _id: 'st1',
        firstName: 'Jane',
        schoolId: { _id: 's1' },
        classroomId: null,
      };
      mockStudentModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(student),
        }),
      });
      const result = await studentManager.getStudent({
        studentId: 'st1',
        __token: { role: 'superadmin' },
      });
      expect(result.student).toEqual(student);
    });
  });

  describe('getAllStudents', () => {
    it('should return error when school_admin has no schoolId', async () => {
      const result = await studentManager.getAllStudents({
        __token: { role: 'school_admin' },
      });
      expect(result).toEqual({
        errors: 'School administrator must be assigned to a school',
      });
    });

    it('should return students and pagination', async () => {
      const students = [{ _id: 'st1', firstName: 'Jane' }];
      mockStudentModel.find.mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(students),
          }),
        }),
      });
      mockStudentModel.countDocuments.mockResolvedValue(1);
      studentManager.Student = mockStudentModel;
      const result = await studentManager.getAllStudents({
        __token: { role: 'school_admin', schoolId: 's1' },
      });
      expect(result.students).toEqual(students);
      expect(result.pagination).toBeDefined();
    });
  });

  describe('transferStudent', () => {
    it('should return error when not school_admin', async () => {
      const result = await studentManager.transferStudent({
        studentId: 'st1',
        targetSchoolId: 's2',
        __token: { role: 'superadmin' },
      });
      expect(result).toEqual({ errors: 'Only school administrators can transfer students' });
    });

    it('should return error when studentId or targetSchoolId missing', async () => {
      const result = await studentManager.transferStudent({
        studentId: 'st1',
        __token: { role: 'school_admin', schoolId: 's1' },
      });
      expect(result).toEqual({
        errors: 'Student ID and target school ID are required',
      });
    });
  });

  describe('deleteStudent', () => {
    it('should soft delete when school_admin and access allowed', async () => {
      const student = {
        _id: 'st1',
        schoolId: 's1',
        classroomId: null,
        isActive: true,
        status: 'enrolled',
        save: jest.fn().mockResolvedValue(true),
      };
      mockStudentModel.findById.mockResolvedValue(student);
      const result = await studentManager.deleteStudent({
        studentId: 'st1',
        __token: { role: 'school_admin', schoolId: 's1' },
      });
      expect(student.isActive).toBe(false);
      expect(student.status).toBe('withdrawn');
      expect(result.message).toBe('Student deleted successfully');
    });
  });
});
