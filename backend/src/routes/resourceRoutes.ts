import { Router } from 'express';
import multer from 'multer';
import * as resourceController from '../controllers/resourceController';
import { authenticateUser, authorizeRoles, authorizeOwnership } from '../middleware/authMiddleware';
import { sanitizeMiddleware } from '../middleware/sanitizeMiddleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Student / Core Team / Alumni submit upload request
router.post(
  '/resources/request',
  authenticateUser,
  authorizeRoles('student', 'coreTeam', 'alumni'),
  sanitizeMiddleware,
  upload.single('file'),
  resourceController.submitUploadRequest
);

// Faculty / Admin direct upload
router.post(
  '/resources',
  authenticateUser,
  authorizeRoles('faculty', 'admin'),
  sanitizeMiddleware,
  upload.single('file'),
  resourceController.directUpload
);

// General viewing (Access denied to guests and contributors)
router.get(
  '/resources',
  authenticateUser,
  authorizeRoles('student', 'coreTeam', 'faculty', 'admin', 'alumni'),
  resourceController.getResources
);

router.get(
  '/resources/:id',
  authenticateUser,
  authorizeRoles('student', 'coreTeam', 'faculty', 'admin', 'alumni'),
  resourceController.getResourceById
);

router.get(
  '/resources/:id/file',
  authenticateUser,
  authorizeRoles('student', 'coreTeam', 'faculty', 'admin', 'alumni'),
  resourceController.streamResourceFile
);

// Mutations (restricted by ownership & BOLA middleware)
router.put(
  '/resources/:id',
  authenticateUser,
  authorizeRoles('student', 'coreTeam', 'faculty', 'admin', 'alumni'),
  authorizeOwnership('Resource', 'id'),
  resourceController.updateResource
);

router.delete(
  '/resources/:id',
  authenticateUser,
  authorizeRoles('student', 'coreTeam', 'faculty', 'admin', 'alumni'),
  authorizeOwnership('Resource', 'id'),
  resourceController.deleteResource
);

// Interactions: Like toggle
router.post(
  '/resources/:id/like',
  authenticateUser,
  authorizeRoles('student', 'coreTeam', 'faculty', 'admin', 'alumni'),
  resourceController.toggleLike
);

// Admin-only request queues moderation
router.get(
  '/resource-requests',
  authenticateUser,
  authorizeRoles('admin'),
  resourceController.getResourceRequests
);

router.patch(
  '/resource-requests/:id/approve',
  authenticateUser,
  authorizeRoles('admin'),
  resourceController.approveRequest
);

router.patch(
  '/resource-requests/:id/reject',
  authenticateUser,
  authorizeRoles('admin'),
  resourceController.rejectRequest
);

export default router;
