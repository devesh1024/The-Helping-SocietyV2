import mongoose from 'mongoose';
import * as opportunityRepository from '../repositories/opportunityRepository';
import { IOpportunity, Opportunity } from '../models/Opportunity';
import { createNotification } from './notificationService';
import { AuditLog } from '../models/AuditLog';
import { OpportunityArchive } from '../models/OpportunityArchive';

export const createOpportunity = async (
  createdBy: string | mongoose.Types.ObjectId,
  data: { 
    title: string; 
    description: string; 
    type: string; 
    link: string;
    company?: string;
    location?: string;
    deadline?: string;
    status?: 'open' | 'closed';
    eventAt?: string;
    conductedBy?: string;
    mode?: string;
    workType?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
  }
): Promise<IOpportunity> => {
  const opp = await opportunityRepository.createOpportunity({
    ...data,
    createdBy
  });

  // Only trigger a global notification for the new opportunity if approved immediately
  if (opp.approvalStatus === 'approved') {
    try {
      await createNotification({
        title: 'New Opportunity Posted',
        message: `A new ${opp.type} opportunity "${opp.title}" has been posted.`,
        type: 'opportunityPosted',
        recipientId: null,
        link: '/opportunities'
      });
    } catch (err) {
      console.error('Failed to trigger opportunity notification:', err);
    }
  }

  return opp;
};

export const getOpportunities = async (query: {
  page: number;
  limit: number;
  type?: string;
  search?: string;
  userId?: string;
  role?: string;
}) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter: any = {};

  // Build filters:
  // Approved opportunities are visible to all. Pending/rejected are visible only to their creators.
  if (query.userId) {
    const visibilityFilter = {
      $or: [
        { approvalStatus: 'approved' },
        { createdBy: query.userId }
      ]
    };
    const clauses: any[] = [visibilityFilter];

    if (query.type) {
      clauses.push({ type: query.type });
    }

    if (query.search) {
      clauses.push({
        $or: [
          { title: { $regex: query.search, $options: 'i' } },
          { description: { $regex: query.search, $options: 'i' } }
        ]
      });
    }

    if (clauses.length > 1) {
      filter.$and = clauses;
    } else {
      Object.assign(filter, clauses[0]);
    }
  } else {
    filter.approvalStatus = 'approved';
    if (query.type) {
      filter.type = query.type;
    }
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } }
      ];
    }
  }

  const opportunities = await opportunityRepository.findOpportunitiesPaginated(filter, skip, limit);
  const total = await opportunityRepository.countOpportunities(filter);
  const totalPages = Math.ceil(total / limit);

  return { opportunities, total, page, limit, totalPages };
};

export const getOpportunityById = async (id: string, userId?: string): Promise<any> => {
  const opportunity = await opportunityRepository.findOpportunityById(id);
  if (!opportunity) {
    throw new Error('Opportunity not found.');
  }

  let isLiked = false;
  let isSaved = false;
  if (userId) {
    const [like, save] = await Promise.all([
      opportunityRepository.findLike(userId, id),
      opportunityRepository.findSave(userId, id)
    ]);
    isLiked = !!like;
    isSaved = !!save;
  }

  return {
    ...(opportunity as any).toObject(),
    isLiked,
    isSaved
  };
};

export const toggleLike = async (
  userId: string | mongoose.Types.ObjectId,
  opportunityId: string | mongoose.Types.ObjectId
) => {
  const existingLike = await opportunityRepository.findLike(userId, opportunityId);

  if (existingLike) {
    await opportunityRepository.removeLike(userId, opportunityId);
    const opportunity = await opportunityRepository.decrementLikes(opportunityId.toString());
    return { liked: false, likesCount: opportunity?.likesCount || 0 };
  } else {
    await opportunityRepository.addLike(userId, opportunityId);
    const opportunity = await opportunityRepository.incrementLikes(opportunityId.toString());
    return { liked: true, likesCount: opportunity?.likesCount || 0 };
  }
};

export const toggleSave = async (
  userId: string | mongoose.Types.ObjectId,
  opportunityId: string | mongoose.Types.ObjectId
) => {
  const existingSave = await opportunityRepository.findSave(userId, opportunityId);

  if (existingSave) {
    await opportunityRepository.removeSave(userId, opportunityId);
    return { saved: false };
  } else {
    await opportunityRepository.addSave(userId, opportunityId);
    return { saved: true };
  }
};

export const updateOpportunity = async (
  id: string,
  updateData: { 
    title?: string; 
    description?: string; 
    type?: string; 
    link?: string;
    company?: string;
    location?: string;
    deadline?: string;
    status?: 'open' | 'closed';
    eventAt?: string;
    conductedBy?: string;
    mode?: string;
    workType?: string;
  }
): Promise<IOpportunity> => {
  const opportunity = await opportunityRepository.updateOpportunity(id, updateData);
  if (!opportunity) {
    throw new Error('Opportunity not found.');
  }
  return opportunity;
};

export const deleteOpportunity = async (id: string, actor?: any): Promise<void> => {
  const opp = await Opportunity.findById(id).populate('createdBy');
  if (!opp) {
    throw new Error('Opportunity not found.');
  }

  // Determine deletion reason
  let deletionReason: 'manual_user' | 'manual_admin' | 'auto_expired' = 'auto_expired';
  if (actor) {
    const creatorId = opp.createdBy instanceof mongoose.Types.ObjectId 
      ? opp.createdBy.toString() 
      : (opp.createdBy as any)?._id?.toString();
    
    if (actor._id?.toString() === creatorId || actor.id === creatorId) {
      deletionReason = 'manual_user';
    } else if (actor.role === 'admin') {
      deletionReason = 'manual_admin';
    } else {
      deletionReason = 'manual_user';
    }
  }

  const uploader = opp.createdBy as any;
  const archiveData = {
    originalOpportunity: opp.toObject(),
    companyName: opp.company || 'Unknown',
    jobTitle: opp.title,
    opportunityType: opp.type,
    deadline: opp.deadline,
    description: opp.description,
    uploadedBy: uploader?._id || opp.createdBy,
    uploaderName: uploader?.fullName || 'Unknown',
    uploaderRole: uploader?.role || 'Unknown',
    uploadedAt: opp.createdAt,
    deletedAt: new Date(),
    deletionReason
  };

  // Archive first
  await OpportunityArchive.create(archiveData);

  // Delete from live collection afterwards
  const deleted = await Opportunity.findByIdAndDelete(id);
  if (!deleted) {
    throw new Error('Opportunity not found.');
  }
};

export const getOpportunityRequests = async (query: { page: number; limit: number }) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter = { approvalStatus: 'pending' };
  const opportunities = await opportunityRepository.findOpportunitiesPaginated(filter, skip, limit);
  const total = await opportunityRepository.countOpportunities(filter);
  const totalPages = Math.ceil(total / limit);

  return { opportunities, total, page, limit, totalPages };
};

export const approveOpportunity = async (id: string, adminId: string): Promise<IOpportunity> => {
  const opp = await opportunityRepository.findOpportunityById(id);
  if (!opp) {
    throw new Error('Opportunity not found.');
  }
  if (opp.approvalStatus !== 'pending') {
    throw new Error(`Opportunity request is already ${opp.approvalStatus}.`);
  }

  opp.approvalStatus = 'approved';
  await opp.save();

  // Trigger a global notification for the approved opportunity
  try {
    await createNotification({
      title: 'New Opportunity Posted',
      message: `A new ${opp.type} opportunity "${opp.title}" has been posted.`,
      type: 'opportunityPosted',
      recipientId: null,
      link: '/opportunities'
    });
  } catch (err) {
    console.error('Failed to trigger opportunity notification:', err);
  }

  // Log in AuditLog
  await AuditLog.create({
    actorId: adminId,
    action: 'approval',
    targetId: opp._id,
    details: `Approved opportunity request: "${opp.title}".`
  });

  return opp;
};

export const rejectOpportunity = async (id: string, adminId: string): Promise<IOpportunity> => {
  const opp = await opportunityRepository.findOpportunityById(id);
  if (!opp) {
    throw new Error('Opportunity not found.');
  }
  if (opp.approvalStatus !== 'pending') {
    throw new Error(`Opportunity request is already ${opp.approvalStatus}.`);
  }

  opp.approvalStatus = 'rejected';
  await opp.save();

  // Log in AuditLog
  await AuditLog.create({
    actorId: adminId,
    action: 'rejection',
    targetId: opp._id,
    details: `Rejected opportunity request: "${opp.title}".`
  });

  return opp;
};
