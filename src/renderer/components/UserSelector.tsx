import React, { useState, useEffect } from 'react';
import { Users, Plus, LogIn, Lock, X, User, Trash2 } from 'lucide-react';

interface User {
  id: number;
  name: string;
  surname?: string;
  created_at: number;
  last_login_at?: number;
}

interface UserSelectorProps {
  onUserSelected: (user: User) => void;
}

const UserSelector: React.FC<UserSelectorProps> = ({ onUserSelected }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Create user form
  const [newName, setNewName] = useState('');
  const [newSurname, setNewSurname] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Login password
  const [loginPassword, setLoginPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:get-users');

      if (result.success) {
        setUsers(result.data);

        // If no users exist, show create user form
        if (result.data.length === 0) {
          setShowCreateUser(true);
        }
      } else {
        console.error('Failed to load users:', result.error);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newName.trim()) {
      alert('⚠️ Proszę podać imię');
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke(
        'db:create-user',
        newName.trim(),
        newSurname.trim(),
        newPassword.trim() || undefined
      );

      if (result.success) {
        // Reload users and close form
        await loadUsers();
        setShowCreateUser(false);
        setNewName('');
        setNewSurname('');
        setNewPassword('');
      } else {
        alert('❌ Błąd tworzenia użytkownika');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('❌ Błąd tworzenia użytkownika');
    }
  };

  const handleUserClick = async (user: User) => {
    try {
      const { ipcRenderer } = window.require('electron');

      // Try to login without password first
      const result = await ipcRenderer.invoke('db:login-user', user.id);

      if (result.success) {
        // Login successful
        onUserSelected(result.data);
      } else if (result.needsPassword) {
        // User has password set, show password prompt
        setSelectedUser(user);
        setShowPasswordPrompt(true);
        setLoginPassword('');
      } else {
        alert('❌ Błąd logowania');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      alert('❌ Błąd logowania');
    }
  };

  const handleLoginWithPassword = async () => {
    if (!selectedUser) return;

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:login-user', selectedUser.id, loginPassword);

      if (result.success) {
        // Login successful
        onUserSelected(result.data);
        setShowPasswordPrompt(false);
        setLoginPassword('');
      } else {
        alert('❌ Nieprawidłowe hasło');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      alert('❌ Błąd logowania');
    }
  };

  const handleDeleteUser = async (userId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
      return;
    }

    try {
      const { ipcRenderer } = window.require('electron');
      const result = await ipcRenderer.invoke('db:delete-user', userId);

      if (result.success) {
        loadUsers();
      } else {
        alert('❌ Błąd usuwania użytkownika');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('❌ Błąd usuwania użytkownika');
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-text-secondary">Ładowanie użytkowników...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-bg-primary flex items-center justify-center">
      <div className="max-w-4xl w-full mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-accent-primary to-purple-600 rounded-2xl mb-4">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Wybierz użytkownika
          </h1>
          <p className="text-text-secondary">
            Zaloguj się aby kontynuować
          </p>
        </div>

        {/* Users grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleUserClick(user)}
              className="group relative bg-bg-secondary hover:bg-bg-tertiary rounded-xl p-6 transition-all text-left border-2 border-transparent hover:border-accent-primary"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent-primary to-purple-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">
                      {user.name}
                    </h3>
                    {user.surname && (
                      <p className="text-sm text-text-secondary">{user.surname}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteUser(user.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                  title="Usuń użytkownika"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {user.last_login_at && (
                <p className="text-xs text-text-tertiary">
                  Ostatnie logowanie: {new Date(user.last_login_at).toLocaleDateString('pl-PL')}
                </p>
              )}

              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <LogIn className="w-5 h-5 text-accent-primary" />
              </div>
            </button>
          ))}

          {/* Create new user button */}
          <button
            onClick={() => setShowCreateUser(true)}
            className="bg-bg-secondary hover:bg-bg-tertiary rounded-xl p-6 transition-all border-2 border-dashed border-text-tertiary hover:border-accent-primary group"
          >
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 bg-accent-primary/10 group-hover:bg-accent-primary/20 rounded-full flex items-center justify-center mb-3 transition-all">
                <Plus className="w-6 h-6 text-accent-primary" />
              </div>
              <p className="text-text-secondary group-hover:text-text-primary font-medium transition-colors">
                Nowy użytkownik
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Create user modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <Plus className="w-6 h-6 text-accent-primary" />
                Nowy użytkownik
              </h2>
              <button
                onClick={() => {
                  // Don't allow closing if no users exist
                  if (users.length > 0) {
                    setShowCreateUser(false);
                    setNewName('');
                    setNewSurname('');
                    setNewPassword('');
                  }
                }}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
                disabled={users.length === 0}
              >
                <X className="w-5 h-5 text-text-tertiary" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-text-primary font-medium mb-2">
                  Imię *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Wpisz imię..."
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2">
                  Nazwisko
                </label>
                <input
                  type="text"
                  value={newSurname}
                  onChange={(e) => setNewSurname(e.target.value)}
                  placeholder="Wpisz nazwisko..."
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-text-primary font-medium mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Hasło (opcjonalne)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Zostaw puste jeśli nie chcesz hasła..."
                  className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                />
                <p className="text-text-tertiary text-xs mt-2">
                  💡 Hasło chroni dostęp do Twojego konta
                </p>
              </div>
            </div>

            <button
              onClick={handleCreateUser}
              className="w-full px-4 py-3 gradient-primary text-white rounded-lg hover:opacity-90 transition-all font-semibold"
            >
              Utwórz użytkownika
            </button>
          </div>
        </div>
      )}

      {/* Password prompt modal */}
      {showPasswordPrompt && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <Lock className="w-6 h-6 text-accent-primary" />
                Wprowadź hasło
              </h2>
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setLoginPassword('');
                  setSelectedUser(null);
                }}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-tertiary" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-text-secondary mb-4">
                Użytkownik{' '}
                <span className="font-semibold text-text-primary">
                  {selectedUser.name} {selectedUser.surname}
                </span>
                {' '}jest chroniony hasłem
              </p>

              <label className="block text-text-primary font-medium mb-2">
                Hasło
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLoginWithPassword();
                  }
                }}
                placeholder="Wprowadź hasło..."
                className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setLoginPassword('');
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-3 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={handleLoginWithPassword}
                className="flex-1 px-4 py-3 gradient-primary text-white rounded-lg hover:opacity-90 transition-all font-medium"
              >
                Zaloguj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSelector;
