import { Router } from 'express';
import * as opportunityController from '../controllers/opportunityController';
import { authenticateUser, authorizeRoles, authorizeOwnership } from '../middleware/authMiddleware';
import { sanitizeMiddleware } from '../middleware/sanitizeMiddleware';

const router = Router();

const generalRoles = ['student', 'coreTeam', 'faculty', 'contributor', 'admin', 'alumni'];
const posterRoles = ['student', 'contributor', 'admin', 'alumni'];

router.post(
  '/opportunities',
  authenticateUser,
  authorizeRoles(...posterRoles),
  sanitizeMiddleware,
  opportunityController.createOpportunity
);

router.get(
  '/opportunities',
  authenticateUser,
  authorizeRoles(...generalRoles),
  opportunityController.getOpportunities
);

router.get(
  '/opportunities/:id',
  authenticateUser,
  authorizeRoles(...generalRoles),
  opportunityController.getOpportunityById
);

router.put(
  '/opportunities/:id',
  authenticateUser,
  authorizeRoles(...generalRoles),
  authorizeOwnership('Opportunity', 'id'),
  sanitizeMiddleware,
  opportunityController.updateOpportunity
);

router.delete(
  '/opportunities/:id',
  authenticateUser,
  authorizeRoles(...generalRoles),
  authorizeOwnership('Opportunity', 'id'),
  opportunityController.deleteOpportunity
);

router.post(
  '/opportunities/:id/like',
  authenticateUser,
  authorizeRoles(...generalRoles),
  opportunityController.toggleLike
);

router.post(
  '/opportunities/:id/save',
  authenticateUser,
  authorizeRoles(...generalRoles),
  opportunityController.toggleSave
);

// Admin-only opportunity request moderation
router.get(
  '/opportunity-requests',
  authenticateUser,
  authorizeRoles('admin'),
  opportunityController.getOpportunityRequests
);

router.patch(
  '/opportunity-requests/:id/approve',
  authenticateUser,
  authorizeRoles('admin'),
  opportunityController.approveOpportunity
);

router.patch(
  '/opportunity-requests/:id/reject',
  authenticateUser,
  authorizeRoles('admin'),
  opportunityController.rejectOpportunity
);

export default router;
