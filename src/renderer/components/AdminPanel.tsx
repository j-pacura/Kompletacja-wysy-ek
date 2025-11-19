import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, UserPlus, Trash2, Shield, User, Search, Loader2, AlertCircle } from 'lucide-react';
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
  const [newUserReportLanguage, setNewUserReportLanguage] = useState<'pl' | 'en'>('pl');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [creatingUser, setCreatingUser] = useState(false);

  // Delete confirmation state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    // Check if user is admin
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

    // Validation
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
        report_language: newUserReportLanguage,
        role: newUserRole,
      });

      if (result.success) {
        toast.success(`✅ Utworzono użytkownika: ${newUserLogin}`);
        // Reset form
        setNewUserName('');
        setNewUserSurname('');
        setNewUserLogin('');
        setNewUserPassword('');
        setNewUserReportLanguage('pl');
        setNewUserRole('user');
        setShowAddUserForm(false);
        // Reload users
        loadUsers();
      } else {
        toast.error(result.error || 'Błąd tworzenia użytkownika');
      }
    } catch (error: any) {
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
        toast.success(`✅ Usunięto użytkownika: ${user.login}`);
        setDeleteConfirmUser(null);
        // Reload users
        loadUsers();
      } else {
        toast.error('Błąd usuwania użytkownika');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Błąd usuwania użytkownika');
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.surname.toLowerCase().includes(searchLower) ||
      user.login.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-bg-tertiary px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary hover:bg-opacity-80 text-text-primary rounded-lg transition-all btn-active"
            >
              <ArrowLeft className="w-5 h-5" />
              Powrót
            </button>
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-1">
                👥 Panel Administratora
              </h1>
              <p className="text-text-secondary">
                Zarządzaj użytkownikami systemu
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddUserForm(!showAddUserForm)}
            className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-lg hover:opacity-90 transition-all btn-active font-semibold"
          >
            <UserPlus className="w-5 h-5" />
            Dodaj użytkownika
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Add User Form */}
          {showAddUserForm && (
            <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary animate-scale-in">
              <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <UserPlus className="w-6 h-6" />
                Nowy użytkownik
              </h2>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-text-secondary text-sm mb-2">Imię</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Jan"
                      className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-text-secondary text-sm mb-2">Nazwisko</label>
                    <input
                      type="text"
                      value={newUserSurname}
                      onChange={(e) => setNewUserSurname(e.target.value)}
                      placeholder="Kowalski"
                      className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-text-secondary text-sm mb-2">Login</label>
                    <input
                      type="text"
                      value={newUserLogin}
                      onChange={(e) => setNewUserLogin(e.target.value)}
                      placeholder="jan.kowalski"
                      className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-text-secondary text-sm mb-2">Hasło</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-text-secondary text-sm mb-2">Język raportu</label>
                    <select
                      value={newUserReportLanguage}
                      onChange={(e) => setNewUserReportLanguage(e.target.value as 'pl' | 'en')}
                      className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                    >
                      <option value="pl">Polski</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-text-secondary text-sm mb-2">Rola</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'user' | 'admin')}
                      className="w-full px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg border-2 border-transparent focus:border-accent-primary focus:outline-none transition-colors"
                    >
                      <option value="user">Użytkownik</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUserForm(false);
                      setNewUserName('');
                      setNewUserSurname('');
                      setNewUserLogin('');
                      setNewUserPassword('');
                    }}
                    className="flex-1 px-6 py-3 bg-bg-tertiary text-text-primary rounded-lg hover:bg-opacity-80 transition-all btn-active font-medium"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="flex-1 px-6 py-3 bg-accent-success hover:bg-accent-success/90 text-white rounded-lg transition-all btn-active font-semibold disabled:opacity-50"
                  >
                    {creatingUser ? 'Tworzenie...' : 'Utwórz użytkownika'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Szukaj użytkownika po imieniu, nazwisku lub loginie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-bg-secondary text-text-primary rounded-lg border-2 border-bg-tertiary focus:border-accent-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Users List */}
          <div className="bg-bg-secondary rounded-xl border border-bg-tertiary overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-tertiary border-b border-bg-tertiary">
                    <th className="px-6 py-4 text-left text-text-secondary text-sm font-semibold">Użytkownik</th>
                    <th className="px-6 py-4 text-left text-text-secondary text-sm font-semibold">Login</th>
                    <th className="px-6 py-4 text-left text-text-secondary text-sm font-semibold">Rola</th>
                    <th className="px-6 py-4 text-left text-text-secondary text-sm font-semibold">Język</th>
                    <th className="px-6 py-4 text-left text-text-secondary text-sm font-semibold">Ostatnie logowanie</th>
                    <th className="px-6 py-4 text-right text-text-secondary text-sm font-semibold">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-bg-tertiary hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            user.role === 'admin' ? 'bg-accent-primary/20' : 'bg-bg-tertiary'
                          }`}>
                            {user.role === 'admin' ? (
                              <Shield className="w-5 h-5 text-accent-primary" />
                            ) : (
                              <User className="w-5 h-5 text-text-secondary" />
                            )}
                          </div>
                          <div>
                            <p className="text-text-primary font-semibold">{user.name} {user.surname}</p>
                            {user.id === currentUser?.id && (
                              <span className="text-xs text-accent-primary">(Ty)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{user.login}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin'
                            ? 'bg-accent-primary/20 text-accent-primary'
                            : 'bg-bg-tertiary text-text-secondary'
                        }`}>
                          {user.role === 'admin' ? 'Administrator' : 'Użytkownik'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-secondary uppercase">{user.report_language}</td>
                      <td className="px-6 py-4 text-text-secondary">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString('pl-PL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Nigdy'
                        }
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeleteConfirmUser(user)}
                          disabled={user.id === currentUser?.id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                          Usuń
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-text-tertiary">Nie znaleziono użytkowników</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
              <p className="text-text-tertiary text-sm mb-1">Wszyscy użytkownicy</p>
              <p className="text-3xl font-bold text-text-primary">{users.length}</p>
            </div>
            <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
              <p className="text-text-tertiary text-sm mb-1">Administratorzy</p>
              <p className="text-3xl font-bold text-accent-primary">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
            <div className="bg-bg-secondary rounded-xl p-6 border border-bg-tertiary">
              <p className="text-text-tertiary text-sm mb-1">Aktywni użytkownicy</p>
              <p className="text-3xl font-bold text-accent-success">
                {users.filter(u => u.active).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary rounded-2xl p-6 max-w-md w-full border border-bg-tertiary">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">Potwierdź usunięcie</h3>
                <p className="text-text-secondary text-sm">Ta operacja jest nieodwracalna</p>
              </div>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4 mb-6">
              <p className="text-text-secondary text-sm mb-2">Czy na pewno chcesz usunąć użytkownika:</p>
              <p className="text-text-primary font-semibold">
                {deleteConfirmUser.name} {deleteConfirmUser.surname} ({deleteConfirmUser.login})
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 px-4 py-3 bg-bg-tertiary text-text-primary rounded-lg hover:bg-opacity-80 transition-all font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirmUser)}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-semibold"
              >
                Usuń użytkownika
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
