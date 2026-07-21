import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyAccessToken } from '../utils/jwt';
import * as userRepository from '../repositories/userRepository';
import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token missing or invalid.'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired access token.'
      });
    }

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User associated with this token no longer exists.'
      });
    }

    if ((decoded.sessionVersion ?? 0) !== (user.sessionVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: 'You have been logged out because your account was signed in on another device.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Account is inactive, disabled, or banned.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required.'
      });
    }

    const userRole = req.user.role;

    // Resolve student + isCoreTeam flag mapping to 'coreTeam' allowed role
    if (userRole === 'student' && (req.user as any).isCoreTeam && allowedRoles.includes('coreTeam')) {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access this resource.'
      });
    }

    next();
  };
};

export const authorizeOwnership = (modelName: string, idParamName = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Authentication required.'
        });
      }

      // Administrators bypass ownership checks
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params[idParamName];
      if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid resource identifier.'
        });
      }

      // Dynamically load the Mongoose model
      const Model = mongoose.model(modelName);
      const resource = await Model.findById(resourceId).exec();

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found.'
        });
      }

      // Resolve owner reference: check for ownerId, uploadedBy, or createdBy
      const ownerId = 
        (resource as any).ownerId || 
        (resource as any).uploadedBy || 
        (resource as any).createdBy;

      if (!ownerId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Resource has no defined owner reference.'
        });
      }

      // Compare owner ObjectId with current authenticated user _id
      if (ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to modify this resource.'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
