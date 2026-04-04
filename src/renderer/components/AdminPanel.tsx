import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useUser } from '../contexts/UserContext';
import { PublicUser } from '../types/user';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useUser();

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New user form state
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserSurname, setNewUserSurname] = useState('');
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [creatingUser, setCreatingUser] = useState(false);

  // Modals
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<PublicUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    if (!isAdmin()) {
      toast.error('Brak uprawnień administratora');
      navigate('/');
      return;
    }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-users');

      if (result.success) {
        setUsers(result.data);
      } else {
        toast.error('Błąd ładowania użytkowników');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Błąd ładowania użytkowników');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserName || !newUserSurname || !newUserLogin || !newUserPassword) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    if (newUserLogin.length < 3) {
      toast.error('Login musi mieć minimum 3 znaki');
      return;
    }

    if (newUserPassword.length < 4) {
      toast.error('Hasło musi mieć minimum 4 znaki');
      return;
    }

    setCreatingUser(true);
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:create-user', {
        name: newUserName,
        surname: newUserSurname,
        login: newUserLogin,
        password: newUserPassword,
        report_language: 'pl',
        role: newUserRole,
      });

      if (result.success) {
        toast.success(`✅ Utworzono użytkownika: ${newUserLogin}`);
        setNewUserName('');
        setNewUserSurname('');
        setNewUserLogin('');
        setNewUserPassword('');
        setNewUserRole('user');
        setShowAddUserForm(false);
        loadUsers();
      } else {
        toast.error(result.error || 'Błąd tworzenia użytkownika');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Wystąpił błąd podczas tworzenia użytkownika');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (user: PublicUser) => {
    if (user.id === currentUser?.id) {
      toast.error('Nie możesz usunąć swojego własnego konta');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:delete-user', user.id);

      if (result.success) {
        toast.success(`🗑️ Usunięto użytkownika: ${user.login}`);
        setDeleteConfirmUser(null);
        loadUsers();
      } else {
        toast.error('Błąd usuwania użytkownika');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Błąd usuwania użytkownika');
    }
  };

  const handleResetPassword = async (user: PublicUser) => {
    if (user.id === currentUser?.id) {
      toast.error('Nie możesz zresetować hasła swojego własnego konta');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:reset-user-password', user.id);

      if (result.success) {
        toast.success(`🔑 Hasło zresetowane do "Start.123" dla użytkownika ${user.login}. Użytkownik będzie musiał zmienić hasło przy następnym logowaniu.`, {
          duration: 8000,
        });
        setResetPasswordUser(null);
      } else {
        toast.error('Błąd resetowania hasła');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Błąd resetowania hasła');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.login.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-on-surface-variant font-body">Ładowanie użytkowników...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 max-w-5xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
            Panel Administratora
          </h1>
          <p className="text-on-surface-variant font-body">
            Zarządzanie użytkownikami systemu
          </p>
        </div>

        {/* Add User Button */}
        <button
          onClick={() => setShowAddUserForm(!showAddUserForm)}
          className="
            primary-gradient text-on-primary font-bold py-3 px-6
            rounded-full flex items-center gap-2
            active:scale-95 transition-all shadow-lg shadow-primary/20
            font-headline
          "
        >
          <span className="material-symbols-outlined">
            {showAddUserForm ? 'close' : 'person_add'}
          </span>
          <span>{showAddUserForm ? 'Anuluj' : 'Nowy użytkownik'}</span>
        </button>
      </div>

      {/* Add User Form */}
      {showAddUserForm && (
        <form onSubmit={handleCreateUser} className="bg-surface-container-high rounded-xl p-6 space-y-4">
          <h3 className="text-xl font-headline font-bold text-on-surface mb-4">
            Dodaj nowego użytkownika
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-on-surface font-label font-semibold text-xs uppercase tracking-wider mb-2 block">
                Imię
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="
                  w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                  font-body outline-none focus:ring-2 focus:ring-primary
                "
                placeholder="Jan"
              />
            </div>

            <div>
              <label className="text-on-surface font-label font-semibold text-xs uppercase tracking-wider mb-2 block">
                Nazwisko
              </label>
              <input
                type="text"
                value={newUserSurname}
                onChange={(e) => setNewUserSurname(e.target.value)}
                className="
                  w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                  font-body outline-none focus:ring-2 focus:ring-primary
                "
                placeholder="Kowalski"
              />
            </div>
          </div>

          <div>
            <label className="text-on-surface font-label font-semibold text-xs uppercase tracking-wider mb-2 block">
              Login
            </label>
            <input
              type="text"
              value={newUserLogin}
              onChange={(e) => setNewUserLogin(e.target.value)}
              className="
                w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                font-body outline-none focus:ring-2 focus:ring-primary
              "
              placeholder="jkowalski"
            />
          </div>

          <div>
            <label className="text-on-surface font-label font-semibold text-xs uppercase tracking-wider mb-2 block">
              Hasło
            </label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="
                w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                font-body outline-none focus:ring-2 focus:ring-primary
              "
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-on-surface font-label font-semibold text-xs uppercase tracking-wider mb-2 block">
              Rola
            </label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
              className="
                w-full px-4 py-3 bg-surface-container text-on-surface rounded-lg
                font-body outline-none focus:ring-2 focus:ring-primary
              "
            >
              <option value="user">Użytkownik</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creatingUser}
            className="
              w-full primary-gradient text-on-primary font-bold py-3
              rounded-lg flex items-center justify-center gap-2
              disabled:opacity-50
              active:scale-95 transition-all shadow-lg shadow-primary/20
              font-headline
            "
          >
            <span className="material-symbols-outlined">
              {creatingUser ? 'progress_activity' : 'check'}
            </span>
            <span>{creatingUser ? 'Tworzenie...' : 'Utwórz użytkownika'}</span>
          </button>
        </form>
      )}

      {/* Search */}
      <div className="bg-surface-container-high rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant text-2xl">
            search
          </span>
          <input
            type="text"
            placeholder="Szukaj użytkownika..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              flex-1 bg-transparent text-on-surface font-body
              placeholder:text-on-surface-variant outline-none
            "
          />
        </div>
      </div>

      {/* Users List - NO DIVIDERS, 16px spacing */}
      <div className="space-y-4">
        <h2 className="text-xl font-headline font-bold text-on-surface">
          Użytkownicy ({filteredUsers.length})
        </h2>

        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-surface-container-highest rounded-xl p-6 hover:bg-surface-bright transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className={`
                  w-14 h-14 rounded-full flex items-center justify-center
                  ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}
                `}>
                  <span className="material-symbols-outlined text-2xl">
                    {user.role === 'admin' ? 'admin_panel_settings' : 'person'}
                  </span>
                </div>

                {/* User Info */}
                <div>
                  <h3 className="text-lg font-headline font-bold text-on-surface">
                    {user.name} {user.surname}
                  </h3>
                  <p className="text-on-surface-variant font-body text-sm">
                    @{user.login}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-label font-semibold
                      ${user.role === 'admin'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary/20 text-secondary'
                      }
                    `}>
                      {user.role === 'admin' ? 'Administrator' : 'Użytkownik'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setResetPasswordUser(user)}
                  disabled={user.id === currentUser?.id}
                  className="
                    px-4 py-2 rounded-lg flex items-center gap-2
                    text-tertiary hover:bg-tertiary/10
                    disabled:opacity-30 disabled:cursor-not-allowed
                    transition-all font-label font-semibold text-sm
                  "
                >
                  <span className="material-symbols-outlined text-base">lock_reset</span>
                  <span>Reset hasła</span>
                </button>

                <button
                  onClick={() => setDeleteConfirmUser(user)}
                  disabled={user.id === currentUser?.id}
                  className="
                    px-4 py-2 rounded-lg flex items-center gap-2
                    text-error hover:bg-error/10
                    disabled:opacity-30 disabled:cursor-not-allowed
                    transition-all font-label font-semibold text-sm
                  "
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  <span>Usuń</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-highest rounded-2xl p-8 max-w-md w-full shadow-glass">
            <div className="text-center mb-6">
              <span className="material-symbols-outlined text-error text-6xl mb-4 block">
                warning
              </span>
              <h3 className="text-2xl font-headline font-bold text-on-surface mb-2">
                Usuń użytkownika
              </h3>
              <p className="text-on-surface-variant font-body">
                Czy na pewno chcesz usunąć użytkownika{' '}
                <strong className="text-on-surface">{deleteConfirmUser.name} {deleteConfirmUser.surname}</strong>?
              </p>
              <p className="text-error font-label text-sm mt-2">
                Ta operacja jest nieodwracalna!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="
                  flex-1 px-6 py-3 rounded-lg
                  bg-surface-container text-on-surface
                  hover:bg-surface-bright
                  transition-all font-body font-semibold
                "
              >
                Anuluj
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirmUser)}
                className="
                  flex-1 px-6 py-3 rounded-lg
                  bg-error text-on-error
                  hover:bg-error-dim
                  transition-all font-body font-bold
                "
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-highest rounded-2xl p-8 max-w-md w-full shadow-glass">
            <div className="text-center mb-6">
              <span className="material-symbols-outlined text-tertiary text-6xl mb-4 block">
                lock_reset
              </span>
              <h3 className="text-2xl font-headline font-bold text-on-surface mb-2">
                Resetuj hasło
              </h3>
              <p className="text-on-surface-variant font-body">
                Resetować hasło użytkownika{' '}
                <strong className="text-on-surface">{resetPasswordUser.name} {resetPasswordUser.surname}</strong>?
              </p>
              <p className="text-tertiary font-label text-sm mt-4 bg-tertiary/10 rounded-lg p-3">
                Nowe hasło: <strong>Start.123</strong>
                <br />
                Użytkownik będzie musiał zmienić hasło przy następnym logowaniu.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setResetPasswordUser(null)}
                className="
                  flex-1 px-6 py-3 rounded-lg
                  bg-surface-container text-on-surface
                  hover:bg-surface-bright
                  transition-all font-body font-semibold
                "
              >
                Anuluj
              </button>
              <button
                onClick={() => handleResetPassword(resetPasswordUser)}
                className="
                  flex-1 px-6 py-3 rounded-lg
                  bg-tertiary text-white
                  hover:bg-tertiary-dim
                  transition-all font-body font-bold
                "
              >
                Resetuj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
