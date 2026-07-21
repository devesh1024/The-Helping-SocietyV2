import { Opportunity, IOpportunity } from '../models/Opportunity';
import { OpportunityLike, IOpportunityLike } from '../models/OpportunityLike';
import { SavedOpportunity, ISavedOpportunity } from '../models/SavedOpportunity';
import mongoose from 'mongoose';

export const createOpportunity = async (data: any): Promise<IOpportunity> => {
  return Opportunity.create(data);
};

export const findOpportunityById = async (id: string): Promise<IOpportunity | null> => {
  return Opportunity.findById(id).populate('createdBy', 'fullName role').exec();
};

export const findOpportunitiesPaginated = async (
  filter: any,
  skip: number,
  limit: number
): Promise<IOpportunity[]> => {
  return Opportunity.find(filter)
    .populate('createdBy', 'fullName role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const countOpportunities = async (filter: any): Promise<number> => {
  return Opportunity.countDocuments(filter).exec();
};

export const updateOpportunity = async (
  id: string,
  updateData: any
): Promise<IOpportunity | null> => {
  return Opportunity.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).exec();
};

export const deleteOpportunity = async (id: string): Promise<any> => {
  return Opportunity.findByIdAndDelete(id).exec();
};

export const incrementLikes = async (id: string): Promise<IOpportunity | null> => {
  return Opportunity.findByIdAndUpdate(
    id,
    { $inc: { likesCount: 1 } },
    { new: true }
  ).exec();
};

export const decrementLikes = async (id: string): Promise<IOpportunity | null> => {
  return Opportunity.findByIdAndUpdate(
    id,
    { $inc: { likesCount: -1 } },
    { new: true }
  ).exec();
};

export const addLike = async (
  userId: string | mongoose.Types.ObjectId,
  opportunityId: string | mongoose.Types.ObjectId
): Promise<IOpportunityLike> => {
  return OpportunityLike.create({ userId, opportunityId });
};

export const removeLike = async (
  userId: string | mongoose.Types.ObjectId,
  opportunityId: string | mongoose.Types.ObjectId
): Promise<any> => {
  return OpportunityLike.deleteOne({ userId, opportunityId }).exec();
};

export const findLike = async (
  userId: string | mongoose.Types.ObjectId,
  opportunityId: string | mongoose.Types.ObjectId
): Promise<IOpportunityLike | null> => {
  return OpportunityLike.findOne({ userId, opportunityId }).exec();
};

export const addSave = async (
  userId: string | mongoose.Types.ObjectId,
  opportunityId: string | mongoose.Types.ObjectId
): Promise<ISavedOpportunity> => {
  return SavedOpportunity.create({ userId, opportunityId });
};

export const removeSave = async (
  userId: string | mongoose.Types.ObjectId,
  opportunityId: string | mongoose.Types.ObjectId
): Promise<any> => {
  return SavedOpportunity.deleteOne({ userId, opportunityId }).exec();
};

export const findSave = async (
  userId: string | mongoose.Types.ObjectId,
  opportunityId: string | mongoose.Types.ObjectId
): Promise<ISavedOpportunity | null> => {
  return SavedOpportunity.findOne({ userId, opportunityId }).exec();
};
