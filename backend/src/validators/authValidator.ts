import { z } from 'zod';

const branchEnum = z.enum(['cs', 'ce', 'ec', 'ee', 'me', 'cm']);

const baseRegistrationNumberRegex = /^0701(cs|ce|ec|ee|me|cm)\d{2}(\d{4}|3d\d{2})$/i;
const studentEmailRegex = /^0701(cs|ce|ec|ee|me|cm)\d{2}(\d{4}|3d\d{2})@uecu\.ac\.in$/i;
const facultyEmailRegex = /^[a-zA-Z0-9._%+-]+@uecu\.ac\.in$/i;

export const RegisterStudentSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters long').max(100),
  registrationNumber: z.string().regex(baseRegistrationNumberRegex, {
    message: 'Registration number must match regular UECU or direct-entry diploma formats.'
  }),
  branch: branchEnum,
  yearOfRegistration: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(2000).max(new Date().getFullYear())
  ),
  dob: z.preprocess(
    (val) => (typeof val === 'string' ? new Date(val) : val),
    z.date({ required_error: 'Date of birth is required' })
  ),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  email: z.string().email('Invalid email address').regex(studentEmailRegex, {
    message: 'Institutional email must match your registration number structure (e.g. 0701CS23XXXX@uecu.ac.in).'
  }),
  password: z.string().min(8, 'Password must be at least 8 characters long')
}).refine((data) => {
  // Extract registration number and check if it corresponds with the email prefix
  const emailPrefix = data.email.split('@')[0].toLowerCase();
  return emailPrefix === data.registrationNumber.toLowerCase();
}, {
  message: 'Email must match your registration number.',
  path: ['email']
});

export const RegisterFacultySchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters long').max(100),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  email: z.string().email('Invalid email address').regex(facultyEmailRegex, {
    message: 'Faculty email must belong to the college domain (@uecu.ac.in).'
  }),
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

export const RegisterContributorSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters long').max(100),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters long').max(100),
  roleInOrganization: z.string().min(2, 'Role must be at least 2 characters long').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

export const RegisterAlumniSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters long').max(100),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  branch: branchEnum,
  yearOfGraduation: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number().int().min(1950).max(new Date().getFullYear() + 10)
  ),
  currentCompany: z.string().min(1, 'Current company is required').max(100),
  currentRole: z.string().min(1, 'Current role is required').max(100),
  linkedin: z.string().url('Invalid LinkedIn URL').regex(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/i, {
    message: 'LinkedIn URL must be a valid profile link.'
  }).optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string().min(8, 'Confirm password is required')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword']
});
