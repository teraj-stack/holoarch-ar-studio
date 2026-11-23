import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  Cloud,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  FileCode2,
  Image as ImageIcon,
  Database,
  ExternalLink,
  AlertTriangle,
  Search,
  Activity,
  LogOut,
  CheckCircle2,
  FileJson,
  Sparkles,
} from 'lucide-react';
import { ARConfigState, CapturedScreenshot } from '../types/arStudio';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  logout,
  listDriveFiles,
  uploadTextFileToDrive,
  uploadDataUrlFileToDrive,
  saveImageToGoogleDrive,
  updateDriveFileContent,
  downloadDriveFileText,
  deleteDriveFile,
  fetchDriveStorageInfo,
  fetchDriveActivities,
  subscribeToUserFirestoreProjects,
  createFirestoreARProject,
  updateFirestoreARProject,
  deleteFirestoreARProject,
  DriveFileItem,
  DriveStorageQuota,
  DriveActivityEntry,
  FirestoreARProjectDoc,
} from '../utils/googleDriveAuth';
import {
  generateOBJContent,
  generateSTLContent,
  generatePLYContent,
} from '../utils/exporters';

interface GoogleDriveWorkspacePanelProps {
  config: ARConfigState;
  onLoadConfig: (loadedConfig: Partial<ARConfigState>, sourceLabel: string) => void;
  latestScreenshot?: CapturedScreenshot;
  systemPromptMarkdown: string;
  onNotify: (msg: string) => void;
}

interface PendingConfirmAction {
  type: 'delete_drive' | 'overwrite_drive' | 'delete_firestore' | 'update_firestore';
  targetId: string;
  targetName: string;
  description: string;
}

export const GoogleDriveWorkspacePanel: React.FC<GoogleDriveWorkspacePanelProps> = ({
  config,
  onLoadConfig,
  latestScreenshot,
  systemPromptMarkdown,
  onNotify,
}) => {
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Google Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveQuota, setDriveQuota] = useState<DriveStorageQuota | null>(null);
  const [driveActivities, setDriveActivities] = useState<DriveActivityEntry[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [onlyHoloArchFilter, setOnlyHoloArchFilter] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [projectTitleInput, setProjectTitleInput] = useState<string>(
    'HoloArch_Makieta_3D_AR'
  );
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Firestore real-time projects state
  const [firestoreProjects, setFirestoreProjects] = useState<FirestoreARProjectDoc[]>([]);

  // Mandatory confirmation modal for destructive/mutating operations
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction | null>(null);
  const [isExecutingConfirm, setIsExecutingConfirm] = useState<boolean>(false);

  const loadDriveWorkspaceData = useCallback(
    async (activeToken?: string | null) => {
      const accessToken = activeToken || (await getAccessToken());
      if (!accessToken) {
        setNeedsAuth(true);
        return;
      }

      setIsLoadingDrive(true);
      setErrorBanner(null);
      try {
        const [files, quota, activities] = await Promise.all([
          listDriveFiles(accessToken, {
            searchQuery,
            onlyHoloArch: onlyHoloArchFilter,
          }),
          fetchDriveStorageInfo(accessToken).catch(() => null),
          fetchDriveActivities(accessToken).catch(() => []),
        ]);
        setDriveFiles(files);
        if (quota) setDriveQuota(quota);
        setDriveActivities(activities);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Błąd komunikacji z Google Drive';
        setErrorBanner(msg);
      } finally {
        setIsLoadingDrive(false);
      }
    },
    [onlyHoloArchFilter, searchQuery]
  );

  // Initialize Firebase Auth & Google OAuth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, accessToken) => {
        setUser(authedUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      (authedUser) => {
        setUser(authedUser || null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore /projects collection when user is authenticated
  useEffect(() => {
    if (!user?.uid) {
      setFirestoreProjects([]);
      return;
    }
    const unsubFirestore = subscribeToUserFirestoreProjects(
      user.uid,
      (projects) => {
        setFirestoreProjects(projects);
      },
      (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Quota exceeded')) {
          setErrorBanner(
            'Przekroczono dzienny limit odczytów Firestore (Spark Free Tier). Limit odnowi się jutro.'
          );
        }
      }
    );
    return () => unsubFirestore();
  }, [user?.uid]);

  // Reload Drive files when token or filter changes
  useEffect(() => {
    if (token && !needsAuth) {
      loadDriveWorkspaceData(token);
    }
  }, [token, needsAuth, onlyHoloArchFilter, loadDriveWorkspaceData]);

  // Listen for images saved to Google Drive from other panels (Nano Banana, 3D Gallery, 52 Reference Assets)
  useEffect(() => {
    const handleExternalDriveUpdate = async () => {
      const latestToken = await getAccessToken();
      if (latestToken) {
        setToken(latestToken);
        setNeedsAuth(false);
        await loadDriveWorkspaceData(latestToken);
      }
    };
    window.addEventListener('holoarch-drive-updated', handleExternalDriveUpdate);
    return () => {
      window.removeEventListener('holoarch-drive-updated', handleExternalDriveUpdate);
    };
  }, [loadDriveWorkspaceData]);

  const handleUploadLocalImageFileToDrive = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setErrorBanner(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Błąd odczytu pliku obrazu z dysku'));
        reader.readAsDataURL(file);
      });
      const safeName = file.name.startsWith('HoloArch')
        ? file.name
        : `HoloArch_Obraz_${file.name}`;
      const uploaded = await saveImageToGoogleDrive({
        dataUrl,
        fileName: safeName,
        mimeType: file.type || 'image/png',
        description: `HoloArch_AR_Studio Uploaded Image (${file.name})`,
      });
      onNotify(`Zapisano obraz z dysku na Google Drive: ${uploaded.name}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Nie udało się przesłać obrazu na Google Drive.';
      setErrorBanner(msg);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleUploadReferenceBoardroomToDrive = async () => {
    setIsUploading(true);
    setErrorBanner(null);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const uploaded = await saveImageToGoogleDrive({
        imageUrl: '/assets/aistudio/Dashboard_dex_eeffcbc7.jpg',
        fileName: `HoloArch_Wzorzec_Stol_AR_${stamp}.jpg`,
        mimeType: 'image/jpeg',
        description: 'HoloArch_AR_Studio Reference Boardroom Hologram Image',
      });
      onNotify(`Zapisano obraz wzorcowy AR na Dysku Google: ${uploaded.name}`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Nie udało się zapisać obrazu wzorcowego na Google Drive.';
      setErrorBanner(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorBanner(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        onNotify(`Połączono z Google Drive i Firebase jako ${result.user.email}`);
        await loadDriveWorkspaceData(result.accessToken);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Logowanie przez Google nie powiodło się.';
      setErrorBanner(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setDriveFiles([]);
    setFirestoreProjects([]);
    onNotify('Wylogowano z konta Google Workspace / Firebase');
  };

  // Upload current AR Project JSON to Google Drive + sync record in Firestore
  const handleSaveProjectToDriveAndFirestore = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setNeedsAuth(true);
      return;
    }

    setIsUploading(true);
    setErrorBanner(null);
    try {
      const cleanTitle =
        projectTitleInput.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'HoloArch_Project';
      const fileName = cleanTitle.startsWith('HoloArch')
        ? `${cleanTitle}.json`
        : `HoloArch_${cleanTitle}.json`;

      const payloadString = JSON.stringify(
        {
          app: 'HoloArch_AR_Studio',
          exportedAt: new Date().toISOString(),
          config,
        },
        null,
        2
      );

      const uploadedDriveFile = await uploadTextFileToDrive(
        accessToken,
        fileName,
        payloadString,
        'application/json',
        'HoloArch_AR_Studio 3D Hologram Configuration JSON'
      );

      if (user) {
        await createFirestoreARProject(
          config,
          projectTitleInput.trim() || fileName,
          uploadedDriveFile.id
        );
      }

      onNotify(
        `Zapisano projekt „${uploadedDriveFile.name}” na Google Drive oraz w bazie Firestore!`
      );
      await loadDriveWorkspaceData(accessToken);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Nie udało się zapisać projektu na Google Drive';
      setErrorBanner(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Export 3D Mesh (.OBJ, .STL or .PLY Point Cloud) directly to Google Drive
  const handleUpload3DMeshToDrive = async (format: 'obj' | 'stl' | 'ply') => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setNeedsAuth(true);
      return;
    }

    setIsUploading(true);
    setErrorBanner(null);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `HoloArch_${config.sceneId}_${timestamp}.${format}`;
      const content =
        format === 'obj'
          ? generateOBJContent(config)
          : format === 'stl'
          ? generateSTLContent(config)
          : generatePLYContent(config).content;
      const mimeType = format === 'stl' ? 'model/stl' : 'text/plain';

      const uploaded = await uploadTextFileToDrive(
        accessToken,
        fileName,
        content,
        mimeType,
        `HoloArch_AR_Studio 3D Architectural Asset (${format.toUpperCase()})`
      );
      onNotify(
        `Wyeksportowano plik inżynierski „${uploaded.name}” bezpośrednio na Google Drive!`
      );
      await loadDriveWorkspaceData(accessToken);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Błąd wysyłania modelu 3D na Google Drive';
      setErrorBanner(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Upload latest AR Screenshot (.png) or System Prompt (.md) to Google Drive
  const handleUploadScreenshotOrPrompt = async (mode: 'screenshot' | 'prompt_md') => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setNeedsAuth(true);
      return;
    }

    setIsUploading(true);
    setErrorBanner(null);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      if (mode === 'screenshot') {
        if (!latestScreenshot) {
          onNotify('Najpierw wykonaj zrzut ekranu 3D przyciskiem „Zrzut do galerii” pod sceną!');
          setIsUploading(false);
          return;
        }
        const fileName = `HoloArch_AR_Viewport_${timestamp}.png`;
        const uploaded = await uploadDataUrlFileToDrive(
          accessToken,
          fileName,
          latestScreenshot.dataUrl,
          'image/png',
          'HoloArch_AR_Studio 3D Viewport Capture'
        );
        onNotify(`Zapisano zrzut ekranu AR „${uploaded.name}” na Google Drive!`);
      } else {
        const fileName = `HoloArch_Prompt_Spec_${config.sceneId}_${timestamp}.md`;
        const uploaded = await uploadTextFileToDrive(
          accessToken,
          fileName,
          systemPromptMarkdown,
          'text/markdown',
          'HoloArch_AR_Studio Architectural Prompt & Unity C# Spec'
        );
        onNotify(`Zapisano dokumentację promptu „${uploaded.name}” na Google Drive!`);
      }
      await loadDriveWorkspaceData(accessToken);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd zapisu na Google Drive';
      setErrorBanner(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // Load a JSON project file from Google Drive into the 3D simulator
  const handleLoadProjectFromDrive = async (file: DriveFileItem) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setNeedsAuth(true);
      return;
    }

    setIsLoadingDrive(true);
    setErrorBanner(null);
    try {
      const rawText = await downloadDriveFileText(accessToken, file.id);
      const parsed = JSON.parse(rawText);
      const targetConfig = parsed.config ? parsed.config : parsed;
      onLoadConfig(targetConfig, `Google Drive: ${file.name}`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Wybrany plik nie jest poprawnym projektem JSON HoloArch.';
      setErrorBanner(msg);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Execute confirmed mutating/destructive action (Overwrite Drive file, Delete Drive file, Update/Delete Firestore doc)
  const handleConfirmExecute = async () => {
    if (!pendingConfirm) return;
    setIsExecutingConfirm(true);
    setErrorBanner(null);

    try {
      if (pendingConfirm.type === 'delete_drive') {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setNeedsAuth(true);
          return;
        }
        await deleteDriveFile(accessToken, pendingConfirm.targetId);
        onNotify(`Usunięto plik „${pendingConfirm.targetName}” z Google Drive.`);
        await loadDriveWorkspaceData(accessToken);
      } else if (pendingConfirm.type === 'overwrite_drive') {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setNeedsAuth(true);
          return;
        }
        const payloadString = JSON.stringify(
          {
            app: 'HoloArch_AR_Studio',
            updatedAt: new Date().toISOString(),
            config,
          },
          null,
          2
        );
        await updateDriveFileContent(
          accessToken,
          pendingConfirm.targetId,
          payloadString,
          'application/json'
        );
        onNotify(
          `Nadpisano plik projektu „${pendingConfirm.targetName}” na Google Drive bieżącą sceną 3D.`
        );
        await loadDriveWorkspaceData(accessToken);
      } else if (pendingConfirm.type === 'delete_firestore') {
        await deleteFirestoreARProject(pendingConfirm.targetId);
        onNotify(`Usunięto projekt „${pendingConfirm.targetName}” z bazy Firestore.`);
      } else if (pendingConfirm.type === 'update_firestore') {
        await updateFirestoreARProject(
          pendingConfirm.targetId,
          config,
          pendingConfirm.targetName
        );
        onNotify(
          `Zaktualizowano projekt „${pendingConfirm.targetName}” w bazie danych Firestore.`
        );
      }
      setPendingConfirm(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operacja nie powiodła się.';
      setErrorBanner(msg);
    } finally {
      setIsExecutingConfirm(false);
    }
  };

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return '—';
    const num = Number(bytesStr);
    if (!Number.isFinite(num) || num <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(num) / Math.log(1024)));
    return `${(num / Math.pow(1024, i)).toFixed(i > 1 ? 2 : 0)} ${units[i]}`;
  };

  return (
    <div
      id="google-drive"
      className="bg-slate-900/75 border border-cyan-500/30 rounded-2xl p-6 space-y-6 shadow-2xl"
    >
      {/* Top Header: Google Drive + Firebase Firestore Integration */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Cloud className="w-3.5 h-3.5" />
            <span>GOOGLE WORKSPACE DRIVE API v3 + FIREBASE FIRESTORE CLOUD</span>
          </div>
          <h3 className="text-xl font-bold text-white font-display flex items-center gap-2.5">
            <span>Chmura Projektów Google Drive i Baza Danych Firebase Firestore</span>
          </h3>
          <p className="text-xs text-slate-300 max-w-3xl">
            Zapisuj i wczytuj pełne konfiguracje scen 3D (`.json`), eksportuj modele
            geometryczne (`.obj`, `.stl`), zrzuty ekranu AR (`.png`) oraz dokumentację
            promptów (`.md`) bezpośrednio na swój dysk Google Drive i synchronizuj kolekcję
            projektów w czasie rzeczywistym przez Firebase Firestore.
          </p>
        </div>

        {/* Auth Status / Official Sign in with Google Button */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {needsAuth ? (
            <button
              className="gsi-material-button"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? 'Łączenie z Google...' : 'Sign in with Google'}
                </span>
                <span style={{ display: 'none' }}>Sign in with Google</span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-800 px-3.5 py-2 rounded-xl">
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{user?.displayName || driveQuota?.userDisplayName || 'Konto Google'}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {user?.email || driveQuota?.userEmail}
                  {driveQuota?.usageInDrive
                    ? ` · Drive: ${formatBytes(driveQuota.usageInDrive)}`
                    : ''}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-800 transition-colors"
                title="Wyloguj z Google Drive i Firebase"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {errorBanner && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-[11px] underline text-rose-300 hover:text-white shrink-0"
          >
            Zamknij
          </button>
        </div>
      )}

      {needsAuth ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center space-y-4">
          <FolderOpen className="w-10 h-10 text-cyan-400 mx-auto opacity-80" />
          <div className="space-y-1 max-w-xl mx-auto">
            <h4 className="text-base font-semibold text-white">
              Zaloguj się kontem Google, aby aktywować Google Drive oraz Firebase Firestore
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Po autoryzacji token OAuth 2.0 (przechowywany wyłącznie w pamięci RAM) umożliwi
              eksportowanie plików `.OBJ`, `.STL`, `.JSON` i zrzutów ekranu AR bezpośrednio na
              Twój Google Drive oraz synchronizację projektów w kolekcji `/projects` w
              Firestore.
            </p>
          </div>
          <div className="flex justify-center pt-1">
            <button
              className="gsi-material-button"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">Sign in with Google</span>
                <span style={{ display: 'none' }}>Sign in with Google</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Cloud Upload Toolbar */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={projectTitleInput}
                  onChange={(e) => setProjectTitleInput(e.target.value.slice(0, 120))}
                  placeholder="Nazwa projektu na Google Drive i w Firestore (max 120 znaków)..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSaveProjectToDriveAndFirestore}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isUploading
                      ? 'Wysyłanie...'
                      : 'Zapisz Projekt (.JSON) na Drive + Firestore'}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleUpload3DMeshToDrive('obj')}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-lg transition-colors"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Wyślij .OBJ na Drive</span>
                </button>
                <button
                  onClick={() => handleUpload3DMeshToDrive('stl')}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-lg transition-colors"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Wyślij .STL na Drive</span>
                </button>
                <button
                  onClick={() => handleUpload3DMeshToDrive('ply')}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 rounded-lg transition-colors"
                  title="Wyślij chmurę punktów 3D (.PLY) na Google Drive"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Wyślij .PLY na Drive</span>
                </button>
                <button
                  onClick={() => handleUploadScreenshotOrPrompt('screenshot')}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-slate-800 rounded-lg transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Wyślij Zrzut 3D (.PNG)</span>
                </button>
                <button
                  onClick={handleUploadReferenceBoardroomToDrive}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-lg transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Zapisz Obraz Wzorcowy AR (.JPG)</span>
                </button>
                <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Wgraj dowolny Obraz z dysku na Drive</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLocalImageFileToDrive}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => handleUploadScreenshotOrPrompt('prompt_md')}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-violet-300 border border-slate-800 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Wyślij Specyfikację Promptu (.MD)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Google Drive Files Browser */}
            <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-semibold text-white">
                    Pliki na Twoim Google Drive ({driveFiles.length})
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Szukaj na Drive..."
                      className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    onClick={() => setOnlyHoloArchFilter((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                      onlyHoloArchFilter
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {onlyHoloArchFilter ? 'Tylko pliki HoloArch' : 'Wszystkie pliki Drive'}
                  </button>

                  <button
                    onClick={() => loadDriveWorkspaceData(token)}
                    disabled={isLoadingDrive}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    title="Odśwież listę plików Google Drive"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin text-cyan-400' : ''}`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {driveFiles.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
                    {isLoadingDrive
                      ? 'Pobieranie listy plików z Google Drive...'
                      : 'Brak plików spełniających kryteria. Kliknij „Zapisz Projekt (.JSON) na Drive”, aby utworzyć pierwszy plik.'}
                  </div>
                ) : (
                  driveFiles.map((file) => {
                    const isJson =
                      file.mimeType.includes('json') || file.name.endsWith('.json');
                    const isImage =
                      file.mimeType.startsWith('image/') ||
                      /\.(png|jpg|jpeg|webp|gif)$/i.test(file.name);
                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90 text-xs hover:border-slate-700 transition-colors"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          {isImage ? (
                            <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <FileJson className="w-4 h-4 text-cyan-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-slate-100 truncate">{file.name}</p>
                              {isImage && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 shrink-0">
                                  OBRAZ
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono tabular-nums truncate">
                              {file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleString('pl-PL')
                                : 'Drive'}{' '}
                              · {formatBytes(file.size)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isJson && (
                            <>
                              <button
                                onClick={() => handleLoadProjectFromDrive(file)}
                                className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-medium transition-colors flex items-center gap-1"
                                title="Wczytaj ten projekt z Google Drive do symulatora 3D"
                              >
                                <Download className="w-3 h-3" />
                                <span>Wczytaj 3D</span>
                              </button>
                              <button
                                onClick={() =>
                                  setPendingConfirm({
                                    type: 'overwrite_drive',
                                    targetId: file.id,
                                    targetName: file.name,
                                    description: `Czy na pewno chcesz nadpisać zawartość pliku „${file.name}” na Google Drive bieżącymi ustawieniami sceny 3D?`,
                                  })
                                }
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-colors text-[11px]"
                                title="Nadpisz plik na Google Drive bieżącą konfiguracją"
                              >
                                Nadpisz
                              </button>
                            </>
                          )}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Otwórz w Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() =>
                              setPendingConfirm({
                                type: 'delete_drive',
                                targetId: file.id,
                                targetName: file.name,
                                description: `Czy na pewno chcesz trwale usunąć plik „${file.name}” ze swojego dysku Google Drive? Tej operacji nie można cofnąć.`,
                              })
                            }
                            className="p-1.5 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Usuń plik z Google Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right 5 Cols: Real-Time Firebase Firestore Projects & Drive Activity */}
            <div className="lg:col-span-5 space-y-4">
              {/* Firestore Collection /projects */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-white">
                      Kolekcja Firestore `/projects` ({firestoreProjects.length})
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Real-time onSnapshot
                  </span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {firestoreProjects.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-800 rounded-lg">
                      Brak dokumentów w kolekcji `/projects` dla Twojego konta.
                    </p>
                  ) : (
                    firestoreProjects.map((docItem) => (
                      <div
                        key={docItem.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-100 truncate">{docItem.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono truncate">
                            {docItem.sceneId} · skala {docItem.modelScale}x ·{' '}
                            {docItem.lightTemperatureK}K
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              onLoadConfig(
                                {
                                  sceneId: docItem.sceneId,
                                  framework: docItem.framework,
                                  modelScale: docItem.modelScale,
                                  lightTemperatureK: docItem.lightTemperatureK,
                                  uiSettings: {
                                    ...config.uiSettings,
                                    palette: docItem.palette,
                                  },
                                },
                                `Firestore: ${docItem.name}`
                              )
                            }
                            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium text-[11px]"
                          >
                            Zastosuj
                          </button>
                          <button
                            onClick={() =>
                              setPendingConfirm({
                                type: 'update_firestore',
                                targetId: docItem.id,
                                targetName: docItem.name,
                                description: `Czy chcesz zaktualizować dokument „${docItem.name}” w bazie Firebase Firestore bieżącymi parametrami hologramu 3D?`,
                              })
                            }
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                          >
                            Aktualizuj
                          </button>
                          <button
                            onClick={() =>
                              setPendingConfirm({
                                type: 'delete_firestore',
                                targetId: docItem.id,
                                targetName: docItem.name,
                                description: `Czy na pewno chcesz usunąć dokument projektu „${docItem.name}” z bazy Firebase Firestore?`,
                              })
                            }
                            className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Google Drive Activity API v2 Log */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                      Ostatnia Aktywność Google Drive (Drive Activity API)
                    </h4>
                  </div>
                </div>
                {driveActivities.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Brak zarejestrowanych zdarzeń lub trwa synchronizacja dziennika aktywności.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {driveActivities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between gap-2 text-[11px] text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded border border-slate-800/70"
                      >
                        <span className="truncate">
                          <strong className="text-cyan-300">{act.actionName}:</strong>{' '}
                          {act.targetTitle}
                        </span>
                        <span className="text-slate-500 font-mono tabular-nums shrink-0">
                          {new Date(act.timestamp).toLocaleTimeString('pl-PL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for Destructive / Mutating Operations */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">
                  Potwierdzenie modyfikacji danych w chmurze
                </h4>
                <p className="text-xs text-slate-400 font-mono">{pendingConfirm.targetName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              {pendingConfirm.description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setPendingConfirm(null)}
                disabled={isExecutingConfirm}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirmExecute}
                disabled={isExecutingConfirm}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  pendingConfirm.type.startsWith('delete')
                    ? 'bg-rose-500 hover:bg-rose-400 text-white'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                }`}
              >
                {isExecutingConfirm
                  ? 'Wykonywanie...'
                  : pendingConfirm.type.startsWith('delete')
                  ? 'Potwierdź usunięcie'
                  : 'Potwierdź zapis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
