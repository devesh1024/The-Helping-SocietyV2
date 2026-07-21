import { Request, Response, NextFunction } from 'express';
import * as opportunityService from '../services/opportunityService';
import { CreateOpportunitySchema, UpdateOpportunitySchema } from '../validators/opportunityValidator';

export const createOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const validatedData = CreateOpportunitySchema.parse(req.body);
    const approvalStatus = req.user.role === 'student' ? 'pending' : 'approved';
    const opportunity = await opportunityService.createOpportunity(req.user._id, {
      ...validatedData,
      approvalStatus
    });

    return res.status(201).json({
      success: true,
      message: approvalStatus === 'pending' 
        ? 'Opportunity request submitted successfully and is pending administrator approval.'
        : 'Opportunity posted successfully.',
      data: { opportunity }
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
      message: error.message || 'Failed to post opportunity.'
    });
  }
};

export const getOpportunities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const type = req.query.type as string;
    const search = req.query.search as string;
    const userId = req.user?._id?.toString();
    const role = req.user?.role;

    const result = await opportunityService.getOpportunities({
      page,
      limit,
      type,
      search,
      userId,
      role
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to retrieve opportunities.'
    });
  }
};

export const getOpportunityById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const opportunity = await opportunityService.getOpportunityById(req.params.id, req.user?._id?.toString());
    return res.status(200).json({
      success: true,
      data: { opportunity }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to retrieve opportunity.'
    });
  }
};

export const toggleLike = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    const result = await opportunityService.toggleLike(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: result.liked ? 'Opportunity liked.' : 'Opportunity unliked.',
      data: result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to toggle like.'
    });
  }
};

export const toggleSave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    const result = await opportunityService.toggleSave(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: result.saved ? 'Opportunity saved.' : 'Opportunity unsaved.',
      data: result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to toggle save.'
    });
  }
};

export const updateOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = UpdateOpportunitySchema.parse(req.body);
    const opportunity = await opportunityService.updateOpportunity(req.params.id, validatedData);

    return res.status(200).json({
      success: true,
      message: 'Opportunity updated successfully.',
      data: { opportunity }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Failed',
        errors: error.errors
      });
    }
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to update opportunity.'
    });
  }
};

export const deleteOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await opportunityService.deleteOpportunity(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Opportunity deleted successfully.'
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to delete opportunity.'
    });
  }
};

export const getOpportunityRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const result = await opportunityService.getOpportunityRequests({ page, limit });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to retrieve opportunity requests.'
    });
  }
};

export const approveOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const opp = await opportunityService.approveOpportunity(req.params.id, req.user._id.toString());
    return res.status(200).json({
      success: true,
      message: 'Opportunity approved successfully.',
      data: { opportunity: opp }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to approve opportunity.'
    });
  }
};

export const rejectOpportunity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const opp = await opportunityService.rejectOpportunity(req.params.id, req.user._id.toString());
    return res.status(200).json({
      success: true,
      message: 'Opportunity rejected successfully.',
      data: { opportunity: opp }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to reject opportunity.'
    });
  }
};
