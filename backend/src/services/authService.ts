import bcrypt from 'bcryptjs';
import * as userRepository from '../repositories/userRepository';
import * as refreshTokenRepository from '../repositories/refreshTokenRepository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateRandomToken } from '../utils/crypto';
import { sendEmail } from '../utils/email';

export const registerStudent = async (studentData: any) => {
  const existingEmail = await userRepository.findByEmail(studentData.email);
  if (existingEmail) {
    throw new Error('Email address is already registered.');
  }

  const existingRegNum = await userRepository.findByRegistrationNumber(studentData.registrationNumber);
  if (existingRegNum) {
    throw new Error('Registration number is already registered.');
  }

  const hashedPassword = await bcrypt.hash(studentData.password, 12);
  const verificationToken = generateRandomToken();
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await userRepository.createUser({
    ...studentData,
    password: hashedPassword,
    role: 'student',
    status: 'pendingVerification',
    isEmailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationTokenExpires: verificationTokenExpires
  });

  // Dispatch email verification link
  const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?token=${verificationToken}`;
  await sendEmail({
    email: user.email,
    subject: 'Verify your Student Account - The Helping Society',
    html: `<p>Welcome, ${user.fullName}!</p><p>Please verify your student account by clicking the link below:</p><a href="${verificationLink}">${verificationLink}</a>`
  });

  return user;
};

export const registerFaculty = async (facultyData: any) => {
  const existingEmail = await userRepository.findByEmail(facultyData.email);
  if (existingEmail) {
    throw new Error('Email address is already registered.');
  }

  const hashedPassword = await bcrypt.hash(facultyData.password, 12);
  const verificationToken = generateRandomToken();
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await userRepository.createUser({
    ...facultyData,
    password: hashedPassword,
    role: 'faculty',
    status: 'pendingVerification',
    isEmailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationTokenExpires: verificationTokenExpires
  });

  const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?token=${verificationToken}`;
  await sendEmail({
    email: user.email,
    subject: 'Verify your Faculty Account - The Helping Society',
    html: `<p>Welcome, ${user.fullName}!</p><p>Please verify your faculty account by clicking the link below:</p><a href="${verificationLink}">${verificationLink}</a><p>Please note: after email verification, your account will require administrator approval before login is enabled.</p>`
  });

  return user;
};

export const registerContributor = async (contributorData: any) => {
  const existingEmail = await userRepository.findByEmail(contributorData.email);
  if (existingEmail) {
    throw new Error('Email address is already registered.');
  }

  const hashedPassword = await bcrypt.hash(contributorData.password, 12);
  const verificationToken = generateRandomToken();
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await userRepository.createUser({
    ...contributorData,
    password: hashedPassword,
    role: 'contributor',
    status: 'pendingVerification',
    isEmailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationTokenExpires: verificationTokenExpires
  });

  const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?token=${verificationToken}`;
  await sendEmail({
    email: user.email,
    subject: 'Verify your Contributor Account - The Helping Society',
    html: `<p>Welcome, ${user.fullName}!</p><p>Please verify your contributor account by clicking the link below:</p><a href="${verificationLink}">${verificationLink}</a><p>Please note: after email verification, your account will require administrator approval before login is enabled.</p>`
  });

  return user;
};

export const registerAlumni = async (alumniData: any) => {
  const existingEmail = await userRepository.findByEmail(alumniData.email);
  if (existingEmail) {
    throw new Error('Email address is already registered.');
  }

  const hashedPassword = await bcrypt.hash(alumniData.password, 12);
  const verificationToken = generateRandomToken();
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await userRepository.createUser({
    ...alumniData,
    password: hashedPassword,
    role: 'alumni',
    status: 'pendingVerification',
    isEmailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationTokenExpires: verificationTokenExpires
  });

  const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/verify-email?token=${verificationToken}`;
  await sendEmail({
    email: user.email,
    subject: 'Verify your Alumni Account - The Helping Society',
    html: `<p>Welcome, ${user.fullName}!</p><p>Please verify your alumni account by clicking the link below:</p><a href="${verificationLink}">${verificationLink}</a><p>Please note: after email verification, your account will require administrator approval before login is enabled.</p>`
  });

  return user;
};

export const verifyEmail = async (token: string) => {
  const user = await userRepository.findByVerificationToken(token);
  if (!user) {
    throw new Error('Invalid or expired email verification token.');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationTokenExpires = null;

  if (user.role === 'student') {
    user.status = 'active';
  } else {
    // Faculty, Contributors and Alumni transition to pendingApproval
    user.status = 'pendingApproval';
  }

  await user.save();
  return user;
};

export const login = async (credentials: any) => {
  const user = await userRepository.findByEmail(credentials.email, true);
  if (!user || !user.password) {
    throw new Error('Invalid email or password.');
  }

  const isMatch = await bcrypt.compare(credentials.password, user.password);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  // Account status verification checks
  if (user.status === 'pendingVerification') {
    throw new Error('Please verify your email address before logging in.');
  }
  if (user.status === 'pendingApproval') {
    throw new Error('Your account is pending administrator approval.');
  }
  if (user.status === 'disabled') {
    throw new Error('Your account has been disabled. Please contact support.');
  }
  if (user.status === 'banned') {
    throw new Error('Your account has been permanently banned.');
  }

  // Enforce single-session login: bump session version and revoke all previous sessions
  user.sessionVersion = (user.sessionVersion || 0) + 1;
  await user.save();
  await refreshTokenRepository.deleteAllUserTokens(user._id);

  // Generate tokens
  const payload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    isCoreTeam: (user as any).isCoreTeam || false,
    sessionVersion: user.sessionVersion
  };

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store refresh token (expires in 30 days)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await refreshTokenRepository.saveToken(user._id, refreshToken, expiresAt);


  // Exclude password from output
  user.password = undefined;

  return { accessToken, refreshToken, user };
};

export const logout = async (token: string) => {
  await refreshTokenRepository.deleteToken(token);
};

export const rotateRefreshToken = async (token: string) => {
  // Find token in database
  const storedToken = await refreshTokenRepository.findToken(token);

  if (!storedToken) {
    // Token not in database (could be a replay attack or expired token clean-up)
    try {
      const decoded = verifyRefreshToken(token);
      // Signature is valid but token is missing from DB -> Replay Attack detected!
      // Revoke all refresh sessions for this user immediately
      await refreshTokenRepository.deleteAllUserTokens(decoded.id);
      throw new Error('Replay attack detected. Revoking all active user sessions.');
    } catch (err: any) {
      if (err.message.includes('Replay attack')) {
        throw err;
      }
      throw new Error('Invalid refresh token.');
    }
  }

  // Signature validation
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    // Token expired or invalid signature, delete from database
    await refreshTokenRepository.deleteToken(token);
    throw new Error('Expired or invalid refresh token.');
  }

  // Fetch active user status checks
  const user = await userRepository.findById(decoded.id);
  if (!user || user.status !== 'active') {
    await refreshTokenRepository.deleteToken(token);
    throw new Error('Account is inactive, disabled or banned.');
  }

  // Delete rotated token (single-use constraint)
  await refreshTokenRepository.deleteToken(token);

  // Sign new tokens (carry forward the current session version unchanged)
  const payload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    isCoreTeam: (user as any).isCoreTeam || false,
    sessionVersion: user.sessionVersion || 0
  };


  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  // Store new token
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await refreshTokenRepository.saveToken(user._id, newRefreshToken, expiresAt);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
};

export const forgotPassword = async (email: string) => {
  const user = await userRepository.findByEmail(email);
  // User enumeration prevention: Return success even if email is not found
  if (!user) {
    return true;
  }

  const resetToken = generateRandomToken();
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.resetPasswordToken = resetToken;
  user.resetPasswordTokenExpires = resetTokenExpires;
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password?change=${resetToken}`;
  await sendEmail({
    email: user.email,
    subject: 'Password Reset Request - The Helping Society',
    html: `<p>You requested a password reset.</p><p>Please reset your password by clicking the link below:</p><a href="${resetLink}">${resetLink}</a><p>This link is valid for 1 hour.</p>`
  });

  return true;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const user = await userRepository.findByResetToken(token);
  if (!user) {
    throw new Error('Invalid or expired password reset token.');
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken = null;
  user.resetPasswordTokenExpires = null;
  await user.save();

  // Revoke all existing sessions upon password reset
  await refreshTokenRepository.deleteAllUserTokens(user._id);

  return true;
};
