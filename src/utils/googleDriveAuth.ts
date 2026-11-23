import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocFromServer,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ARConfigState } from '../types/arStudio';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface FirestoreARProjectDoc {
  id: string;
  ownerId: string;
  name: string;
  sceneId: ARConfigState['sceneId'];
  framework: ARConfigState['framework'];
  modelScale: number;
  lightTemperatureK: number;
  palette: ARConfigState['uiSettings']['palette'];
  driveFileId?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_NAME_LEN = 120;

export function subscribeToUserFirestoreProjects(
  userId: string,
  onData: (projects: FirestoreARProjectDoc[]) => void,
  onError?: (err: unknown) => void
) {
  const path = 'projects';
  const q = query(collection(db, path), where('ownerId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: FirestoreARProjectDoc[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ownerId: String(data.ownerId || userId),
          name: String(data.name || 'Projekt AR'),
          sceneId: (data.sceneId as ARConfigState['sceneId']) || 'skyline_financial',
          framework: (data.framework as ARConfigState['framework']) || 'unity_arfoundation',
          modelScale: Number(data.modelScale ?? 1.0),
          lightTemperatureK: Number(data.lightTemperatureK ?? 4200),
          palette:
            (data.palette as ARConfigState['uiSettings']['palette']) || 'cyan_blueprint',
          driveFileId: data.driveFileId ? String(data.driveFileId) : undefined,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
      });
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Logged structured FirestoreErrorInfo
      }
    }
  );
}

export async function createFirestoreARProject(
  config: ARConfigState,
  rawName: string,
  driveFileId?: string
): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Musisz być zalogowany przez Google, aby zapisać projekt w Firestore.');
  }

  const sanitizedName = rawName.trim().slice(0, MAX_NAME_LEN) || 'Projekt HoloArch AR';
  const docId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (!VALID_ID_REGEX.test(docId)) {
    throw new Error('Nieprawidłowy identyfikator dokumentu.');
  }

  const path = `projects/${docId}`;
  const payload: Record<string, unknown> = {
    ownerId: currentUser.uid,
    name: sanitizedName,
    sceneId: config.sceneId,
    framework: config.framework,
    modelScale: Math.max(0.1, Math.min(10.0, Number(config.modelScale) || 1.0)),
    lightTemperatureK: Math.max(
      1000,
      Math.min(12000, Number(config.lightTemperatureK) || 4200)
    ),
    palette: config.uiSettings.palette,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (driveFileId && driveFileId.length <= 128) {
    payload.driveFileId = driveFileId;
  }

  try {
    await setDoc(doc(db, 'projects', docId), payload);
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFirestoreARProject(
  projectId: string,
  config: ARConfigState,
  rawName: string,
  driveFileId?: string
): Promise<void> {
  const path = `projects/${projectId}`;
  const sanitizedName = rawName.trim().slice(0, MAX_NAME_LEN) || 'Projekt HoloArch AR';

  const updates: Record<string, unknown> = {
    name: sanitizedName,
    sceneId: config.sceneId,
    framework: config.framework,
    modelScale: Math.max(0.1, Math.min(10.0, Number(config.modelScale) || 1.0)),
    lightTemperatureK: Math.max(
      1000,
      Math.min(12000, Number(config.lightTemperatureK) || 4200)
    ),
    palette: config.uiSettings.palette,
    updatedAt: serverTimestamp(),
  };

  if (driveFileId !== undefined && driveFileId.length <= 128) {
    updates.driveFileId = driveFileId;
  }

  try {
    await updateDoc(doc(db, 'projects', projectId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFirestoreARProject(projectId: string): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token strictly in memory (never in localStorage/sessionStorage).
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure(user);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure(null);
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  description?: string;
}

export interface DriveStorageQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  userEmail?: string;
  userDisplayName?: string;
}

export interface DriveActivityEntry {
  id: string;
  timestamp: string;
  actionName: string;
  targetTitle: string;
}

export async function fetchDriveStorageInfo(accessToken: string): Promise<DriveStorageQuota> {
  const res = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress),storageQuota(limit,usage,usageInDrive)',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    throw new Error(`Drive About API error (${res.status})`);
  }
  const data = await res.json();
  return {
    limit: data.storageQuota?.limit,
    usage: data.storageQuota?.usage,
    usageInDrive: data.storageQuota?.usageInDrive,
    userEmail: data.user?.emailAddress,
    userDisplayName: data.user?.displayName,
  };
}

export async function listDriveFiles(
  accessToken: string,
  options: { searchQuery?: string; onlyHoloArch?: boolean } = {}
): Promise<DriveFileItem[]> {
  const clauses: string[] = ['trashed = false'];
  if (options.onlyHoloArch) {
    clauses.push("(name contains 'HoloArch' or description contains 'HoloArch_AR_Studio')");
  }
  if (options.searchQuery && options.searchQuery.trim()) {
    const escaped = options.searchQuery.trim().replace(/'/g, "\\'");
    clauses.push(`name contains '${escaped}'`);
  }

  const params = new URLSearchParams({
    pageSize: '25',
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink,description)',
    q: clauses.join(' and '),
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive list error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}

export async function uploadTextFileToDrive(
  accessToken: string,
  fileName: string,
  content: string,
  mimeType: string,
  description = 'HoloArch_AR_Studio Project Asset'
): Promise<DriveFileItem> {
  const metadata = {
    name: fileName,
    mimeType,
    description,
  };

  const boundary = '-------HoloArchDriveBoundary7MA4YWxkTrZu0gW';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink,description',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed (${res.status}): ${errText}`);
  }
  return await res.json();
}

export async function uploadDataUrlFileToDrive(
  accessToken: string,
  fileName: string,
  dataUrl: string,
  mimeType = 'image/png',
  description = 'HoloArch_AR_Studio Screenshot'
): Promise<DriveFileItem> {
  const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const metadata = {
    name: fileName,
    mimeType,
    description,
  };

  const boundary = '-------HoloArchDriveBinaryBoundary7MA4YWxk';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink,description',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Image upload failed (${res.status}): ${errText}`);
  }
  return await res.json();
}

export interface SaveImageToDriveOptions {
  dataUrl?: string;
  imageUrl?: string;
  proceduralCard?: {
    title: string;
    fileName: string;
    specs: string;
    accentColor: string;
    secondaryColor: string;
  };
  fileName: string;
  mimeType?: string;
  description?: string;
}

async function fetchUrlAsDataUrl(url: string): Promise<{ dataUrl: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Nie udało się pobrać obrazu źródłowego (${res.status})`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        dataUrl: String(reader.result || ''),
        mimeType: blob.type || 'image/jpeg',
      });
    };
    reader.onerror = () => reject(new Error('Błąd odczytu pliku obrazu'));
    reader.readAsDataURL(blob);
  });
}

function renderProceduralBlueprintDataUrl(card: {
  title: string;
  fileName: string;
  specs: string;
  accentColor: string;
  secondaryColor: string;
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Brak kontekstu Canvas 2D do wygenerowania obrazu.');
  }

  // Deep architectural background
  const grad = ctx.createLinearGradient(0, 0, 1200, 800);
  grad.addColorStop(0, '#040814');
  grad.addColorStop(1, '#0b1528');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 800);

  // Blueprint grid
  ctx.strokeStyle = `${card.accentColor}22`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1200; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 800);
    ctx.stroke();
  }
  for (let y = 0; y <= 800; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // Central isometric tower / maquette wireframe
  ctx.strokeStyle = card.accentColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(420, 140, 360, 440);

  ctx.strokeStyle = card.secondaryColor;
  ctx.lineWidth = 2;
  for (let floorY = 180; floorY < 560; floorY += 38) {
    ctx.beginPath();
    ctx.moveTo(435, floorY);
    ctx.lineTo(765, floorY);
    ctx.stroke();
  }

  // Glowing holographic rings
  ctx.beginPath();
  ctx.ellipse(600, 580, 260, 55, 0, 0, Math.PI * 2);
  ctx.strokeStyle = card.accentColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Title & Metadata Footer
  ctx.fillStyle = '#070d19e6';
  ctx.fillRect(60, 630, 1080, 125);
  ctx.strokeStyle = card.accentColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 630, 1080, 125);

  ctx.fillStyle = card.accentColor;
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`HOLOARCH AR STUDIO // WZORZEC: ${card.fileName}`, 90, 670);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(card.title, 90, 708);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px monospace';
  ctx.fillText(card.specs, 90, 738);

  return canvas.toDataURL('image/png');
}

export async function saveImageToGoogleDrive(
  options: SaveImageToDriveOptions
): Promise<DriveFileItem> {
  let token = await getAccessToken();
  if (!token) {
    const signInResult = await googleSignIn();
    if (!signInResult?.accessToken) {
      throw new Error('Logowanie Google zostało anulowane lub nie zwróciło tokenu dostępu.');
    }
    token = signInResult.accessToken;
  }

  let finalDataUrl = options.dataUrl || '';
  let finalMimeType = options.mimeType || 'image/png';

  if (!finalDataUrl && options.imageUrl) {
    const fetched = await fetchUrlAsDataUrl(options.imageUrl);
    finalDataUrl = fetched.dataUrl;
    finalMimeType = options.mimeType || fetched.mimeType;
  } else if (!finalDataUrl && options.proceduralCard) {
    finalDataUrl = renderProceduralBlueprintDataUrl(options.proceduralCard);
    finalMimeType = 'image/png';
  }

  if (!finalDataUrl) {
    throw new Error('Brak danych obrazu do zapisania na Dysku Google.');
  }

  if (finalDataUrl.startsWith('data:')) {
    const mimeMatch = finalDataUrl.match(/^data:([^;]+);base64,/);
    if (mimeMatch?.[1]) {
      finalMimeType = mimeMatch[1];
    }
  }

  const uploaded = await uploadDataUrlFileToDrive(
    token,
    options.fileName,
    finalDataUrl,
    finalMimeType,
    options.description || 'HoloArch_AR_Studio Image Asset'
  );

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('holoarch-drive-updated', { detail: uploaded }));
  }

  return uploaded;
}

export async function updateDriveFileContent(
  accessToken: string,
  fileId: string,
  content: string,
  mimeType = 'application/json'
): Promise<DriveFileItem> {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
      fileId
    )}?uploadType=media&fields=id,name,mimeType,modifiedTime,size,webViewLink`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `${mimeType}; charset=UTF-8`,
      },
      body: content,
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Update failed (${res.status}): ${errText}`);
  }
  return await res.json();
}

export async function downloadDriveFileText(
  accessToken: string,
  fileId: string
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Download failed (${res.status}): ${errText}`);
  }
  return await res.text();
}

export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Delete failed (${res.status}): ${errText}`);
  }
}

export async function fetchDriveActivities(
  accessToken: string
): Promise<DriveActivityEntry[]> {
  try {
    const res = await fetch('https://driveactivity.googleapis.com/v2/activity:query', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pageSize: 6 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const activities = Array.isArray(data.activities) ? data.activities : [];
    return activities.map((act: Record<string, any>, idx: number) => {
      const primary = act.primaryActionDetail || {};
      const actionKey = Object.keys(primary)[0] || 'edit';
      const actionMap: Record<string, string> = {
        create: 'Utworzono plik',
        edit: 'Zaktualizowano plik',
        move: 'Przeniesiono plik',
        rename: 'Zmieniono nazwę',
        delete: 'Usunięto plik',
        restore: 'Przywrócono plik',
        permissionChange: 'Zmieniono uprawnienia',
      };
      const targetTitle =
        act.targets?.[0]?.driveItem?.title || 'Plik projektu Google Drive';
      const ts = act.timestamp || act.timeRange?.endTime || new Date().toISOString();
      return {
        id: `${ts}-${idx}`,
        timestamp: ts,
        actionName: actionMap[actionKey] || actionKey,
        targetTitle,
      };
    });
  } catch {
    return [];
  }
}
