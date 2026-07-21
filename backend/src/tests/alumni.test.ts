import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index';
import { User } from '../models/User';
import { signAccessToken } from '../utils/jwt';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  await mongoose.disconnect();
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
}, 60000);

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Alumni Discriminator Tests', () => {
  const alumniData = {
    fullName: 'Alice Alumni',
    email: 'alice.alumni@example.com',
    password: 'Password123!',
    phoneNumber: '9876543210',
    branch: 'cs',
    yearOfGraduation: 2022,
    currentCompany: 'Google',
    currentRole: 'Software Engineer',
    linkedin: 'https://linkedin.com/in/alice-alumni'
  };

  describe('POST /api/v1/auth/register/alumni', () => {
    it('should register an alumnus successfully with correct status', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register/alumni')
        .send(alumniData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Verification email sent');

      const user = await User.findOne({ email: alumniData.email });
      expect(user).not.toBeNull();
      expect(user?.role).toBe('alumni');
      expect(user?.status).toBe('pendingVerification');
      expect(user?.isEmailVerified).toBe(false);

      // Check fields specific to alumni
      const alumniObj = user as any;
      expect(alumniObj.phoneNumber).toBe(alumniData.phoneNumber);
      expect(alumniObj.branch).toBe(alumniData.branch);
      expect(alumniObj.yearOfGraduation).toBe(alumniData.yearOfGraduation);
      expect(alumniObj.currentCompany).toBe(alumniData.currentCompany);
      expect(alumniObj.currentRole).toBe(alumniData.currentRole);
      expect(alumniObj.linkedin).toBe(alumniData.linkedin);

      // CRITICAL: Ensure registrationNumber is undefined
      expect(alumniObj.registrationNumber).toBeUndefined();
    });

    it('should reject registration if email is invalid', async () => {
      const invalidData = { ...alumniData, email: 'not-an-email' };
      const res = await request(app)
        .post('/api/v1/auth/register/alumni')
        .send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration if phone number is too short', async () => {
      const invalidData = { ...alumniData, phoneNumber: '123' };
      const res = await request(app)
        .post('/api/v1/auth/register/alumni')
        .send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration if graduation year is before 1950', async () => {
      const invalidData = { ...alumniData, yearOfGraduation: 1945 };
      const res = await request(app)
        .post('/api/v1/auth/register/alumni')
        .send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration if branch is invalid', async () => {
      const invalidData = { ...alumniData, branch: 'invalid-branch' };
      const res = await request(app)
        .post('/api/v1/auth/register/alumni')
        .send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration if linkedin profile URL is invalid format', async () => {
      const invalidData = { ...alumniData, linkedin: 'https://google.com' };
      const res = await request(app)
        .post('/api/v1/auth/register/alumni')
        .send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Email OTP Verification and Admin Approval', () => {
    it('should transition alumnus to pendingApproval after email verification, then active after admin approval', async () => {
      // 1. Register
      await request(app)
        .post('/api/v1/auth/register/alumni')
        .send(alumniData);

      const user = await User.findOne({ email: alumniData.email }).select('+emailVerificationToken');
      const token = user?.emailVerificationToken;
      expect(token).toBeDefined();

      // 2. Verify Email
      const verifyRes = await request(app)
        .get(`/api/v1/auth/verify-email?token=${token}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      const verifiedUser = await User.findOne({ email: alumniData.email });
      expect(verifiedUser?.isEmailVerified).toBe(true);
      expect(verifiedUser?.status).toBe('pendingApproval');

      // Create Admin to approve
      const admin = await User.create({
        fullName: 'Admin User',
        email: 'admin@uecu.ac.in',
        password: 'Password123!',
        role: 'admin',
        status: 'active',
        isEmailVerified: true,
        phoneNumber: '9876543209'
      });

      const adminToken = signAccessToken({
        id: admin._id.toString(),
        role: 'admin',
        email: admin.email,
        isCoreTeam: false
      });

      // 3. Approve via Admin API
      const approveRes = await request(app)
        .patch(`/api/v1/admin/users/${verifiedUser?._id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);

      const activeUser = await User.findOne({ email: alumniData.email });
      expect(activeUser?.status).toBe('active');
    });
  });

  describe('Profile Updates', () => {
    it('should update profile fields specific to alumni', async () => {
      // Create verified and active alumnus directly in DB
      const alumnus = await User.create({
        ...alumniData,
        role: 'alumni',
        status: 'active',
        isEmailVerified: true
      });

      const token = signAccessToken({
        id: alumnus._id.toString(),
        role: 'alumni',
        email: alumnus.email,
        isCoreTeam: false
      });

      const updateData = {
        fullName: 'Alice Updated',
        phoneNumber: '9999999999',
        branch: 'ec',
        yearOfGraduation: 2023,
        currentCompany: 'Meta',
        currentRole: 'Senior Engineer',
        linkedin: 'https://linkedin.com/in/alice-updated'
      };

      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedUser = await User.findById(alumnus._id);
      expect(updatedUser?.fullName).toBe(updateData.fullName);

      const alumniObj = updatedUser as any;
      expect(alumniObj.phoneNumber).toBe(updateData.phoneNumber);
      expect(alumniObj.branch).toBe(updateData.branch);
      expect(alumniObj.yearOfGraduation).toBe(updateData.yearOfGraduation);
      expect(alumniObj.currentCompany).toBe(updateData.currentCompany);
      expect(alumniObj.currentRole).toBe(updateData.currentRole);
      expect(alumniObj.linkedin).toBe(updateData.linkedin);

      // Ensure registrationNumber remains undefined
      expect(alumniObj.registrationNumber).toBeUndefined();
    });
  });
});
