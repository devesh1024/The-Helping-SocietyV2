import { Hackathon, IHackathon } from '../models/Hackathon';
import { HackathonTeam, IHackathonTeam } from '../models/HackathonTeam';
import { HackathonSubmission, IHackathonSubmission } from '../models/HackathonSubmission';

// ==================== Hackathons ====================

export const createHackathon = async (data: any): Promise<IHackathon> => {
  return Hackathon.create(data);
};

export const findHackathonById = async (id: string): Promise<IHackathon | null> => {
  return Hackathon.findById(id).populate('createdBy', 'fullName role').exec();
};

export const findHackathonsPaginated = async (
  filter: any,
  skip: number,
  limit: number
): Promise<IHackathon[]> => {
  return Hackathon.find(filter)
    .populate('createdBy', 'fullName role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const countHackathons = async (filter: any): Promise<number> => {
  return Hackathon.countDocuments(filter).exec();
};

export const updateHackathon = async (id: string, updateData: any): Promise<IHackathon | null> => {
  return Hackathon.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).exec();
};

export const deleteHackathon = async (id: string): Promise<any> => {
  return Hackathon.findByIdAndDelete(id).exec();
};

// ==================== Teams ====================

export const createTeam = async (data: any): Promise<IHackathonTeam> => {
  return HackathonTeam.create(data);
};

export const findTeamById = async (id: string): Promise<IHackathonTeam | null> => {
  return HackathonTeam.findById(id).exec();
};

export const findTeamByHackathonAndJoinCode = async (
  hackathonId: string,
  joinCode: string
): Promise<IHackathonTeam | null> => {
  return HackathonTeam.findOne({ hackathonId, joinCode: joinCode.toUpperCase() }).exec();
};

export const findTeamByHackathonAndMember = async (
  hackathonId: string,
  userId: string
): Promise<IHackathonTeam | null> => {
  return HackathonTeam.findOne({ hackathonId, members: userId }).exec();
};

export const findTeamByHackathonAndMemberPopulated = async (
  hackathonId: string,
  userId: string
): Promise<any> => {
  return HackathonTeam.findOne({ hackathonId, members: userId })
    .populate('leaderId', 'fullName')
    .populate('members', 'fullName')
    .exec();
};

export const findTeamsByHackathon = async (hackathonId: string): Promise<any[]> => {
  return HackathonTeam.find({ hackathonId })
    .populate('leaderId', 'fullName')
    .populate('members', 'fullName')
    .sort({ createdAt: -1 })
    .exec();
};

export const updateTeam = async (id: string, updateData: any): Promise<IHackathonTeam | null> => {
  return HackathonTeam.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).exec();
};

export const deleteTeam = async (id: string): Promise<any> => {
  return HackathonTeam.findByIdAndDelete(id).exec();
};

export const addMemberToTeam = async (id: string, userId: string): Promise<IHackathonTeam | null> => {
  return HackathonTeam.findByIdAndUpdate(id, { $addToSet: { members: userId } }, { new: true }).exec();
};

export const removeMemberFromTeam = async (id: string, userId: string): Promise<IHackathonTeam | null> => {
  return HackathonTeam.findByIdAndUpdate(id, { $pull: { members: userId } }, { new: true }).exec();
};

// ==================== Submissions ====================

export const createSubmission = async (data: any): Promise<IHackathonSubmission> => {
  return HackathonSubmission.create(data);
};

export const findSubmissionById = async (id: string): Promise<IHackathonSubmission | null> => {
  return HackathonSubmission.findById(id).exec();
};

export const findSubmissionByHackathonAndUser = async (
  hackathonId: string,
  userId: string
): Promise<IHackathonSubmission | null> => {
  return HackathonSubmission.findOne({ hackathonId, userId }).exec();
};

export const findSubmissionByHackathonAndTeam = async (
  hackathonId: string,
  teamId: string
): Promise<IHackathonSubmission | null> => {
  return HackathonSubmission.findOne({ hackathonId, teamId }).exec();
};

export const findSubmissionsByHackathonPaginated = async (
  filter: any,
  skip: number,
  limit: number
): Promise<IHackathonSubmission[]> => {
  return HackathonSubmission.find(filter)
    .populate('userId', 'fullName role')
    .populate('teamId', 'name')
    .populate('reviewedBy', 'fullName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const countSubmissions = async (filter: any): Promise<number> => {
  return HackathonSubmission.countDocuments(filter).exec();
};

export const updateSubmission = async (id: string, updateData: any): Promise<IHackathonSubmission | null> => {
  return HackathonSubmission.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).exec();
};
