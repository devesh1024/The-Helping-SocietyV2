import mongoose, { Schema, Document } from 'mongoose';

export interface IHackathonSubmissionFile {
  key: string; // matches the corresponding extraQuestions[].key on the Hackathon
  publicId: string;
  secureUrl: string;
  fileType: string;
  fileSize: number; // in bytes
}

export interface IHackathonSubmission extends Document {
  hackathonId: mongoose.Types.ObjectId;
  participantType: 'individual' | 'team';
  userId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  extraAnswers: Map<string, string | number | boolean | string[]>;
  files: IHackathonSubmissionFile[];
  decision: 'pending' | 'selected' | 'rejected';
  decisionComment?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const urlValidator = {
  validator: function (val: string) {
    if (!val) return true;
    return /^(https?:\/\/)[^\s$.?#].[^\s]*$/i.test(val);
  },
  message: 'Link must be a valid absolute HTTP or HTTPS URL.'
};

const HackathonSubmissionFileSchema = new Schema<IHackathonSubmissionFile>({
  key: { type: String, required: true, trim: true },
  publicId: { type: String, required: true },
  secureUrl: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: {
    type: Number,
    required: true,
    max: [50 * 1024 * 1024, 'File size cannot exceed 50MB']
  }
}, { _id: false });

const HackathonSubmissionSchema = new Schema<IHackathonSubmission>({
  hackathonId: { type: Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  participantType: {
    type: String,
    enum: ['individual', 'team'],
    required: true
  },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  teamId: { type: Schema.Types.ObjectId, ref: 'HackathonTeam' },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  repoUrl: { type: String, trim: true, validate: urlValidator },
  demoUrl: { type: String, trim: true, validate: urlValidator },
  videoUrl: { type: String, trim: true, validate: urlValidator },
  extraAnswers: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  files: {
    type: [HackathonSubmissionFileSchema],
    default: []
  },
  decision: {
    type: String,
    enum: ['pending', 'selected', 'rejected'],
    default: 'pending'
  },
  decisionComment: { type: String, trim: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Exactly one submission per user per hackathon (only enforced when userId is set).
HackathonSubmissionSchema.index(
  { hackathonId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);
// Exactly one submission per team per hackathon (only enforced when teamId is set).
HackathonSubmissionSchema.index(
  { hackathonId: 1, teamId: 1 },
  { unique: true, partialFilterExpression: { teamId: { $exists: true } } }
);
HackathonSubmissionSchema.index({ hackathonId: 1, decision: 1 });

export const HackathonSubmission = mongoose.model<IHackathonSubmission>(
  'HackathonSubmission',
  HackathonSubmissionSchema
);
