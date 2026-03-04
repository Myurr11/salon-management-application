import * as FileSystem from 'expo-file-system/legacy';

export type AttendancePhotoType = 'checkIn' | 'checkOut';

export interface AttendancePhotoMeta {
  id: string;
  staffId: string;
  staffName?: string;
  attendanceDate: string; // YYYY-MM-DD
  type: AttendancePhotoType;
  createdAt: string; // ISO string
  fileUri: string;
}

const PHOTOS_DIR = `${FileSystem.documentDirectory}attendance_photos`;
const METADATA_FILE = `${PHOTOS_DIR}/metadata.json`;
const MAX_AGE_DAYS = 2;

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const ensureDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
};

const loadMetadata = async (): Promise<AttendancePhotoMeta[]> => {
  try {
    const info = await FileSystem.getInfoAsync(METADATA_FILE);
    if (!info.exists) {
      return [];
    }
    const content = await FileSystem.readAsStringAsync(METADATA_FILE);
    if (!content) return [];
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const saveMetadata = async (items: AttendancePhotoMeta[]): Promise<void> => {
  await ensureDirExists();
  await FileSystem.writeAsStringAsync(METADATA_FILE, JSON.stringify(items));
};

export const cleanupOldPhotos = async (): Promise<void> => {
  const now = Date.now();
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const items = await loadMetadata();
  const fresh: AttendancePhotoMeta[] = [];

  for (const item of items) {
    const created = new Date(item.createdAt).getTime();
    if (!Number.isFinite(created) || now - created > maxAgeMs) {
      // Delete file if it still exists
      try {
        const info = await FileSystem.getInfoAsync(item.fileUri);
        if (info.exists) {
          await FileSystem.deleteAsync(item.fileUri, { idempotent: true });
        }
      } catch {
        // Ignore file deletion errors
      }
    } else {
      fresh.push(item);
    }
  }

  await saveMetadata(fresh);
};

interface SavePhotoOptions {
  staffId: string;
  staffName?: string;
  attendanceDate: string;
  type: AttendancePhotoType;
}

export const savePhotoFromTempUri = async (
  tempUri: string,
  options: SavePhotoOptions,
): Promise<AttendancePhotoMeta> => {
  await ensureDirExists();
  const id = generateId();
  const extension = tempUri.split('.').pop() || 'jpg';
  const fileName = `${options.attendanceDate}_${options.staffId}_${options.type}_${id}.${extension}`;
  const destUri = `${PHOTOS_DIR}/${fileName}`;

  // Move or copy the file into our managed directory
  try {
    await FileSystem.moveAsync({ from: tempUri, to: destUri });
  } catch {
    // If move fails (e.g. across volumes), try copy instead
    await FileSystem.copyAsync({ from: tempUri, to: destUri });
  }

  const meta: AttendancePhotoMeta = {
    id,
    staffId: options.staffId,
    staffName: options.staffName,
    attendanceDate: options.attendanceDate,
    type: options.type,
    createdAt: new Date().toISOString(),
    fileUri: destUri,
  };

  const items = await loadMetadata();
  items.push(meta);
  await saveMetadata(items);

  return meta;
};

export const getPhotosForAttendance = async (
  staffId: string,
  attendanceDate: string,
): Promise<AttendancePhotoMeta[]> => {
  const items = await loadMetadata();
  return items.filter(
    item =>
      item.staffId === staffId &&
      item.attendanceDate === attendanceDate,
  );
};

