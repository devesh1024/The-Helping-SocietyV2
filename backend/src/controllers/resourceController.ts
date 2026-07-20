import { Request, Response, NextFunction } from 'express';
import * as resourceService from '../services/resourceService';
import { uploadBuffer, streamFile } from '../utils/googleDrive';;
import path from 'path';

// Validate file metadata helper
const validateUploadedFile = (file?: any) => {
  if (!file) {
    throw new Error('File upload is required.');
  }

  // 1. Validate File Size: Max 50MB
  const maxBytes = 50 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('File size exceeds the maximum limit of 50MB.');
  }

  // 2. Validate File Extension: pdf, docx, ppt, pptx
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.docx', '.ppt', '.pptx'];
  if (!allowedExtensions.includes(ext)) {
    throw new Error('Only PDF, DOCX, PPT, and PPTX file types are allowed.');
  }
};

export const submitUploadRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const anyReq = req as any;
    validateUploadedFile(anyReq.file);

    const { title, description, category, year, branch } = req.body;
    if (!title || !description || !category || !year || !branch) {
      return res.status(400).json({ success: false, message: 'Title, description, category, year, and branch are required.' });
    }

    const yearFolder = year.trim();
    const branchFolder = branch.trim();
    const folderPath = `academic_resources/${yearFolder}/${branchFolder}`;

    // Stream file buffer to Cloudinary
    const fileResult = await uploadBuffer(anyReq.file.buffer, folderPath);

    const requestDoc = await resourceService.submitUploadRequest(
      req.user._id,
      { title, description, category, year, branch },
      {
	publicId: fileResult.public_id,
        secureUrl: fileResult.secure_url,
        fileType: path.extname(anyReq.file.originalname).substring(1).toLowerCase(),
        fileSize: anyReq.file.size,
        storageProvider: 'googleDrive'
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Resource request submitted successfully and is pending administrator approval.',
      data: { request: requestDoc }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit upload request.'
    });
  }
};

export const directUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const anyReq = req as any;
    validateUploadedFile(anyReq.file);

    const { title, description, category, year, branch } = req.body;
    if (!title || !description || !category || !year || !branch) {
      return res.status(400).json({ success: false, message: 'Title, description, category, year, and branch are required.' });
    }

    const yearFolder = year.trim();
    const branchFolder = branch.trim();
    const folderPath = `academic_resources/${yearFolder}/${branchFolder}`;

    // Stream file buffer to Cloudinary
    const fileResult = await uploadBuffer(anyReq.file.buffer, folderPath);

    const resource = await resourceService.directUpload(
      req.user._id,
      { title, description, category, year, branch },
      {
        publicId: fileResult.public_id,
        secureUrl: fileResult.secure_url,
        fileType: path.extname(anyReq.file.originalname).substring(1).toLowerCase(),
        fileSize: anyReq.file.size,
        storageProvider: 'googleDrive'
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully.',
      data: { resource }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload resource.'
    });
  }
};

export const getResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const year = req.query.year as string;
    const branch = req.query.branch as string;

    const result = await resourceService.getPaginatedResources({
      page,
      limit,
      search,
      category,
      year,
      branch
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch resources.'
    });
  }
};

export const getResourceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resource = await resourceService.getResourceById(req.params.id);
    return res.status(200).json({
      success: true,
      data: { resource }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const streamResourceFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resource = await resourceService.getResourceById(req.params.id);
    if (!resource || !resource.file?.publicId) {
      return res.status(404).json({ success: false, message: 'Resource file not found.' });
    }

    if (resource.file.storageProvider !== 'googleDrive') {
      return res.redirect(resource.file.secureUrl);
    }

    const { stream, mimeType } = await streamFile(resource.file.publicId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${resource.title}"`);
    stream.on('error', (err: Error) => {
      if (!res.headersSent) {
        res.status(502).json({ success: false, message: 'Failed to stream file from storage.' });
      }
    });
    stream.pipe(res);
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const updateResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description } = req.body;
    const updated = await resourceService.updateResource(req.params.id, { title, description });

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully.',
      data: { resource: updated }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await resourceService.deleteResource(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Resource deleted successfully.'
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const toggleLike = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const result = await resourceService.toggleLike(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: result.liked ? 'Resource liked.' : 'Resource unliked.',
      data: result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to toggle like.'
    });
  }
};

export const getResourceRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const status = req.query.status as string;

    const result = await resourceService.getPaginatedRequests({
      page,
      limit,
      status
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch resource requests.'
    });
  }
};

export const approveRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const resource = await resourceService.approveRequest(req.params.id, req.user._id.toString());
    return res.status(200).json({
      success: true,
      message: 'Resource request approved successfully.',
      data: { resource }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const rejectRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const requestDoc = await resourceService.rejectRequest(req.params.id, req.user._id.toString());
    return res.status(200).json({
      success: true,
      message: 'Resource request rejected successfully.',
      data: { request: requestDoc }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};
