import mongoose, { Schema, Document } from 'mongoose';

export interface IHackathonTeam extends Document {
  hackathonId: mongoose.Types.ObjectId;
  name: string;
  leaderId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  joinCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const HackathonTeamSchema = new Schema<IHackathonTeam>({
  hackathonId: { type: Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  name: { type: String, required: true, trim: true },
  leaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    default: []
  },
  joinCode: { type: String, required: true, trim: true, uppercase: true }
}, { timestamps: true });

// A team name must be unique within a given hackathon (not globally).
HackathonTeamSchema.index({ hackathonId: 1, name: 1 }, { unique: true });
// A join code must be unique within a given hackathon so it can be resolved unambiguously.
HackathonTeamSchema.index({ hackathonId: 1, joinCode: 1 }, { unique: true });
HackathonTeamSchema.index({ leaderId: 1 });
HackathonTeamSchema.index({ members: 1 });

export const HackathonTeam = mongoose.model<IHackathonTeam>('HackathonTeam', HackathonTeamSchema);
