import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, Save } from 'lucide-react';
import {
  useLogout,
  useUpdateAvatar,
  useUpdateProfile,
} from '../hooks/useQueryHooks';
import { useAuthStore } from '../store/useAuthStore';
import {
  type ThemeMode,
  type ThemePalette,
  useThemeStore,
} from '../store/useThemeStore';
import styles from './SettingsPage.module.css';

const palettes: Array<{ id: ThemePalette; label: string }> = [
  { id: 'indigo', label: 'Indigo' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'forest', label: 'Forest' },
];

const modes: Array<{ id: ThemeMode; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

// Same fallback as ChatPage.tsx's getAvatarSrc — backend's formatUser can
// send avatarUrl: "" when a user never set one; an empty <img src> makes
// the browser re-request the current page, which React warns about.
function getAvatarSrc(user: { id: string; avatarUrl: string }) {
  return (
    user.avatarUrl ||
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(user.id)}`
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const palette = useThemeStore((s) => s.palette);
  const mode = useThemeStore((s) => s.mode);
  const setPalette = useThemeStore((s) => s.setPalette);
  const setMode = useThemeStore((s) => s.setMode);
  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateAvatar();
  const logout = useLogout();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(
    user ? getAvatarSrc(user) : ''
  );
  const [message, setMessage] = useState('');

  if (!user) return null;
  const currentUser = user;

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    updateAvatar.mutate(
      { userId: currentUser.id, file },
      {
        onSuccess: () => setMessage('Avatar updated.'),
      }
    );
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    updateProfile.mutate(
      { id: currentUser.id, updates: { name: name.trim(), bio: bio.trim() } },
      {
        onSuccess: () => setMessage('Profile saved.'),
      }
    );
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login'),
    });
  }

  return (
    <main className={styles.page}>
      <motion.div
        className={styles.shell}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className={styles.topBar}>
          <div>
            <Link className={styles.backLink} to="/chat">
              <ArrowLeft size={16} />
              Back to chat
            </Link>
            <h1 className={styles.title}>Settings</h1>
          </div>
          <button className={styles.dangerButton} type="button" onClick={handleLogout}>
            <LogOut size={16} />
            {logout.isPending ? 'Signing out...' : 'Logout'}
          </button>
        </div>

        <div className={styles.grid}>
          <section className={`${styles.panel} ${styles.avatarPanel}`}>
            <img
              className={styles.avatar}
              src={avatarPreview || getAvatarSrc(currentUser)}
              alt=""
            />
            <div className={styles.avatarName}>{currentUser.name}</div>
            <div className={styles.avatarEmail}>{currentUser.email}</div>
            <label className={styles.fileButton} htmlFor="avatar-upload">
              {updateAvatar.isPending ? 'Uploading...' : 'Update avatar'}
            </label>
            <input
              id="avatar-upload"
              className={styles.fileInput}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
            />
          </section>

          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Profile</h2>
            <form className={styles.form} onSubmit={handleSave}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="settings-name">
                  Name
                </label>
                <input
                  id="settings-name"
                  className={styles.input}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="settings-bio">
                  Status message
                </label>
                <textarea
                  id="settings-bio"
                  className={styles.textarea}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                />
              </div>

              <h2 className={styles.sectionTitle}>Theme</h2>
              <div className={styles.themeGrid}>
                {palettes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.themeButton} ${
                      palette === item.id ? styles.themeButtonActive : ''
                    }`}
                    onClick={() => setPalette(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className={styles.modeRow}>
                {modes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.modeButton} ${
                      mode === item.id ? styles.modeButtonActive : ''
                    }`}
                    onClick={() => setMode(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {message && <div className={styles.message}>{message}</div>}
              <div className={styles.actions}>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={updateProfile.isPending}
                >
                  <Save size={16} />
                  {updateProfile.isPending ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </motion.div>
    </main>
  );
}
