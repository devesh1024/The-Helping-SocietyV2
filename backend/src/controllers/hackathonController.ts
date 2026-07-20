import { Request, Response, NextFunction } from 'express';
import * as hackathonService from '../services/hackathonService';
import {
  CreateHackathonSchema,
  UpdateHackathonSchema,
  CreateHackathonTeamSchema,
  JoinHackathonTeamSchema,
  CreateHackathonSubmissionSchema,
  UpdateHackathonSubmissionSchema,
  DecideHackathonSubmissionSchema
} from '../validators/hackathonValidator';
import { sanitizeString } from '../utils/sanitize';

export const createHackathon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    const validatedData = CreateHackathonSchema.parse(req.body);
    const hackathon = await hackathonService.createHackathon(req.user._id.toString(), validatedData);

    return res.status(201).json({
      success: true,
      message: 'Hackathon created successfully as a draft.',
      data: { hackathon }
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation Failed', errors: error.errors });
    }
    return res.status(400).json({ success: false, message: error.message || 'Failed to create hackathon.' });
  }
};

export const getHackathons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const isAdmin = req.user?.role === 'admin';

    const result = await hackathonService.getHackathons({ page, limit, category, search, isAdmin });
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to retrieve hackathons.' });
  }
};

export const getHackathonById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const hackathon = await hackathonService.getHackathonById(req.params.id, isAdmin);
    return res.status(200).json({ success: true, data: { hackathon } });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to retrieve hackathon.' });
  }
};

export const updateHackathon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = UpdateHackathonSchema.parse(req.body);
    const hackathon = await hackathonService.updateHackathon(req.params.id, validatedData);
    return res.status(200).json({ success: true, message: 'Hackathon updated successfully.', data: { hackathon } });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation Failed', errors: error.errors });
    }
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to update hackathon.' });
  }
};

export const deleteHackathon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await hackathonService.deleteHackathon(req.params.id);
    return res.status(200).json({ success: true, message: 'Hackathon deleted successfully.' });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to delete hackathon.' });
  }
};

// ==================== Teams ====================

export const createTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const validatedData = CreateHackathonTeamSchema.parse(req.body);
    const team = await hackathonService.createTeam(req.params.hackathonId, req.user._id.toString(), validatedData);
    return res.status(201).json({ success: true, message: 'Team created successfully.', data: { team } });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation Failed', errors: error.errors });
    }
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to create team.' });
  }
};

export const joinTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const validatedData = JoinHackathonTeamSchema.parse(req.body);
    const team = await hackathonService.joinTeam(req.params.hackathonId, req.user._id.toString(), validatedData.joinCode);
    return res.status(200).json({ success: true, message: 'Joined team successfully.', data: { team } });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation Failed', errors: error.errors });
    }
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to join team.' });
  }
};

export const getMyTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const team = await hackathonService.getMyTeam(req.params.hackathonId, req.user._id.toString());
    return res.status(200).json({ success: true, data: { team } });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to retrieve your team.' });
  }
};

export const listTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = await hackathonService.listTeams(req.params.hackathonId);
    return res.status(200).json({ success: true, data: { teams } });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to retrieve teams.' });
  }
};

export const renameTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const validatedData = CreateHackathonTeamSchema.parse(req.body);
    const isAdmin = req.user.role === 'admin';
    const team = await hackathonService.renameTeam(req.params.teamId, req.user._id.toString(), isAdmin, validatedData.name);
    return res.status(200).json({ success: true, message: 'Team renamed successfully.', data: { team } });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation Failed', errors: error.errors });
    }
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to rename team.' });
  }
};

export const deleteTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const isAdmin = req.user.role === 'admin';
    await hackathonService.deleteTeam(req.params.teamId, req.user._id.toString(), isAdmin);
    return res.status(200).json({ success: true, message: 'Team deleted successfully.' });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to delete team.' });
  }
};

export const leaveTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    await hackathonService.leaveTeam(req.params.teamId, req.user._id.toString());
    return res.status(200).json({ success: true, message: 'You have left the team.' });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to leave team.' });
  }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const isAdmin = req.user.role === 'admin';
    const team = await hackathonService.removeMember(req.params.teamId, req.user._id.toString(), isAdmin, req.params.userId);
    return res.status(200).json({ success: true, message: 'Member removed successfully.', data: { team } });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to remove member.' });
  }
};

// ==================== Submissions ====================

const parseExtraAnswers = (raw: any): Record<string, any> => {
  if (!raw) return {};
  let parsed: Record<string, any>;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('extraAnswers must be valid JSON.');
    }
  } else {
    parsed = raw;
  }
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((v) => (typeof v === 'string' ? sanitizeString(v) : v));
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const createSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });

    const anyReq = req as any;
    const body = { ...req.body, extraAnswers: parseExtraAnswers(req.body.extraAnswers) };
    const validatedData = CreateHackathonSubmissionSchema.parse(body);
    const uploadedFiles = anyReq.files || [];

    const submission = await hackathonService.createSubmission(
      req.params.hackathonId,
      req.user._id.toString(),
      validatedData,
      uploadedFiles
    );

    return res.status(201).json({ success: true, message: 'Submission created successfully.', data: { submission } });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation Failed', errors: error.errors });
    }
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to create submission.' });
  }
};

export const updateSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });

    const anyReq = req as any;
    const body = { ...req.body, extraAnswers: parseExtraAnswers(req.body.extraAnswers) };
    const validatedData = UpdateHackathonSubmissionSchema.parse(body);
    const uploadedFiles = anyReq.files || [];

    const submission = await hackathonService.updateSubmission(
      req.params.submissionId,
      req.user._id.toString(),
      validatedData,
      uploadedFiles
    );

    return res.status(200).json({ success: true, message: 'Submission updated successfully.', data: { submission } });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation Failed', errors: error.errors });
    }
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to update submission.' });
  }
};

export const getMySubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const submission = await hackathonService.getMySubmission(req.params.hackathonId, req.user._id.toString());
    return res.status(200).json({ success: true, data: { submission } });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to retrieve your submission.' });
  }
};

export const listSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const decision = req.query.decision as string;

    const result = await hackathonService.listSubmissions(req.params.hackathonId, { page, limit, decision });
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to retrieve submissions.' });
  }
};

export const decideSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    const validatedData = DecideHackathonSubmissionSchema.parse(req.body);
    const submission = await hackathonService.decideSubmission(
      req.params.submissionId,
      req.user._id.toString(),
      validatedData
    );
    return res.status(200).json({ success: true, message: 'Submission reviewed successfully.', data: { submission } });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, message: 'Validation Failed', errors: error.errors });
    }
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({ success: false, message: error.message || 'Failed to review submission.' });
  }
};
