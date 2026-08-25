import React, { useState, useEffect, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { User, UserRole, PermissionKey, RBACMatrix } from '../../types';
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Mail,
  RotateCcw,
  ShieldCheck,
  Info,
  Save,
  Undo2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Sliders,
  ShieldAlert,
  Lock,
  Sparkles,
  Search,
  Filter
} from 'lucide-react';

interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: string;
  description: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { key: 'view_dashboard', label: 'View Dashboard & KPIs', category: 'Core Operations', description: 'Access executive summary, revenue stats, and alert summaries' },
  { key: 'access_pos', label: 'Point-of-Sale (POS) Terminal', category: 'Core Operations', description: 'Access POS workstation interface, drug search, and dispensing workflow' },
  { key: 'save_hold_cart', label: 'Save / Hold POS Carts', category: 'Core Operations', description: 'Park active carts and hold customer transactions' },
  { key: 'receive_payment', label: 'Receive Cashier Payments & Print Receipt', category: 'Sales & Finance', description: 'Collect customer tender (cash/card/momo), compute change, and issue official thermal receipts' },
  { key: 'dispense_prescriptions', label: 'Final Medication Dispensing & Handover', category: 'Prescriptions', description: 'Verify paid receipts, pack medications, and confirm final handover to patient' },
  { key: 'add_prescription_to_cart', label: 'Add Prescription to POS Cart', category: 'Prescriptions', description: 'Load verified prescription medications directly into POS cart' },
  { key: 'register_prescriptions', label: 'Register Clinical Prescriptions', category: 'Prescriptions', description: 'Enter doctor prescriptions, diagnosis, and clinical dosage instructions' },
  { key: 'view_medicines', label: 'View Medicine Catalog', category: 'Inventory & Medicines', description: 'Browse active drugs, dosage strengths, and batches' },
  { key: 'view_cost_price', label: 'View Medicine Cost / Wholesale Price', category: 'Inventory & Medicines', description: 'View acquisition cost price, COGS valuations, and profit margin statistics' },
  { key: 'manage_medicines', label: 'Setup & Edit Medicines', category: 'Inventory & Medicines', description: 'Add, update, or discontinue medicine catalog entries' },
  { key: 'adjust_inventory', label: 'Stock Adjustments & Disposal', category: 'Inventory & Medicines', description: 'Record physical reconciliation, damage write-offs, and batch edits' },
  { key: 'manage_purchases', label: 'Purchases & Inbound Goods', category: 'Purchasing', description: 'Create purchase orders, receive supplier shipments, and update costs' },
  { key: 'manage_customers', label: 'Patient & Customer Profiles', category: 'Customers', description: 'Manage patient allergy history, chronic conditions, and contact details' },
  { key: 'manage_returns', label: 'Sales Returns & Refunds', category: 'Sales & Finance', description: 'Process customer sales returns, restitution refunds, and quarantine or restock batch disposition' },
  { key: 'view_reports', label: 'Inventory & Operations Reports', category: 'Analytics', description: 'Access fast & slow moving drug velocity, stock movement turnover, and returns audit reports' },
  { key: 'view_sales_reports', label: 'Sales & Revenue Financial Reports', category: 'Analytics', description: 'Access gross/net revenue ledgers, profit margins, cashier performance, and sales breakdown' },
  { key: 'manage_users', label: 'Staff Accounts Management', category: 'Administration', description: 'Create, edit, suspend, reset credentials, and configure per-user custom permission overrides' },
  { key: 'manage_rbac_matrix', label: 'Edit Global RBAC Matrix', category: 'Administration', description: 'Govern and enforce role-based access control matrix policies across all 5 system roles' },
  { key: 'view_audit_logs', label: 'Security & Audit Trail', category: 'Administration', description: 'Inspect real-time cryptographic audit trail of all staff events' },
  { key: 'manage_backups', label: 'Settings & Local Backups', category: 'Administration', description: 'Configure store parameters and export/import JSON database dumps' },
  { key: 'view_system_docs', label: 'System Specs & API Specs', category: 'Administration', description: 'Access developer documentation, database schema specs, and offline API' },
];

const ROLES_LIST: { role: UserRole; label: string; desc: string }[] = [
  { role: 'admin', label: 'System Admin', desc: 'Full unrestricted governance' },
  { role: 'pharmacist', label: 'Pharmacist', desc: 'Clinical authority, dispensing, returns' },
  { role: 'dispensing_assistant', label: 'Dispensing Asst.', desc: 'Prescriptions & POS, no setup' },
  { role: 'cashier', label: 'Cashier', desc: 'POS checkout & save carts only' },
  { role: 'storekeeper', label: 'Storekeeper', desc: 'Warehouse, stock & purchasing' },
];

export const UserManagementView: React.FC = () => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    currentUser,
    rbacMatrix,
    updateRolePermission,
    saveEntireRBACMatrix,
    resetRBACMatrix,
    resetUserPassword,
    updateUserCustomPermissions,
  } = usePharmacy();

  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Reset Password Modal State
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newDefaultPassword, setNewDefaultPassword] = useState('Pharmacy@123');
  const [forceChangeOnLogin, setForceChangeOnLogin] = useState(true);

  // Custom Permissions Modal State
  const [customPermUser, setCustomPermUser] = useState<User | null>(null);
  const [userDraftPermissions, setUserDraftPermissions] = useState<Partial<Record<PermissionKey, boolean>>>({});
  const [permSearchTerm, setPermSearchTerm] = useState('');
  const [selectedPermCategory, setSelectedPermCategory] = useState('All');

  // RBAC Matrix draft state
  const [draftMatrix, setDraftMatrix] = useState<RBACMatrix>(rbacMatrix);

  useEffect(() => {
    setDraftMatrix(rbacMatrix);
  }, [rbacMatrix]);

  const pendingChangesCount = useMemo(() => {
    let count = 0;
    ROLES_LIST.forEach((r) => {
      PERMISSION_DEFINITIONS.forEach((p) => {
        const originalVal = Boolean(rbacMatrix[r.role]?.[p.key]);
        const draftVal = Boolean(draftMatrix[r.role]?.[p.key]);
        if (originalVal !== draftVal) {
          count++;
        }
      });
    });
    return count;
  }, [draftMatrix, rbacMatrix]);

  // Form State for Add / Edit
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('pharmacist');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [initialPassword, setInitialPassword] = useState('Pharmacy@123');
  const [mustChangeInitialPassword, setMustChangeInitialPassword] = useState(true);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setName('');
    setEmail('');
    setRole('pharmacist');
    setStatus('active');
    setInitialPassword('Pharmacy@123');
    setMustChangeInitialPassword(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status || (user.isActive !== false ? 'active' : 'inactive'));
    setMustChangeInitialPassword(Boolean(user.mustChangePasswordOnLogin));
    setIsAddModalOpen(true);
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUser(editingUser.id, {
        username,
        name,
        email,
        role,
        status,
        isActive: status === 'active',
        mustChangePasswordOnLogin: mustChangeInitialPassword,
      });
      setStatusMessage(`Updated user profile for ${name}.`);
    } else {
      addUser({
        username,
        name,
        email,
        role,
        status,
        isActive: status === 'active',
        mustChangePasswordOnLogin: mustChangeInitialPassword,
      });
      setStatusMessage(`Added new user ${name} with default credentials.`);
    }
    setIsAddModalOpen(false);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  // Password Reset Handling
  const handleOpenResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setNewDefaultPassword('Pharmacy@123');
    setForceChangeOnLogin(true);
  };

  const handleExecuteResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;

    resetUserPassword(resetPasswordUser.id, newDefaultPassword, forceChangeOnLogin);
    setStatusMessage(`Successfully reset password for ${resetPasswordUser.name}. User will be prompted to change password on login.`);
    setResetPasswordUser(null);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const handleGenerateRandomPin = () => {
    const randomPin = `Rx${Math.floor(100000 + Math.random() * 900000)}`;
    setNewDefaultPassword(randomPin);
  };

  // Custom Permissions Modal Handling
  const handleOpenCustomPermissions = (user: User) => {
    setCustomPermUser(user);
    setUserDraftPermissions(user.customPermissions || {});
    setPermSearchTerm('');
    setSelectedPermCategory('All');
  };

  const handleSetUserPermissionState = (permKey: PermissionKey, state: 'inherit' | 'allow' | 'deny') => {
    setUserDraftPermissions((prev) => {
      const updated = { ...prev };
      if (state === 'inherit') {
        delete updated[permKey];
      } else if (state === 'allow') {
        updated[permKey] = true;
      } else if (state === 'deny') {
        updated[permKey] = false;
      }
      return updated;
    });
  };

  const handleSaveCustomPermissions = () => {
    if (!customPermUser) return;
    updateUserCustomPermissions(customPermUser.id, userDraftPermissions);
    setStatusMessage(`Saved personalized access permissions for ${customPermUser.name}. Takes effect immediately!`);
    setCustomPermUser(null);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const handleResetUserToRoleDefaults = () => {
    setUserDraftPermissions({});
  };

  // RBAC Matrix toggle
  const handleToggleDraftPermission = (targetRole: UserRole, permKey: PermissionKey) => {
    if (targetRole === 'admin' && (permKey === 'manage_users' || permKey === 'manage_rbac_matrix')) {
      alert('System Security: The Admin role must always retain User Management & RBAC permissions.');
      return;
    }

    const currentVal = Boolean(draftMatrix[targetRole]?.[permKey]);
    const updated = {
      ...draftMatrix,
      [targetRole]: {
        ...draftMatrix[targetRole],
        [permKey]: !currentVal,
      },
    };
    setDraftMatrix(updated);
    setSaveSuccessMessage('');
  };

  const handleSaveChanges = () => {
    saveEntireRBACMatrix(draftMatrix);
    setSaveSuccessMessage(`Successfully applied and persisted ${pendingChangesCount > 0 ? pendingChangesCount : 'all'} RBAC permission updates. Changes take effect immediately!`);
    setTimeout(() => setSaveSuccessMessage(''), 6000);
  };

  const handleDiscardChanges = () => {
    setDraftMatrix(rbacMatrix);
    setStatusMessage('Discarded unsaved matrix modifications.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all RBAC matrix permissions to default pharmacy security policy? This will take effect immediately.')) {
      resetRBACMatrix();
      setSaveSuccessMessage('Reset RBAC matrix to default policy and applied immediately.');
      setTimeout(() => setSaveSuccessMessage(''), 5000);
    }
  };

  const permCategories = useMemo(() => {
    const cats = Array.from(new Set(PERMISSION_DEFINITIONS.map(p => p.category)));
    return ['All', ...cats];
  }, []);

  const filteredPermissions = useMemo(() => {
    return PERMISSION_DEFINITIONS.filter(p => {
      const matchesSearch = p.label.toLowerCase().includes(permSearchTerm.toLowerCase()) ||
                            p.description.toLowerCase().includes(permSearchTerm.toLowerCase());
      const matchesCat = selectedPermCategory === 'All' || p.category === selectedPermCategory;
      return matchesSearch && matchesCat;
    });
  }, [permSearchTerm, selectedPermCategory]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCog className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">User Access & Security Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure system staff accounts, set default & reset passwords, customize per-user permissions, and maintain role matrices.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'users' ? (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Staff Member
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Reset Defaults
              </button>

              <button
                type="button"
                onClick={handleSaveChanges}
                className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                  pendingChangesCount > 0
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 animate-pulse'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save Changes {pendingChangesCount > 0 && `(${pendingChangesCount})`}
              </button>
            </div>
          )}
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="p-3.5 bg-slate-900 text-white text-xs font-semibold rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Staff Accounts & Credentials ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'matrix'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Global RBAC Permission Matrix</span>
          {pendingChangesCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">System Staff Directory</h3>
              <p className="text-[11px] text-slate-500">Manage user access, temporary passwords, first-login policies, and custom permissions</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg">
              {users.length} Active System User{users.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">User Details</th>
                  <th className="py-3.5 px-4 font-semibold">Username</th>
                  <th className="py-3.5 px-4 font-semibold">System Role</th>
                  <th className="py-3.5 px-4 font-semibold">Security State</th>
                  <th className="py-3.5 px-4 font-semibold">Custom Overrides</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((user) => {
                  const isCurrent = user.id === currentUser.id;
                  const isActive = user.status === 'active' || user.isActive !== false;
                  const customPermCount = Object.keys(user.customPermissions || {}).length;

                  const roleColors: Record<string, string> = {
                    admin: 'bg-purple-100 text-purple-800 border-purple-200',
                    pharmacist: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    cashier: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                    storekeeper: 'bg-amber-100 text-amber-800 border-amber-200',
                    dispensing_assistant: 'bg-teal-100 text-teal-800 border-teal-200',
                  };

                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                            {user.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center">
                              {user.name}
                              {isCurrent && (
                                <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-normal">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center mt-0.5">
                              <Mail className="w-3 h-3 mr-1 text-slate-400" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        @{user.username}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md border ${roleColors[user.role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => toggleUserStatus(user.id)}
                            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border cursor-pointer ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Click to toggle account status"
                          >
                            {isActive ? 'Active' : 'Suspended'}
                          </button>

                          {user.mustChangePasswordOnLogin && (
                            <span className="block text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-fit">
                              🔑 Change on 1st Login
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {customPermCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                            <Sliders className="w-3 h-3 mr-1" />
                            {customPermCount} Customized
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Inheriting Role Policy
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(user)}
                            className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                            title="Reset User Password & Set First-Login Rule"
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-1" />
                            Reset Password
                          </button>

                          {/* Custom Permissions */}
                          <button
                            type="button"
                            onClick={() => handleOpenCustomPermissions(user)}
                            className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                            title="Customize Individual Access Permissions"
                          >
                            <Sliders className="w-3.5 h-3.5 mr-1" />
                            Permissions
                          </button>

                          {/* Edit Profile */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit User Profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete User */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to remove ${user.name}?`)) {
                                  deleteUser(user.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RBAC MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {pendingChangesCount > 0 && (
            <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fadeIn">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    {pendingChangesCount} Unsaved Privilege Modification{pendingChangesCount > 1 ? 's' : ''}
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    You have staged permission changes that have not yet been committed to the security engine.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Undo2 className="w-3.5 h-3.5 mr-1" />
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save Changes ({pendingChangesCount})
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <th className="py-4 px-4 font-bold w-1/3">Security Capability / Function</th>
                    {ROLES_LIST.map((r) => (
                      <th key={r.role} className="py-4 px-3 font-bold text-center">
                        <div className="font-bold text-xs">{r.label}</div>
                        <div className="text-[9px] text-slate-400 normal-case font-normal truncate max-w-[100px] mx-auto">
                          {r.desc}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERMISSION_DEFINITIONS.map((perm) => (
                    <tr key={perm.key} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{perm.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{perm.description}</div>
                      </td>

                      {ROLES_LIST.map((r) => {
                        const isAllowed = Boolean(draftMatrix[r.role]?.[perm.key]);
                        const isOriginalAllowed = Boolean(rbacMatrix[r.role]?.[perm.key]);
                        const isModified = isAllowed !== isOriginalAllowed;
                        const isLockedAdmin = r.role === 'admin' && (perm.key === 'manage_users' || perm.key === 'manage_rbac_matrix');

                        return (
                          <td key={`${r.role}-${perm.key}`} className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleDraftPermission(r.role, perm.key)}
                              disabled={isLockedAdmin}
                              className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                isLockedAdmin
                                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-70'
                                  : isAllowed
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                  : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              } ${isModified ? 'ring-2 ring-amber-500 ring-offset-1 font-extrabold' : ''}`}
                              title={
                                isLockedAdmin
                                  ? 'Locked: Core security constraint'
                                  : `${isAllowed ? 'Revoke' : 'Grant'} ${perm.label} for ${r.label}`
                              }
                            >
                              {isAllowed ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4 stroke-[3]" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT STAFF MEMBER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <UserCog className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingUser ? `Edit Staff Profile: ${editingUser.name}` : 'Create New Staff Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Alex Watson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">System Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. awatson"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="awatson@pharmacare.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium capitalize focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="admin">Administrator</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="dispensing_assistant">Dispensing Assistant</option>
                    <option value="cashier">Cashier</option>
                    <option value="storekeeper">Storekeeper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Default Password & Onboarding</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Initial Default Password</label>
                    <input
                      type="text"
                      value={initialPassword}
                      onChange={(e) => setInitialPassword(e.target.value)}
                      placeholder="e.g. Pharmacy@123"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <label className="flex items-center space-x-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={mustChangeInitialPassword}
                      onChange={(e) => setMustChangeInitialPassword(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-700 font-medium">
                      Require user to change password upon first login
                    </span>
                  </label>
                </div>
              )}

              {editingUser && (
                <label className="flex items-center space-x-2 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    checked={mustChangeInitialPassword}
                    onChange={(e) => setMustChangeInitialPassword(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Force user to update password on next login
                  </span>
                </label>
              )}

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingUser ? 'Update Staff Member' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET USER PASSWORD */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset User Password</h3>
                  <p className="text-[11px] text-slate-500">For {resetPasswordUser.name} (@{resetPasswordUser.username})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    New Default / Temporary Password
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPin}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Random PIN</span>
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newDefaultPassword}
                    onChange={(e) => setNewDefaultPassword(e.target.value)}
                    placeholder="Enter default temporary password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceChangeOnLogin}
                    onChange={(e) => setForceChangeOnLogin(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Enforce First-Login Password Change
                    </span>
                    <span className="text-[11px] text-amber-800 block leading-relaxed">
                      User will be immediately required to set a permanent, confidential password upon logging in with this temporary default.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Confirm Password Reset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CUSTOMIZE USER ACCESS PERMISSIONS */}
      {customPermUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-2xl">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Customize Access: {customPermUser.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                      Role: {customPermUser.role.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Override global role rules for this individual staff member. Custom rules take precedence.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCustomPermUser(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search permissions..."
                  value={permSearchTerm}
                  onChange={(e) => setPermSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center shrink-0">
                  <Filter className="w-3 h-3 mr-1" /> Category:
                </span>
                <div className="flex space-x-1">
                  {permCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedPermCategory(cat)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors shrink-0 cursor-pointer ${
                        selectedPermCategory === cat
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Permissions List */}
            <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100">
              {filteredPermissions.map((perm) => {
                const roleDefault = Boolean(rbacMatrix[customPermUser.role]?.[perm.key]);
                const customState = userDraftPermissions[perm.key];
                const isOverridden = customState !== undefined;

                return (
                  <div key={perm.key} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                    <div className="space-y-0.5 max-w-md">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{perm.label}</span>
                        <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {perm.category}
                        </span>
                        {isOverridden && (
                          <span className={`text-[9px] font-bold px-2 py-0.2 rounded-full ${
                            customState ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {customState ? 'Custom: ALLOWED' : 'Custom: DENIED'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{perm.description}</p>
                      <div className="text-[10px] text-slate-400">
                        Default for {customPermUser.role}: <strong className={roleDefault ? 'text-emerald-600 font-semibold' : 'text-slate-600 font-semibold'}>{roleDefault ? 'Allowed' : 'Denied'}</strong>
                      </div>
                    </div>

                    {/* 3-State Action Selector */}
                    <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleSetUserPermissionState(perm.key, 'inherit')}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                          !isOverridden
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Inherit system role standard matrix rule"
                      >
                        Inherit Role
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetUserPermissionState(perm.key, 'allow')}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                          isOverridden && customState === true
                            ? 'bg-emerald-600 text-white shadow-xs font-bold'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title="Force allow this action for this user"
                      >
                        Grant (Allow)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetUserPermissionState(perm.key, 'deny')}
                        className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                          isOverridden && customState === false
                            ? 'bg-rose-600 text-white shadow-xs font-bold'
                            : 'text-rose-700 hover:bg-rose-50'
                        }`}
                        title="Force deny this action for this user"
                      >
                        Revoke (Deny)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleResetUserToRoleDefaults}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset All to Role Defaults</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCustomPermUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomPermissions}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save User Permissions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
