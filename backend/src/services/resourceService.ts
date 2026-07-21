import * as resourceRepository from '../repositories/resourceRepository';
import * as resourceRequestRepository from '../repositories/resourceRequestRepository';
import * as resourceLikeRepository from '../repositories/resourceLikeRepository';
import { AuditLog } from '../models/AuditLog';
import mongoose from 'mongoose';

interface IFileMetadata {
  publicId: string;
  secureUrl: string;
  fileType: string;
  fileSize: number;
  storageProvider?: 'cloudinary' | 'googleDrive';
}

export const submitUploadRequest = async (
  userId: string | mongoose.Types.ObjectId,
  resourceData: { title: string; description: string; category: string; year: string; branch: string },
  fileData: { publicId: string; secureUrl: string; fileType: string; fileSize: number; storageProvider?: 'cloudinary' | 'googleDrive'; }
) => {
  return resourceRequestRepository.createRequest({
    title: resourceData.title,
    description: resourceData.description,
    category: resourceData.category,
    year: resourceData.year,
    branch: resourceData.branch,
    file: fileData,
    uploadedBy: userId,
    status: 'pending'
  });
};

export const directUpload = async (
  userId: string | mongoose.Types.ObjectId,
  resourceData: { title: string; description: string; category: string; year: string; branch: string },
  fileData: { publicId: string; secureUrl: string; fileType: string; fileSize: number; storageProvider?: 'cloudinary' | 'googleDrive'; }
) => {
  return resourceRepository.createResource({
    title: resourceData.title,
    description: resourceData.description,
    category: resourceData.category,
    year: resourceData.year,
    branch: resourceData.branch,
    file: fileData,
    uploadedBy: userId,
    likesCount: 0
  });
};

export const getPaginatedResources = async (query: {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  year?: string;
  branch?: string;
}) => {
  const page = Math.max(1, query.page);
  const limit = Math.max(1, Math.min(100, query.limit));
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (query.category) {
    filter.category = query.category;
  }

  if (query.year) {
    filter.year = query.year;
  }

  if (query.branch) {
    filter.branch = query.branch;
  }

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } }
    ];
  }

  const resources = await resourceRepository.findPaginated(filter, skip, limit);
  const total = await resourceRepository.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
    resources,
    total,
    page,
    limit,
    totalPages
  };
};

export const getResourceById = async (id: string) => {
  const resource = await resourceRepository.findById(id);
  if (!resource) {
    throw new Error('Resource not found.');
  }
  return resource;
};

export const updateResource = async (id: string, updateData: { title?: string; description?: string }) => {
  // Enforce updating only allowed fields (no direct likesCount or file modifications)
  const safeUpdate: any = {};
  if (updateData.title) safeUpdate.title = updateData.title;
  if (updateData.description) safeUpdate.description = updateData.description;

  const updated = await resourceRepository.updateResource(id, safeUpdate);
  if (!updated) {
    throw new Error('Resource not found.');
  }
  return updated;
};

export const deleteResource = async (id: string) => {
  const deleted = await resourceRepository.deleteResource(id);
  if (!deleted) {
    throw new Error('Resource not found.');
  }
  return deleted;
};

export const toggleLike = async (
  userId: string | mongoose.Types.ObjectId,
  resourceId: string | mongoose.Types.ObjectId
) => {
  const existingLike = await resourceLikeRepository.findLike(userId, resourceId);

  if (existingLike) {
    await resourceLikeRepository.removeLike(userId, resourceId);
    const resource = await resourceRepository.decrementLikes(resourceId.toString());
    return { liked: false, likesCount: resource?.likesCount || 0 };
  } else {
    await resourceLikeRepository.addLike(userId, resourceId);
    const resource = await resourceRepository.incrementLikes(resourceId.toString());
    return { liked: true, likesCount: resource?.likesCount || 0 };
  }
};

export const getPaginatedRequests = async (query: {
  page: number;
  limit: number;
  status?: string;
}) => {
  const page = Math.max(1, query.page);
  const limit = Math.max(1, Math.min(100, query.limit));
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (query.status) {
    filter.status = query.status;
  }

  const requests = await resourceRequestRepository.findPaginated(filter, skip, limit);
  const total = await resourceRequestRepository.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);

  return {
    requests,
    total,
    page,
    limit,
    totalPages
  };
};

export const approveRequest = async (requestId: string, adminId: string) => {
  const requestDoc = await resourceRequestRepository.findById(requestId);
  if (!requestDoc) {
    throw new Error('Resource request not found.');
  }

  if (requestDoc.status !== 'pending') {
    throw new Error(`Resource request has already been ${requestDoc.status}.`);
  }

  // Set request as approved
  requestDoc.status = 'approved';
  await requestDoc.save();

  // Create Resource document promoting request data
  const resource = await resourceRepository.createResource({
    title: requestDoc.title,
    description: requestDoc.description,
    category: requestDoc.category,
    year: (requestDoc as any).year,
    branch: (requestDoc as any).branch,
    file: requestDoc.file,
    uploadedBy: requestDoc.uploadedBy,
    likesCount: 0
  });

  // Log in AuditLog
  await AuditLog.create({
    actorId: adminId,
    action: 'approval',
    targetId: requestDoc._id,
    details: `Approved resource request: "${requestDoc.title}". Created resource ID: ${resource._id}`
  });

  return resource;
};

export const rejectRequest = async (requestId: string, adminId: string) => {
  const requestDoc = await resourceRequestRepository.findById(requestId);
  if (!requestDoc) {
    throw new Error('Resource request not found.');
  }

  if (requestDoc.status !== 'pending') {
    throw new Error(`Resource request has already been ${requestDoc.status}.`);
  }

  // Set request as rejected
  requestDoc.status = 'rejected';
  await requestDoc.save();

  // Log in AuditLog
  await AuditLog.create({
    actorId: adminId,
    action: 'rejection',
    targetId: requestDoc._id,
    details: `Rejected resource request: "${requestDoc.title}"`
  });

  return requestDoc;
};
