import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { PublicUser } from '../types/user';
import toast from 'react-hot-toast';

const LoginScreen: React.FC = () => {
  const { login, setUser } = useUser();

  // Mode: 'login' | 'register' | 'admin-setup'
  const [mode, setMode] = useState<'login' | 'register' | 'admin-setup'>('login');
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [reportLanguage, setReportLanguage] = useState<'pl' | 'en'>('pl');

  // Forced password change state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [userPendingPasswordChange, setUserPendingPasswordChange] = useState<PublicUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Check if this is first launch (no users exist)
  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-users');

      if (result.success && result.data.length === 0) {
        // No users exist - first launch
        setIsFirstLaunch(true);
        setMode('admin-setup');
      }
    } catch (error) {
      console.error('Error checking first launch:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userLogin || !password) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    setLoading(true);
    const result = await login(userLogin, password);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error || 'Błąd logowania');
      return;
    }

    // Check if user needs to change password
    if (result.forcePasswordChange && result.userData) {
      setUserPendingPasswordChange(result.userData);
      setShowPasswordChangeModal(true);
      setPassword(''); // Clear login password
      return;
    }

    // Success - user is logged in via UserContext
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name || !surname || !userLogin || !password || !confirmPassword) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Hasła nie są identyczne');
      return;
    }

    if (password.length < 4) {
      toast.error('Hasło musi mieć minimum 4 znaki');
      return;
    }

    if (userLogin.length < 3) {
      toast.error('Login musi mieć minimum 3 znaki');
      return;
    }

    setLoading(true);

    try {
      const { ipcRenderer } = window.require('electron');

      // Create user
      const createResult = await ipcRenderer.invoke('db:create-user', {
        name,
        surname,
        login: userLogin,
        password,
        report_language: reportLanguage,
        role: 'user',
      });

      if (!createResult.success) {
        toast.error(createResult.error || 'Błąd tworzenia konta');
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const loginResult = await login(userLogin, password);

      if (!loginResult.success) {
        toast.error('Konto utworzone, ale błąd logowania. Spróbuj zalogować się ręcznie.');
        setMode('login');
      } else {
        toast.success('Konto utworzone pomyślnie!');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error('Wystąpił błąd podczas rejestracji');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !surname || !userLogin || !password || !confirmPassword) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Hasła nie są identyczne');
      return;
    }

    if (password.length < 4) {
      toast.error('Hasło musi mieć minimum 4 znaki');
      return;
    }

    if (userLogin.length < 3) {
      toast.error('Login musi mieć minimum 3 znaki');
      return;
    }

    setLoading(true);

    try {
      const { ipcRenderer } = window.require('electron');

      // Create admin user
      const createResult = await ipcRenderer.invoke('db:create-user', {
        name,
        surname,
        login: userLogin,
        password,
        report_language: reportLanguage,
        role: 'admin',
      });

      if (!createResult.success) {
        toast.error(createResult.error || 'Błąd tworzenia konta administratora');
        setLoading(false);
        return;
      }

      // Auto-login
      const loginResult = await login(userLogin, password);

      if (loginResult.success) {
        toast.success('Konto administratora utworzone! Witaj w aplikacji 🎉');
        setIsFirstLaunch(false);
      } else {
        toast.error('Konto utworzone, ale błąd logowania');
      }
    } catch (error: any) {
      console.error('Admin setup error:', error);
      toast.error('Wystąpił błąd podczas konfiguracji');
    } finally {
      setLoading(false);
    }
  };

  const handleForcedPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmNewPassword) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('Hasła nie są identyczne');
      return;
    }

    if (newPassword.length < 4) {
      toast.error('Nowe hasło musi mieć minimum 4 znaki');
      return;
    }

    if (!userPendingPasswordChange) {
      toast.error('Błąd: brak danych użytkownika');
      return;
    }

    setChangingPassword(true);

    try {
      const { ipcRenderer } = window.require('electron');

      // Use the initial password (Start.123) as current password
      const result = await ipcRenderer.invoke('db:change-password', {
        userId: userPendingPasswordChange.id,
        currentPassword: 'Start.123',
        newPassword,
      });

      if (result.success) {
        toast.success('✅ Hasło zostało zmienione pomyślnie!');

        // Update user data to clear force_password_change flag
        const updatedUser: PublicUser = {
          ...userPendingPasswordChange,
          force_password_change: false,
        };

        // Set user as logged in
        setUser(updatedUser);

        // Close modal and reset state
        setShowPasswordChangeModal(false);
        setUserPendingPasswordChange(null);
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        toast.error(result.error || 'Błąd zmiany hasła');
      }
    } catch (error: any) {
      console.error('Forced password change error:', error);
      toast.error('Wystąpił błąd podczas zmiany hasła');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface via-surface-dim to-surface-container-low p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 primary-gradient rounded-2xl mb-4 shadow-glow">
            <span className="material-symbols-outlined text-5xl text-on-primary">
              inventory_2
            </span>
          </div>
          <h1 className="text-4xl font-headline font-extrabold text-on-surface mb-2">
            {isFirstLaunch ? 'Konfiguracja' : 'Asystent Pakowania'}
          </h1>
          <p className="text-on-surface-variant font-body">
            {isFirstLaunch
              ? 'Witaj! Utwórz konto administratora aby rozpocząć'
              : mode === 'login'
              ? 'Zaloguj się aby kontynuować'
              : 'Utwórz nowe konto'}
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-panel rounded-2xl shadow-glass p-8 border border-outline-variant/20 animate-scale-in">
          {isFirstLaunch ? (
            // Admin Setup Form
            <form onSubmit={handleAdminSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Imię
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Jakub"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Nazwisko
                </label>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Pacura"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Login
                </label>
                <input
                  type="text"
                  value={userLogin}
                  onChange={(e) => setUserLogin(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="admin"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Hasło
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Potwierdź Hasło
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Język Raportu
                </label>
                <select
                  value={reportLanguage}
                  onChange={(e) => setReportLanguage(e.target.value as 'pl' | 'en')}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  disabled={loading}
                >
                  <option value="pl">Polski</option>
                  <option value="en">English</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 primary-gradient text-on-primary font-bold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    Tworzenie konta...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">person_add</span>
                    Utwórz Konto Administratora
                  </>
                )}
              </button>

              <div className="flex items-start gap-3 p-4 bg-error-container/20 border border-error-container/40 rounded-lg">
                <span className="material-symbols-outlined text-error flex-shrink-0 mt-0.5">
                  info
                </span>
                <p className="text-sm text-on-surface-variant">
                  To konto będzie miało pełne uprawnienia administratora
                </p>
              </div>
            </form>
          ) : mode === 'login' ? (
            // Login Form
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Login
                </label>
                <input
                  type="text"
                  value={userLogin}
                  onChange={(e) => setUserLogin(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Twój login"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Hasło
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 primary-gradient text-on-primary font-bold rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    Logowanie...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">login</span>
                    Zaloguj się
                  </>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-surface-container text-on-surface-variant">lub</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMode('register')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold rounded-lg border border-outline-variant/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">person_add</span>
                Utwórz nowe konto
              </button>
            </form>
          ) : (
            // Register Form
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Imię
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Jan"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Nazwisko
                </label>
                <input
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Kowalski"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Login
                </label>
                <input
                  type="text"
                  value={userLogin}
                  onChange={(e) => setUserLogin(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="jan.kowalski"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Hasło
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Potwierdź Hasło
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Język Raportu
                </label>
                <select
                  value={reportLanguage}
                  onChange={(e) => setReportLanguage(e.target.value as 'pl' | 'en')}
                  className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  disabled={loading}
                >
                  <option value="pl">Polski</option>
                  <option value="en">English</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary hover:bg-secondary-dim text-on-secondary font-bold rounded-full shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    Tworzenie konta...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">person_add</span>
                    Utwórz Konto
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-high hover:bg-surface-bright text-on-surface font-semibold rounded-lg border border-outline-variant/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">login</span>
                Mam już konto - Zaloguj
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-on-surface-variant font-body">
          Asystent Pakowania 1.0
        </div>
      </div>

      {/* Forced Password Change Modal */}
      {showPasswordChangeModal && userPendingPasswordChange && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-panel rounded-2xl p-8 max-w-md w-full border border-outline-variant/20 animate-scale-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-error/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-error">
                  key
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-headline font-bold text-on-surface">
                  Zmiana hasła wymagana
                </h2>
                <p className="text-on-surface-variant text-sm">Musisz ustawić nowe hasło</p>
              </div>
            </div>

            <div className="bg-error-container/20 border border-error-container/40 rounded-lg p-4 mb-6">
              <p className="text-on-surface-variant text-sm font-medium">
                Twoje hasło zostało zresetowane przez administratora. Ze względów bezpieczeństwa musisz ustawić nowe hasło przed kontynuowaniem.
              </p>
            </div>

            <form onSubmit={handleForcedPasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Nowe hasło
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg border-2 border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                  placeholder="Wprowadź nowe hasło"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-2">
                  Potwierdź nowe hasło
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg border-2 border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                  placeholder="Potwierdź nowe hasło"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full py-4 primary-gradient text-on-primary rounded-full font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {changingPassword ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                    Zmieniam hasło...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">key</span>
                    Ustaw nowe hasło
                  </>
                )}
              </button>

              <p className="text-on-surface-variant text-xs text-center">
                Hasło musi mieć minimum 4 znaki
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;
