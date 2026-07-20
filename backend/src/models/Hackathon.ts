import mongoose, { Schema, Document } from 'mongoose';

export interface IHackathonQuestion {
  key: string;
  label: string;
  type: 'text' | 'number' | 'radio' | 'checkbox' | 'file';
  required: boolean;
  options?: string[]; // used when type === 'radio' or 'checkbox'
  accept?: string[]; // used when type === 'file', e.g. ['pdf', 'docx'] or ['image/*']
}

export interface IHackathon extends Document {
  title: string;
  description: string;
  category: 'technical' | 'poster' | 'video' | 'social_media';
  status: 'draft' | 'live' | 'closed';
  participationMode: 'individual' | 'team' | 'both';
  teamSize?: {
    min: number;
    max: number;
  };
  launchDate?: Date;
  registrationDeadline?: Date;
  extraQuestions: IHackathonQuestion[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HackathonQuestionSchema = new Schema<IHackathonQuestion>({
  key: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['text', 'number', 'radio', 'checkbox', 'file'],
    required: true
  },
  required: { type: Boolean, default: false },
  options: {
    type: [String],
    default: undefined
  },
  accept: {
    type: [String],
    default: undefined
  }
}, { _id: false });

const HackathonSchema = new Schema<IHackathon>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['technical', 'poster', 'video', 'social_media'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'live', 'closed'],
    default: 'draft'
  },
  participationMode: {
    type: String,
    enum: ['individual', 'team', 'both'],
    required: true
  },
  teamSize: {
    min: { type: Number, min: 1 },
    max: { type: Number, min: 1 }
  },
  launchDate: { type: Date },
  registrationDeadline: { type: Date },
  extraQuestions: {
    type: [HackathonQuestionSchema],
    default: []
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

HackathonSchema.index({ status: 1 });
HackathonSchema.index({ category: 1 });
HackathonSchema.index({ createdBy: 1 });
HackathonSchema.index({ createdAt: -1 });

export const Hackathon = mongoose.model<IHackathon>('Hackathon', HackathonSchema);
