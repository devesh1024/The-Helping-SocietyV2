import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedOpportunity extends Document {
  userId: mongoose.Types.ObjectId;
  opportunityId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SavedOpportunitySchema = new Schema<ISavedOpportunity>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true }
}, { timestamps: true });

SavedOpportunitySchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
SavedOpportunitySchema.index({ opportunityId: 1 });

export const SavedOpportunity = mongoose.model<ISavedOpportunity>('SavedOpportunity', SavedOpportunitySchema);
