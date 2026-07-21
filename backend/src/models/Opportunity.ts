import mongoose, { Schema, Document } from 'mongoose';

export interface IOpportunity extends Document {
  title: string;
  description: string;
  type: 'internship' | 'job' | 'workshop' | 'mentorship' | 'hackathon';
  link: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  company?: string;
  location?: string;
  deadline?: Date;
  status?: 'open' | 'closed';
  eventAt?: Date;
  conductedBy?: string;
  mode?: string;
  workType?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  likesCount: number;
}

const OpportunitySchema = new Schema<IOpportunity>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['internship', 'job', 'workshop', 'mentorship', 'hackathon'], 
    required: true 
  },
  link: { 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(val: string) {
        // Enforce http/https protocols and block javascript/data/file URI schemas
        return /^(https?:\/\/)[^\s$.?#].[^\s]*$/i.test(val);
      },
      message: 'Opportunity link must be a valid absolute HTTP or HTTPS URL.'
    }
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, trim: true },
  location: { type: String, trim: true },
  deadline: { type: Date },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  eventAt: { type: Date },
  conductedBy: { type: String, trim: true },
  mode: { type: String, trim: true },
  workType: { type: String, trim: true },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  likesCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

OpportunitySchema.index({ type: 1 });
OpportunitySchema.index({ approvalStatus: 1 });
OpportunitySchema.index({ createdBy: 1 });
OpportunitySchema.index({ createdAt: -1 });

export const Opportunity = mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
