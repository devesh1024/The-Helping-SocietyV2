import { Request, Response, NextFunction } from 'express';
import * as communityService from '../services/communityService';
import { uploadImageBuffer } from '../utils/googleDrive';

// === Lost & Found ===
export const createLostFound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const title = req.body.title;
    const description = req.body.description || req.body.content;
    const metadata = req.body.metadata || {};
    const location = req.body.location || metadata.location || 'Campus';
    const contactNumber = req.body.contactNumber || metadata.contact || (req.user as any).phoneNumber || req.user.email;
    const images = req.body.images || [];

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required.'
      });
    }

    const post = await communityService.createLostFound(req.user._id, {
      title,
      description,
      contactNumber,
      location,
      images,
      metadata
    });

    return res.status(201).json({
      success: true,
      message: 'Lost & Found post created successfully.',
      data: { post }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create Lost & Found post.'
    });
  }
};

export const getLostFound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const status = req.query.status as string;

    const result = await communityService.getLostFound({ page, limit, status });
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch Lost & Found posts.'
    });
  }
};

export const getLostFoundById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await communityService.getLostFoundById(req.params.id);
    return res.status(200).json({
      success: true,
      data: { post }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const updateLostFound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, content, contactNumber, location, images, metadata } = req.body;
    const post = await communityService.updateLostFound(req.params.id, {
      title,
      description: description || content,
      contactNumber,
      location,
      images,
      metadata
    });

    return res.status(200).json({
      success: true,
      message: 'Lost & Found post updated successfully.',
      data: { post }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteLostFound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await communityService.deleteLostFound(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Lost & Found post deleted successfully.'
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const resolveLostFound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await communityService.resolveLostFound(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Lost & Found post resolved successfully. Post will automatically delete in 24 hours.',
      data: { post }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

// === Rooms ===
export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const metadata = req.body.metadata || {};
    const location = req.body.location || metadata.location;
    const contactNumber = req.body.contactNumber || metadata.contact || (req.user as any).phoneNumber || req.user.email;
    const title = req.body.title || `Room at ${location || 'Campus'}`;
    const description = req.body.description || req.body.content || ' ';
    const priceRaw = req.body.price !== undefined ? req.body.price : metadata.rent;
    const images = req.body.images || [];

    const cleanPrice = String(priceRaw || '0').replace(/[^\d.]/g, '');
    const price = parseFloat(cleanPrice) || 0;

    if (!location || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Location and contactNumber are required.'
      });
    }

    const post = await communityService.createRoom(req.user._id, {
      title,
      description,
      price,
      location,
      contactNumber,
      images,
      metadata
    });

    return res.status(201).json({
      success: true,
      message: 'Room listing created successfully.',
      data: { post }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create room listing.'
    });
  }
};

export const getRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const result = await communityService.getRooms({ page, limit });
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch room listings.'
    });
  }
};

export const getRoomById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await communityService.getRoomById(req.params.id);
    return res.status(200).json({
      success: true,
      data: { post }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, content, price, location, contactNumber, images, metadata } = req.body;
    
    let priceNum: number | undefined = undefined;
    if (price !== undefined && price !== null) {
      const cleanPrice = String(price).replace(/[^\d.]/g, '');
      priceNum = parseFloat(cleanPrice) || 0;
    }

    const post = await communityService.updateRoom(req.params.id, {
      title,
      description: description || content,
      price: priceNum,
      location,
      contactNumber,
      images,
      metadata
    });

    return res.status(200).json({
      success: true,
      message: 'Room listing updated successfully.',
      data: { post }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await communityService.deleteRoom(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Room listing deleted successfully.'
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

// === Marketplace ===
export const createMarketplace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const metadata = req.body.metadata || {};
    const title = req.body.title;
    const description = req.body.description || req.body.content || ' ';
    const priceRaw = req.body.price !== undefined ? req.body.price : metadata.price;
    const contactNumber = req.body.contactNumber || metadata.contact || (req.user as any).phoneNumber || req.user.email;
    const images = req.body.images || [];

    const cleanPrice = String(priceRaw || '0').replace(/[^\d.]/g, '');
    const price = parseFloat(cleanPrice) || 0;

    if (!title || !description || !contactNumber || !images || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, contactNumber, and at least one image are required.'
      });
    }

    const post = await communityService.createMarketplace(req.user._id, {
      title,
      description,
      price,
      contactNumber,
      images,
      metadata
    });

    return res.status(201).json({
      success: true,
      message: 'Marketplace post created successfully.',
      data: { post }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create marketplace post.'
    });
  }
};

export const getMarketplace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const result = await communityService.getMarketplace({ page, limit });
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch marketplace posts.'
    });
  }
};

export const getMarketplaceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await communityService.getMarketplaceById(req.params.id);
    return res.status(200).json({
      success: true,
      data: { post }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const updateMarketplace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, content, price, contactNumber, images, metadata } = req.body;
    
    let priceNum: number | undefined = undefined;
    if (price !== undefined && price !== null) {
      const cleanPrice = String(price).replace(/[^\d.]/g, '');
      priceNum = parseFloat(cleanPrice) || 0;
    }

    const post = await communityService.updateMarketplace(req.params.id, {
      title,
      description: description || content,
      price: priceNum,
      contactNumber,
      images,
      metadata
    });

    return res.status(200).json({
      success: true,
      message: 'Marketplace post updated successfully.',
      data: { post }
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteMarketplace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await communityService.deleteMarketplace(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Marketplace post deleted successfully.'
    });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
};

export const uploadImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const result = await uploadImageBuffer(file.buffer);

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully.',
      data: {
        secureUrl: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image.'
    });
  }
};
