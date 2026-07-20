import { User, IUser } from '../models/User';

export const findByEmail = async (email: string, selectPassword = false): Promise<IUser | null> => {
  const query = User.findOne({ email: email.toLowerCase() });
  if (selectPassword) {
    query.select('+password');
  }
  return query.exec();
};

export const findByRegistrationNumber = async (regNum: string): Promise<IUser | null> => {
  // Query across User collection using the discriminator registrationNumber path
  return User.findOne({ registrationNumber: regNum.toUpperCase() }).exec();
};

export const findById = async (id: string): Promise<IUser | null> => {
  return User.findById(id).exec();
};

export const findByVerificationToken = async (token: string): Promise<IUser | null> => {
  return User.findOne({
    emailVerificationToken: token,
    emailVerificationTokenExpires: { $gt: new Date() }
  }).select('+emailVerificationToken +emailVerificationTokenExpires').exec();
};

export const findByResetToken = async (token: string): Promise<IUser | null> => {
  return User.findOne({
    resetPasswordToken: token,
    resetPasswordTokenExpires: { $gt: new Date() }
  }).select('+resetPasswordToken +resetPasswordTokenExpires').exec();
};

export const createUser = async (userData: any): Promise<IUser> => {
  return User.create(userData);
};

export const updateUser = async (id: string, updateData: any): Promise<IUser | null> => {
  return User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).exec();
};

export const findByIdWithResetToken = async (id: string): Promise<IUser | null> => {
  return User.findById(id).select('+resetPasswordToken +resetPasswordTokenExpires').exec();
};
