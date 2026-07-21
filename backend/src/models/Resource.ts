import mongoose, { Schema, Document } from 'mongoose';

export interface IResource extends Document {
  title: string;
  description: string;
  category: 'notes' | 'pyqs' | 'books' | 'syllabus' | 'study_material';
  year: '1st year' | '2nd year' | '3rd year' | '4th year';
  branch: 'Computer Science and Engineering' | 'Electronic and Communication Engineering' | 'Electrical Engineering' | 'Mechanical Engineering' | 'Civil Engineering' | 'Chemical Engineering';
  file: {
    publicId: string;
    secureUrl: string;
    fileType: string;
    fileSize: number; // in bytes
    storageProvider?: 'cloudinary' | 'googleDrive';
  };
  uploadedBy: mongoose.Types.ObjectId;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema = new Schema<IResource>({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['notes', 'pyqs', 'books', 'syllabus', 'study_material'],
    required: true
  },
  year: {
    type: String,
    enum: ['1st year', '2nd year', '3rd year', '4th year'],
    required: true
  },
  branch: {
    type: String,
    enum: [
      'Computer Science and Engineering',
      'Electronic and Communication Engineering',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Chemical Engineering'
    ],
    required: true
  },
  file: {
    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: {
      type: Number,
      required: true,
      max: [50 * 1024 * 1024, 'File size cannot exceed 50MB']
    },
    storageProvider: { type: String, enum: ['cloudinary', 'googleDrive'], default: 'cloudinary' }
  },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  likesCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

ResourceSchema.index({ category: 1 });
ResourceSchema.index({ year: 1 });
ResourceSchema.index({ branch: 1 });
ResourceSchema.index({ uploadedBy: 1 });
ResourceSchema.index({ createdAt: -1 });

export const Resource = mongoose.model<IResource>('Resource', ResourceSchema);
