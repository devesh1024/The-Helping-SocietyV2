import mongoose, { Schema, Document } from 'mongoose';

export interface IOpportunityLike extends Document {
  userId: mongoose.Types.ObjectId;
  opportunityId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunityLikeSchema = new Schema<IOpportunityLike>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true }
}, { timestamps: true });

OpportunityLikeSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
OpportunityLikeSchema.index({ opportunityId: 1 });

export const OpportunityLike = mongoose.model<IOpportunityLike>('OpportunityLike', OpportunityLikeSchema);
