import { Router } from 'express';
import multer from 'multer';
import * as hackathonController from '../controllers/hackathonController';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware';
import { sanitizeMiddleware } from '../middleware/sanitizeMiddleware';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

const generalRoles = ['student', 'coreTeam', 'faculty', 'contributor', 'admin', 'alumni'];

router.post(
  '/hackathons',
  authenticateUser,
  authorizeRoles('admin'),
  sanitizeMiddleware,
  hackathonController.createHackathon
);

router.get(
  '/hackathons',
  authenticateUser,
  authorizeRoles(...generalRoles),
  hackathonController.getHackathons
);

router.get(
  '/hackathons/:id',
  authenticateUser,
  authorizeRoles(...generalRoles),
  hackathonController.getHackathonById
);

router.put(
  '/hackathons/:id',
  authenticateUser,
  authorizeRoles('admin'),
  sanitizeMiddleware,
  hackathonController.updateHackathon
);

router.delete(
  '/hackathons/:id',
  authenticateUser,
  authorizeRoles('admin'),
  hackathonController.deleteHackathon
);

router.post(
  '/hackathons/:hackathonId/teams',
  authenticateUser,
  authorizeRoles(...generalRoles),
  sanitizeMiddleware,
  hackathonController.createTeam
);

router.post(
  '/hackathons/:hackathonId/teams/join',
  authenticateUser,
  authorizeRoles(...generalRoles),
  sanitizeMiddleware,
  hackathonController.joinTeam
);

router.get(
  '/hackathons/:hackathonId/teams/mine',
  authenticateUser,
  authorizeRoles(...generalRoles),
  hackathonController.getMyTeam
);

router.get(
  '/hackathons/:hackathonId/teams',
  authenticateUser,
  authorizeRoles('admin'),
  hackathonController.listTeams
);

router.put(
  '/hackathons/teams/:teamId',
  authenticateUser,
  authorizeRoles(...generalRoles),
  sanitizeMiddleware,
  hackathonController.renameTeam
);

router.delete(
  '/hackathons/teams/:teamId',
  authenticateUser,
  authorizeRoles(...generalRoles),
  hackathonController.deleteTeam
);

router.post(
  '/hackathons/teams/:teamId/leave',
  authenticateUser,
  authorizeRoles(...generalRoles),
  hackathonController.leaveTeam
);

router.delete(
  '/hackathons/teams/:teamId/members/:userId',
  authenticateUser,
  authorizeRoles(...generalRoles),
  hackathonController.removeMember
);

router.post(
  '/hackathons/:hackathonId/submissions',
  authenticateUser,
  authorizeRoles(...generalRoles),
  upload.any(),
  sanitizeMiddleware,
  hackathonController.createSubmission
);

router.put(
  '/hackathons/submissions/:submissionId',
  authenticateUser,
  authorizeRoles(...generalRoles),
  upload.any(),
  sanitizeMiddleware,
  hackathonController.updateSubmission
);

router.get(
  '/hackathons/:hackathonId/submissions/mine',
  authenticateUser,
  authorizeRoles(...generalRoles),
  hackathonController.getMySubmission
);

router.get(
  '/hackathons/:hackathonId/submissions',
  authenticateUser,
  authorizeRoles('admin'),
  hackathonController.listSubmissions
);

router.patch(
  '/hackathons/submissions/:submissionId/decision',
  authenticateUser,
  authorizeRoles('admin'),
  sanitizeMiddleware,
  hackathonController.decideSubmission
);

export default router;
