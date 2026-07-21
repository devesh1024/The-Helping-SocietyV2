import { google } from 'googleapis';
import { Readable } from 'stream';

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oAuth2Client });

const folderIdCache = new Map<string, string>();

const isConfigured = () =>
  process.env.NODE_ENV !== 'test' &&
  !!process.env.GOOGLE_CLIENT_ID &&
  !!process.env.GOOGLE_CLIENT_SECRET &&
  !!process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

const getOrCreateFolder = async (parentId: string, name: string): Promise<string> => {
  const cacheKey = `${parentId}/${name}`;
  const cached = folderIdCache.get(cacheKey);
  if (cached) return cached;

  const escapedName = name.replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (existing.data.files && existing.data.files.length > 0 && existing.data.files[0].id) {
    folderIdCache.set(cacheKey, existing.data.files[0].id);
    return existing.data.files[0].id;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id'
  });

  const newId = created.data.id as string;
  folderIdCache.set(cacheKey, newId);
  return newId;
};

const resolveFolderPath = async (rootFolderId: string, folderPath: string): Promise<string> => {
  const segments = folderPath.split('/').filter(Boolean);
  let currentParentId = rootFolderId;
  for (const segment of segments) {
    currentParentId = await getOrCreateFolder(currentParentId, segment);
  }
  return currentParentId;
};

const uploadToDrive = async (
  buffer: Buffer,
  rootFolderId: string,
  folderPath: string,
  mimeType: string
): Promise<{ public_id: string; secure_url: string; view_url: string }> => {
  const parentId = await resolveFolderPath(rootFolderId, folderPath);

  const response = await drive.files.create({
    requestBody: {
      name: `${Date.now()}`,
      parents: [parentId]
    },
    media: {
      mimeType,
      body: Readable.from(buffer)
    },
    fields: 'id'
  });

  const fileId = response.data.id as string;

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  return {
    public_id: fileId,
    secure_url: `https://drive.google.com/uc?export=download&id=${fileId}`,
    view_url: `https://drive.google.com/uc?export=view&id=${fileId}`
  };
};

export const streamFile = async (
  fileId: string
): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> => {
  const meta = await drive.files.get({
    fileId,
    fields: 'mimeType'
  });

  const fileRes = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return {
    stream: fileRes.data as unknown as NodeJS.ReadableStream,
    mimeType: (meta.data.mimeType as string) || 'application/octet-stream'
  };
};

export const uploadBuffer = async (
  buffer: Buffer,
  folder = 'academic_resources'
): Promise<{ public_id: string; secure_url: string }> => {
  if (!isConfigured()) {
    return {
      public_id: `mock_public_id_${Date.now()}`,
      secure_url: `https://drive.google.com/mock/file_${Date.now()}.pdf`
    };
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_RESOURCES_FOLDER_ID as string;
  const result = await uploadToDrive(buffer, rootFolderId, folder, 'application/octet-stream');
  return { public_id: result.public_id, secure_url: result.secure_url };
};

export const uploadImageBuffer = async (
  buffer: Buffer,
  folder = 'community_media'
): Promise<{ public_id: string; secure_url: string }> => {
  if (!isConfigured()) {
    return {
      public_id: `mock_public_id_${Date.now()}`,
      secure_url: `https://drive.google.com/mock/file_${Date.now()}.png`
    };
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_COMMUNITY_FOLDER_ID as string;
  const result = await uploadToDrive(buffer, rootFolderId, folder, 'image/jpeg');
  return { public_id: result.public_id, secure_url: result.view_url };
};

// ==================== Hackathon Submissions ====================

export const uploadHackathonSubmissionFile = async (
  buffer: Buffer,
  folder = 'hackathon_submissions'
): Promise<{ public_id: string; secure_url: string }> => {
  if (!isConfigured()) {
    return {
      public_id: `mock_public_id_${Date.now()}`,
      secure_url: `https://drive.google.com/mock/file_${Date.now()}`
    };
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_HACKATHON_FOLDER_ID as string;
  const result = await uploadToDrive(buffer, rootFolderId, folder, 'application/octet-stream');
  return { public_id: result.public_id, secure_url: result.secure_url };
};
