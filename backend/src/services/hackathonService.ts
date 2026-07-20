import crypto from 'crypto';
import * as hackathonRepository from '../repositories/hackathonRepository';
import * as googleDrive from '../utils/googleDrive';
import { IHackathon } from '../models/Hackathon';
import { IHackathonTeam } from '../models/HackathonTeam';
import { IHackathonSubmission } from '../models/HackathonSubmission';

// ==================== Hackathons ====================

export const createHackathon = async (
  createdBy: string,
  data: {
    title: string;
    description: string;
    category: string;
    participationMode: string;
    teamSize?: { min: number; max: number };
    launchDate?: string;
    registrationDeadline?: string;
    extraQuestions?: any[];
  }
): Promise<IHackathon> => {
  return hackathonRepository.createHackathon({ ...data, createdBy });
};

export const getHackathons = async (query: {
  page: number;
  limit: number;
  category?: string;
  search?: string;
  isAdmin: boolean;
}) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter: any = {};

  // Non-admins never see drafts — a hackathon only becomes visible once published.
  if (!query.isAdmin) {
    filter.status = { $in: ['live', 'closed'] };
  }

  if (query.category) {
    filter.category = query.category;
  }

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } }
    ];
  }

  const hackathons = await hackathonRepository.findHackathonsPaginated(filter, skip, limit);
  const total = await hackathonRepository.countHackathons(filter);
  const totalPages = Math.ceil(total / limit);

  return { hackathons, total, page, limit, totalPages };
};

export const getHackathonById = async (id: string, isAdmin: boolean): Promise<IHackathon> => {
  const hackathon = await hackathonRepository.findHackathonById(id);
  if (!hackathon) {
    throw new Error('Hackathon not found.');
  }
  if (hackathon.status === 'draft' && !isAdmin) {
    // Treat an unpublished draft as invisible to non-admins, same 404 as truly missing.
    throw new Error('Hackathon not found.');
  }
  return hackathon;
};

export const updateHackathon = async (
  id: string,
  updateData: {
    title?: string;
    description?: string;
    category?: string;
    status?: string;
    participationMode?: string;
    teamSize?: { min: number; max: number };
    launchDate?: string;
    registrationDeadline?: string;
    extraQuestions?: any[];
  }
): Promise<IHackathon> => {
  const existing = await hackathonRepository.findHackathonById(id);
  if (!existing) {
    throw new Error('Hackathon not found.');
  }

  // extraQuestions define the submission form. Once the hackathon is live/closed,
  // participants may already be relying on that form shape — changing it afterward
  // would silently invalidate in-progress or past submissions, so it's locked to draft only.
  if (updateData.extraQuestions && existing.status !== 'draft') {
    throw new Error('extraQuestions can only be edited while the hackathon is in draft status.');
  }

  const hackathon = await hackathonRepository.updateHackathon(id, updateData);
  if (!hackathon) {
    throw new Error('Hackathon not found.');
  }
  return hackathon;
};

export const deleteHackathon = async (id: string): Promise<void> => {
  const deleted = await hackathonRepository.deleteHackathon(id);
  if (!deleted) {
    throw new Error('Hackathon not found.');
  }
};

// ==================== Teams ====================

const generateJoinCode = (): string => {
  // 6 uppercase alphanumeric chars, e.g. "K3F9QZ" — short enough to share verbally, long enough to not guess.
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
};

const assertHackathonOpenForTeams = (hackathon: any) => {
  if (hackathon.participationMode === 'individual') {
    throw new Error('This hackathon does not support team participation.');
  }
  if (hackathon.status !== 'live') {
    throw new Error('Team registration is only open while the hackathon is live.');
  }
  if (hackathon.registrationDeadline && new Date() > new Date(hackathon.registrationDeadline)) {
    throw new Error('The registration deadline for this hackathon has passed.');
  }
};

export const createTeam = async (
  hackathonId: string,
  leaderId: string,
  data: { name: string }
): Promise<IHackathonTeam> => {
  const hackathon = await hackathonRepository.findHackathonById(hackathonId);
  if (!hackathon) {
    throw new Error('Hackathon not found.');
  }
  assertHackathonOpenForTeams(hackathon);

  const existingTeam = await hackathonRepository.findTeamByHackathonAndMember(hackathonId, leaderId);
  if (existingTeam) {
    throw new Error('You are already part of a team for this hackathon.');
  }

  // Retry on the rare chance of a joinCode collision within the same hackathon.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await hackathonRepository.createTeam({
        hackathonId,
        name: data.name,
        leaderId,
        members: [leaderId],
        joinCode: generateJoinCode()
      });
    } catch (err: any) {
      const isJoinCodeCollision = err.code === 11000 && err.keyPattern?.joinCode;
      if (!isJoinCodeCollision || attempt === 4) {
        if (err.code === 11000) {
          throw new Error('A team with this name already exists in this hackathon.');
        }
        throw err;
      }
    }
  }
  throw new Error('Failed to create team. Please try again.');
};

export const joinTeam = async (
  hackathonId: string,
  userId: string,
  joinCode: string
): Promise<IHackathonTeam> => {
  const hackathon = await hackathonRepository.findHackathonById(hackathonId);
  if (!hackathon) {
    throw new Error('Hackathon not found.');
  }
  assertHackathonOpenForTeams(hackathon);

  const existingTeam = await hackathonRepository.findTeamByHackathonAndMember(hackathonId, userId);
  if (existingTeam) {
    throw new Error('You are already part of a team for this hackathon.');
  }

  const team = await hackathonRepository.findTeamByHackathonAndJoinCode(hackathonId, joinCode);
  if (!team) {
    throw new Error('Invalid join code.');
  }

  if (hackathon.teamSize && team.members.length >= hackathon.teamSize.max) {
    throw new Error(`This team has reached the maximum size of ${hackathon.teamSize.max}.`);
  }

  const updated = await hackathonRepository.addMemberToTeam(team._id.toString(), userId);
  return updated as IHackathonTeam;
};

export const getMyTeam = async (hackathonId: string, userId: string): Promise<IHackathonTeam | null> => {
  return hackathonRepository.findTeamByHackathonAndMember(hackathonId, userId);
};

export const listTeams = async (hackathonId: string): Promise<IHackathonTeam[]> => {
  // Admin-only oversight listing — includes joinCode, since only admins can call this route.
  return hackathonRepository.findTeamsByHackathon(hackathonId);
};

export const renameTeam = async (
  teamId: string,
  requesterId: string,
  isAdmin: boolean,
  name: string
): Promise<IHackathonTeam> => {
  const team = await hackathonRepository.findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found.');
  }
  if (!isAdmin && team.leaderId.toString() !== requesterId) {
    throw new Error('Only the team leader can rename the team.');
  }

  try {
    const updated = await hackathonRepository.updateTeam(teamId, { name });
    return updated as IHackathonTeam;
  } catch (err: any) {
    if (err.code === 11000) {
      throw new Error('A team with this name already exists in this hackathon.');
    }
    throw err;
  }
};

export const deleteTeam = async (teamId: string, requesterId: string, isAdmin: boolean): Promise<void> => {
  const team = await hackathonRepository.findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found.');
  }
  if (!isAdmin && team.leaderId.toString() !== requesterId) {
    throw new Error('Only the team leader can delete the team.');
  }
  const submission = await hackathonRepository.findSubmissionByHackathonAndTeam(
    team.hackathonId.toString(),
    teamId
  );
  if (submission) {
    throw new Error('This team has already submitted an entry and cannot be deleted.');
  }
  await hackathonRepository.deleteTeam(teamId);
};

export const leaveTeam = async (teamId: string, userId: string): Promise<void> => {
  const team = await hackathonRepository.findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found.');
  }
  if (team.leaderId.toString() === userId) {
    throw new Error('The team leader cannot leave the team. Delete the team instead.');
  }
  if (!team.members.some((m) => m.toString() === userId)) {
    throw new Error('You are not a member of this team.');
  }
  await hackathonRepository.removeMemberFromTeam(teamId, userId);
};

export const removeMember = async (
  teamId: string,
  requesterId: string,
  isAdmin: boolean,
  targetUserId: string
): Promise<IHackathonTeam> => {
  const team = await hackathonRepository.findTeamById(teamId);
  if (!team) {
    throw new Error('Team not found.');
  }
  if (!isAdmin && team.leaderId.toString() !== requesterId) {
    throw new Error('Only the team leader can remove members.');
  }
  if (team.leaderId.toString() === targetUserId) {
    throw new Error('The team leader cannot be removed. Delete the team instead.');
  }
  const updated = await hackathonRepository.removeMemberFromTeam(teamId, targetUserId);
  return updated as IHackathonTeam;
};

// ==================== Submissions ====================

interface UploadedFile {
  fieldname: string; // matches extraQuestions[].key
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const isFileAcceptable = (file: UploadedFile, accept: string[]): boolean => {
  const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
  return accept.some((rule) => {
    if (rule.includes('/')) {
      // mime pattern, e.g. "image/*" or "image/png"
      if (rule.endsWith('/*')) return file.mimetype.startsWith(rule.replace('/*', '/'));
      return file.mimetype === rule;
    }
    return rule.replace('.', '').toLowerCase() === ext;
  });
};

/**
 * Validates extraAnswers + uploadedFiles against the hackathon's extraQuestions
 * definition and returns the normalized extraAnswers to persist.
 */
const validateAndBuildAnswers = (
  hackathon: any,
  extraAnswers: Record<string, any>,
  uploadedFiles: UploadedFile[]
) => {
  const filesByKey = new Map(uploadedFiles.map((f) => [f.fieldname, f]));

  for (const question of hackathon.extraQuestions || []) {
    const answer = extraAnswers[question.key];
    const file = filesByKey.get(question.key);

    if (question.type === 'file') {
      if (question.required && !file) {
        throw new Error(`"${question.label}" requires a file upload.`);
      }
      if (file && question.accept && !isFileAcceptable(file, question.accept)) {
        throw new Error(`"${question.label}" only accepts: ${question.accept.join(', ')}`);
      }
      continue;
    }

    if (question.required && (answer === undefined || answer === null || answer === '')) {
      throw new Error(`"${question.label}" is required.`);
    }
    if (answer === undefined) continue;

    if (question.type === 'radio' && question.options && !question.options.includes(answer)) {
      throw new Error(`"${question.label}" must be one of: ${question.options.join(', ')}`);
    }
    if (question.type === 'checkbox' && question.options) {
      const values: string[] = Array.isArray(answer) ? answer : [answer];
      const invalid = values.filter((v) => !question.options!.includes(v));
      if (invalid.length > 0) {
        throw new Error(`"${question.label}" contains invalid option(s): ${invalid.join(', ')}`);
      }
    }
  }

  return extraAnswers;
};

const resolveParticipant = async (
  hackathon: any,
  userId: string
): Promise<{ participantType: 'individual' | 'team'; userId?: string; teamId?: string }> => {
  const team = await hackathonRepository.findTeamByHackathonAndMember(hackathon._id.toString(), userId);

  if (hackathon.participationMode === 'individual') {
    if (team) throw new Error('This hackathon does not support team submissions.');
    return { participantType: 'individual', userId };
  }

  if (hackathon.participationMode === 'team') {
    if (!team) throw new Error('You must join or create a team before submitting.');
    return { participantType: 'team', teamId: team._id.toString() };
  }

  // 'both' — infer from whether the user currently belongs to a team for this hackathon.
  return team
    ? { participantType: 'team', teamId: team._id.toString() }
    : { participantType: 'individual', userId };
};

export const createSubmission = async (
  hackathonId: string,
  userId: string,
  data: {
    title: string;
    description: string;
    repoUrl?: string;
    demoUrl?: string;
    videoUrl?: string;
    extraAnswers?: Record<string, any>;
  },
  uploadedFiles: UploadedFile[]
): Promise<IHackathonSubmission> => {
  const hackathon = await hackathonRepository.findHackathonById(hackathonId);
  if (!hackathon) {
    throw new Error('Hackathon not found.');
  }
  if (hackathon.status !== 'live') {
    throw new Error('Submissions are only open while the hackathon is live.');
  }
  if (hackathon.registrationDeadline && new Date() > new Date(hackathon.registrationDeadline)) {
    throw new Error('The submission deadline for this hackathon has passed.');
  }

  const participant = await resolveParticipant(hackathon, userId);

  const existing = participant.teamId
    ? await hackathonRepository.findSubmissionByHackathonAndTeam(hackathonId, participant.teamId)
    : await hackathonRepository.findSubmissionByHackathonAndUser(hackathonId, userId);
  if (existing) {
    throw new Error('A submission already exists for this hackathon.');
  }

  const extraAnswers = validateAndBuildAnswers(hackathon, data.extraAnswers || {}, uploadedFiles);

  const files = [];
  for (const f of uploadedFiles) {
    const uploaded = await googleDrive.uploadHackathonSubmissionFile(f.buffer, `hackathon_submissions/${hackathonId}`);
    files.push({
      key: f.fieldname,
      publicId: uploaded.public_id,
      secureUrl: uploaded.secure_url,
      fileType: f.originalname.split('.').pop()?.toLowerCase() || '',
      fileSize: f.size
    });
  }

  try {
    return await hackathonRepository.createSubmission({
      hackathonId,
      participantType: participant.participantType,
      userId: participant.userId,
      teamId: participant.teamId,
      title: data.title,
      description: data.description,
      repoUrl: data.repoUrl,
      demoUrl: data.demoUrl,
      videoUrl: data.videoUrl,
      extraAnswers,
      files
    });
  } catch (err: any) {
    if (err.code === 11000) {
      throw new Error('A submission already exists for this hackathon.');
    }
    throw err;
  }
};

const assertCanEditSubmission = async (submission: any, userId: string) => {
  if (submission.decision !== 'pending') {
    throw new Error('This submission has already been reviewed and can no longer be edited.');
  }
  if (submission.participantType === 'individual') {
    if (submission.userId.toString() !== userId) {
      throw new Error('You do not have permission to edit this submission.');
    }
    return;
  }
  const team = await hackathonRepository.findTeamById(submission.teamId.toString());
  if (!team || !team.members.some((m: any) => m.toString() === userId)) {
    throw new Error('You do not have permission to edit this submission.');
  }
};

export const updateSubmission = async (
  submissionId: string,
  userId: string,
  data: Partial<{
    title: string;
    description: string;
    repoUrl?: string;
    demoUrl?: string;
    videoUrl?: string;
    extraAnswers?: Record<string, any>;
  }>,
  uploadedFiles: UploadedFile[]
): Promise<IHackathonSubmission> => {
  const submission = await hackathonRepository.findSubmissionById(submissionId);
  if (!submission) {
    throw new Error('Submission not found.');
  }
  await assertCanEditSubmission(submission, userId);

  const hackathon = await hackathonRepository.findHackathonById(submission.hackathonId.toString());
  if (!hackathon) {
    throw new Error('Hackathon not found.');
  }

  const mergedAnswers = { ...Object.fromEntries(submission.extraAnswers), ...(data.extraAnswers || {}) };
  validateAndBuildAnswers(hackathon, mergedAnswers, uploadedFiles);

  const newFiles = [...submission.files];
  for (const f of uploadedFiles) {
    const uploaded = await googleDrive.uploadHackathonSubmissionFile(
      f.buffer,
      `hackathon_submissions/${submission.hackathonId}`
    );
    const fileEntry = {
      key: f.fieldname,
      publicId: uploaded.public_id,
      secureUrl: uploaded.secure_url,
      fileType: f.originalname.split('.').pop()?.toLowerCase() || '',
      fileSize: f.size
    };
    const idx = newFiles.findIndex((existingFile) => existingFile.key === f.fieldname);
    if (idx >= 0) newFiles[idx] = fileEntry;
    else newFiles.push(fileEntry);
  }

  const updated = await hackathonRepository.updateSubmission(submissionId, {
    ...data,
    extraAnswers: mergedAnswers,
    files: newFiles
  });
  return updated as IHackathonSubmission;
};

export const getMySubmission = async (
  hackathonId: string,
  userId: string
): Promise<IHackathonSubmission | null> => {
  const own = await hackathonRepository.findSubmissionByHackathonAndUser(hackathonId, userId);
  if (own) return own;

  const team = await hackathonRepository.findTeamByHackathonAndMember(hackathonId, userId);
  if (!team) return null;
  return hackathonRepository.findSubmissionByHackathonAndTeam(hackathonId, team._id.toString());
};

export const listSubmissions = async (
  hackathonId: string,
  query: { page: number; limit: number; decision?: string }
) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter: any = { hackathonId };
  if (query.decision) filter.decision = query.decision;

  const submissions = await hackathonRepository.findSubmissionsByHackathonPaginated(filter, skip, limit);
  const total = await hackathonRepository.countSubmissions(filter);
  return { submissions, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const decideSubmission = async (
  submissionId: string,
  reviewerId: string,
  data: { decision: 'selected' | 'rejected'; decisionComment?: string }
): Promise<IHackathonSubmission> => {
  const submission = await hackathonRepository.findSubmissionById(submissionId);
  if (!submission) {
    throw new Error('Submission not found.');
  }
  const updated = await hackathonRepository.updateSubmission(submissionId, {
    decision: data.decision,
    decisionComment: data.decisionComment,
    reviewedBy: reviewerId
  });
  return updated as IHackathonSubmission;
};
