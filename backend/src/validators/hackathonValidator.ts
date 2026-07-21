import { z } from 'zod';

// ==================== Shared ====================

const hackathonCategoryEnum = z.enum(['technical', 'poster', 'video', 'social_media'], {
  errorMap: () => ({ message: "Category must be one of 'technical', 'poster', 'video', or 'social_media'" })
});

const participationModeEnum = z.enum(['individual', 'team', 'both'], {
  errorMap: () => ({ message: "Participation mode must be one of 'individual', 'team', or 'both'" })
});

const questionTypeEnum = z.enum(['text', 'number', 'radio', 'checkbox', 'file'], {
  errorMap: () => ({ message: "Question type must be one of 'text', 'number', 'radio', 'checkbox', or 'file'" })
});

const extraQuestionSchema = z.object({
  key: z.string().min(1, 'Question key is required').max(50, 'Question key cannot exceed 50 characters'),
  label: z.string().min(1, 'Question label is required').max(200, 'Question label cannot exceed 200 characters'),
  type: questionTypeEnum,
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  accept: z.array(z.string()).optional()
}).superRefine((val, ctx) => {
  if ((val.type === 'radio' || val.type === 'checkbox') && (!val.options || val.options.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Questions of type 'radio' or 'checkbox' must provide at least one option",
      path: ['options']
    });
  }
  if (val.type === 'file' && (!val.accept || val.accept.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Questions of type 'file' must provide at least one accepted file type in 'accept'",
      path: ['accept']
    });
  }
});

const dateStringValidation = z.string().optional().refine((val) => {
  if (!val) return true;
  return !isNaN(new Date(val).getTime());
}, { message: 'Must be a valid date' });

function checkTeamSizeConsistency(
  val: { participationMode?: string; teamSize?: { min: number; max: number } },
  ctx: z.RefinementCtx
) {
  if (val.participationMode === 'team' || val.participationMode === 'both') {
    if (!val.teamSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "teamSize (min, max) is required when participationMode is 'team' or 'both'",
        path: ['teamSize']
      });
      return;
    }
    if (val.teamSize.min > val.teamSize.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'teamSize.min cannot be greater than teamSize.max',
        path: ['teamSize']
      });
    }
  }
}

// ==================== Hackathon ====================

export const CreateHackathonSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters long').max(150, 'Title cannot exceed 150 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters long').max(5000, 'Description cannot exceed 5000 characters'),
  category: hackathonCategoryEnum,
  participationMode: participationModeEnum,
  teamSize: z.object({
    min: z.number().int().min(1),
    max: z.number().int().min(1)
  }).optional(),
  launchDate: dateStringValidation,
  registrationDeadline: dateStringValidation,
  extraQuestions: z.array(extraQuestionSchema).max(20, 'Cannot have more than 20 questions').optional().default([])
}).superRefine(checkTeamSizeConsistency);

export const UpdateHackathonSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters long').max(150, 'Title cannot exceed 150 characters').optional(),
  description: z.string().min(5, 'Description must be at least 5 characters long').max(5000, 'Description cannot exceed 5000 characters').optional(),
  category: hackathonCategoryEnum.optional(),
  status: z.enum(['draft', 'live', 'closed']).optional(),
  participationMode: participationModeEnum.optional(),
  teamSize: z.object({
    min: z.number().int().min(1),
    max: z.number().int().min(1)
  }).optional(),
  launchDate: dateStringValidation,
  registrationDeadline: dateStringValidation,
  extraQuestions: z.array(extraQuestionSchema).max(20, 'Cannot have more than 20 questions').optional()
}).superRefine((val, ctx) => {
  if (val.participationMode) {
    checkTeamSizeConsistency(val, ctx);
  }
});

// ==================== Hackathon Team ====================

export const CreateHackathonTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters long').max(80, 'Team name cannot exceed 80 characters')
});

export const JoinHackathonTeamSchema = z.object({
  joinCode: z.string().min(4, 'Join code is required')
});

// ==================== Hackathon Submission ====================

const optionalUrl = z.string().url('Must be a valid absolute HTTP or HTTPS URL.').optional().or(z.literal(''));

export const CreateHackathonSubmissionSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters long').max(150, 'Title cannot exceed 150 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters long').max(3000, 'Description cannot exceed 3000 characters'),
  repoUrl: optionalUrl,
  demoUrl: optionalUrl,
  videoUrl: optionalUrl,
  extraAnswers: z.record(
    z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  ).optional().default({})
});

export const UpdateHackathonSubmissionSchema = CreateHackathonSubmissionSchema.partial();

export const DecideHackathonSubmissionSchema = z.object({
  decision: z.enum(['selected', 'rejected'], {
    errorMap: () => ({ message: "Decision must be either 'selected' or 'rejected'" })
  }),
  decisionComment: z.string().max(1000, 'Decision comment cannot exceed 1000 characters').optional()
});
