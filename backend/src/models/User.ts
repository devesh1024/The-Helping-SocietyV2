import mongoose, { Schema, Document } from 'mongoose';

// Base User Document Interface
export interface IUser extends Document {
  fullName: string;
  email: string;
  password?: string;
  role: 'student' | 'faculty' | 'contributor' | 'admin' | 'alumni';
  status: 'pendingVerification' | 'pendingApproval' | 'active' | 'disabled' | 'banned';
  isEmailVerified: boolean;
  emailVerificationToken?: string | null;
  emailVerificationTokenExpires?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordTokenExpires?: Date | null;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// Base User Schema
const BaseUserSchema = new Schema<IUser>({
  fullName: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['student', 'faculty', 'contributor', 'admin', 'alumni'], 
    required: true 
  },
  status: {
    type: String,
    enum: ['pendingVerification', 'pendingApproval', 'active', 'disabled', 'banned'],
    default: 'pendingVerification'
  },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false, default: null },
  emailVerificationTokenExpires: { type: Date, select: false, default: null },
  resetPasswordToken: { type: String, select: false, default: null },
  resetPasswordTokenExpires: { type: Date, select: false, default: null },
  sessionVersion: { type: Number, default: 0 }
}, { 
  timestamps: true, 
  discriminatorKey: 'role', 
  strict: true 
});

export const User = mongoose.model<IUser>('User', BaseUserSchema);

// Student Discriminator Interface
export interface IStudent extends IUser {
  registrationNumber: string;
  branch: 'cs' | 'ce' | 'ec' | 'ee' | 'me' | 'cm';
  yearOfRegistration: number;
  dob: Date;
  phoneNumber: string;
  isCoreTeam: boolean;
}

// Student Schema
const StudentSchema = new Schema<IStudent>({
  registrationNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    validate: {
      validator: function(val: string) {
        return /^0701(CS|CE|EC|EE|ME|CM)\d{2}(\d{4}|3D\d{2})$/i.test(val);
      },
      message: 'Registration number must match regular UECU or direct-entry diploma patterns.'
    }
  },
  branch: { type: String, enum: ['cs', 'ce', 'ec', 'ee', 'me', 'cm'], required: true },
  yearOfRegistration: { type: Number, required: true },
  dob: { type: Date, required: true },
  phoneNumber: { type: String, required: true },
  isCoreTeam: { type: Boolean, default: false },
  sessionVersion: { type: Number, default: 0 }
});

export const Student = User.discriminator<IStudent>('student', StudentSchema);

// Faculty Discriminator Interface
export interface IFaculty extends IUser {
  phoneNumber: string;
}

// Faculty Schema
const FacultySchema = new Schema<IFaculty>({
  phoneNumber: { type: String, required: true }
});

export const Faculty = User.discriminator<IFaculty>('faculty', FacultySchema);

// Contributor Discriminator Interface
export interface IContributor extends IUser {
  organizationName: string;
  roleInOrganization: string;
}

// Contributor Schema
const ContributorSchema = new Schema<IContributor>({
  organizationName: { type: String, required: true },
  roleInOrganization: { type: String, required: true }
});

export const Contributor = User.discriminator<IContributor>('contributor', ContributorSchema);

// Admin Discriminator Interface (Inherits base fields without additional fields)
export interface IAdmin extends IUser {}

// Admin Schema
const AdminSchema = new Schema<IAdmin>({});

export const Admin = User.discriminator<IAdmin>('admin', AdminSchema);

// Alumni Discriminator Interface
export interface IAlumni extends IUser {
  phoneNumber: string;
  branch: 'cs' | 'ce' | 'ec' | 'ee' | 'me' | 'cm';
  yearOfGraduation: number;
  currentCompany: string;
  currentRole: string;
  linkedin?: string;
}

// Alumni Schema
const AlumniSchema = new Schema<IAlumni>({
  phoneNumber: { type: String, required: true },
  branch: { type: String, enum: ['cs', 'ce', 'ec', 'ee', 'me', 'cm'], required: true },
  yearOfGraduation: { type: Number, required: true },
  currentCompany: { type: String, required: true },
  currentRole: { type: String, required: true },
  linkedin: {
    type: String,
    validate: {
      validator: function(val?: string) {
        if (!val) return true;
        return /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/i.test(val);
      },
      message: 'LinkedIn URL must be a valid profile link.'
    }
  }
});

export const Alumni = User.discriminator<IAlumni>('alumni', AlumniSchema);
