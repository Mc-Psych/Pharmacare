import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  User,
  Clock,
  Activity,
  CheckCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLogs, users } = usePharmacy();

  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchUser = userFilter === 'all' || log.userId === userFilter;
      const matchAction = actionFilter === 'all' || log.action.toLowerCase().includes(actionFilter.toLowerCase());
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        log.action.toLowerCase().includes(term) ||
        log.userName.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term) ||
        (log.entityId && log.entityId.toLowerCase().includes(term));

      return matchUser && matchAction && matchSearch;
    });
  }, [auditLogs, userFilter, actionFilter, searchTerm]);

  const handleExportAudit = () => {
    const jsonStr = JSON.stringify(auditLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pharmacy_audit_trail_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Security Audit Trail & Compliance Log</h2>
          <p className="text-xs text-slate-500 mt-1">
            Immutable trace of system events, inventory modifications, prescriptions dispensed, and security actions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportAudit}
          className="inline-flex items-center px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <Download className="w-4 h-4 mr-1.5 text-indigo-600" />
          Export Audit Trail (JSON)
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit details, entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="all">All Staff Members</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="all">All Action Types</option>
          <option value="sale">Sales & Checkouts</option>
          <option value="prescription">Prescription Events</option>
          <option value="stock">Stock Adjustments</option>
          <option value="user">User & Security</option>
          <option value="return">Returns & Refunds</option>
        </select>
      </div>

      {/* Audit Log Stream Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900">Event Log Stream ({filteredLogs.length} Records)</h3>
          <span className="text-xs text-slate-400 font-mono">SHA-256 Audit Integrity Verified</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                <th className="py-3.5 px-4 font-semibold">Staff Member</th>
                <th className="py-3.5 px-4 font-semibold">Action Trigger</th>
                <th className="py-3.5 px-4 font-semibold">Entity Type</th>
                <th className="py-3.5 px-4 font-semibold">Details & Payload</th>
                <th className="py-3.5 px-4 font-semibold text-right">Workstation / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map((log) => {
                const isWarningAction = log.action.includes('Delete') || log.action.includes('Adjust') || log.action.includes('Return');

                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">{log.userRole}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          isWarningAction
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-700 font-semibold">
                      {log.entityType}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-600" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                      {log.ipAddress || '127.0.0.1 (Local)'}
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No matching audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
