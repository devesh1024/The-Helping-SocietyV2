import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { 
  RegisterStudentSchema, 
  RegisterFacultySchema, 
  RegisterContributorSchema, 
  RegisterAlumniSchema,
  LoginSchema, 
  ForgotPasswordSchema, 
  ResetPasswordSchema 
} from '../validators/authValidator';

const parseCookie = (req: Request, name: string): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, curr) => {
    const [key, value] = curr.split('=').map((c) => c.trim());
    if (key && value) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});

  return cookies[name] || null;
};

const getCookieOptions = () => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || true, // Enforce Secure in production or locally (since HTTPS is standard or locally mocked)
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  };
};

export const registerStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = RegisterStudentSchema.parse(req.body);
    await authService.registerStudent(validatedData);

    return res.status(201).json({
      success: true,
      message: 'Verification email sent. Please check your inbox.'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Failed',
        errors: error.errors
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Registration failed.'
    });
  }
};

export const registerFaculty = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = RegisterFacultySchema.parse(req.body);
    await authService.registerFaculty(validatedData);

    return res.status(201).json({
      success: true,
      message: 'Verification email sent. Account requires admin approval after verification.'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Failed',
        errors: error.errors
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Registration failed.'
    });
  }
};

export const registerContributor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = RegisterContributorSchema.parse(req.body);
    await authService.registerContributor(validatedData);

    return res.status(201).json({
      success: true,
      message: 'Verification email sent. Account requires admin approval after verification.'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Failed',
        errors: error.errors
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Registration failed.'
    });
  }
};

export const registerAlumni = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = RegisterAlumniSchema.parse(req.body);
    await authService.registerAlumni(validatedData);

    return res.status(201).json({
      success: true,
      message: 'Verification email sent. Account requires admin approval after verification.'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Failed',
        errors: error.errors
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Registration failed.'
    });
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.'
      });
    }

    const user = await authService.verifyEmail(token);

    return res.status(200).json({
      success: true,
      message: user.role === 'student'
        ? 'Email verified successfully. Your account is now active.'
        : 'Email verified successfully. Your account is pending administrator approval.',
      data: {
        role: user.role,
        status: user.status
      }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Email verification failed.'
    });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = LoginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await authService.login(validatedData);

    // Set refresh token in Secure HttpOnly SameSite cookie
    res.cookie('refreshToken', refreshToken, getCookieOptions());

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        user
      }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Failed',
        errors: error.errors
      });
    }
    // Differentiate between 401 Unauthorized credentials and other errors
    const status = error.message.includes('Invalid') ? 401 : 403;
    return res.status(status).json({
      success: false,
      message: error.message || 'Login failed.'
    });
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = parseCookie(req, 'refreshToken') || req.body.refreshToken;
    if (token) {
      await authService.logout(token);
    }

    // Clear client cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/v1/auth'
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Logout failed.'
    });
  }
};

export const rotateRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = parseCookie(req, 'refreshToken') || req.body.refreshToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is missing.'
      });
    }

    const { accessToken, refreshToken, user } = await authService.rotateRefreshToken(token);

    // Set new refresh token in Secure HttpOnly SameSite cookie
    res.cookie('refreshToken', refreshToken, getCookieOptions());

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        user
      }
    });
  } catch (error: any) {
    // If replay attack was detected, clear the client cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/v1/auth'
    });

    return res.status(401).json({
      success: false,
      message: error.message || 'Token rotation failed.'
    });
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = ForgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(validatedData.email);

    // Prevent user enumeration: always return standard success message
    return res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been dispatched.'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Failed',
        errors: error.errors
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Request failed.'
    });
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
	const validatedData = ResetPasswordSchema.parse(req.body);
    	await authService.resetPassword(validatedData.token, validatedData.password);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new credentials.'
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Failed',
        errors: error.errors
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Password reset failed.'
    });
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized.'
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch profile.'
    });
  }
};
