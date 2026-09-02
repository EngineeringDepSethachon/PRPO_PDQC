import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, Search, Filter, Globe, Laptop, Clock, 
  User, FileText, Download, Trash2, ArrowUpDown, X, ShieldAlert 
} from 'lucide-react';
import { auditService } from '../services/auditService';
import { modalService } from '../services/modalService';

export default function AuditLogView({ currentRole }) {
  const [logs, setLogs] = useState(() => auditService.getLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');

  const isAdmin = currentRole?.id === 'ADMIN' || currentRole?.roleId === 'ADMIN' || Number(currentRole?.level) >= 99;

  // Extract unique users and actions for filters
  const uniqueUsers = useMemo(() => {
    const names = new Set();
    logs.forEach(l => {
      if (l.actorName && l.actorName !== 'System') names.add(l.actorName);
    });
    return Array.from(names);
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const acts = new Set();
    logs.forEach(l => {
      if (l.action) acts.add(l.action);
    });
    return Array.from(acts);
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
      if (selectedUser !== 'ALL' && log.actorName !== selectedUser) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchActor = (log.actorName || '').toLowerCase().includes(q);
        const matchDoc = (log.docNo || '').toLowerCase().includes(q);
        const matchDetails = (log.details || '').toLowerCase().includes(q);
        const matchIp = (log.ipAddress || '').toLowerCase().includes(q);
        const matchAction = (log.action || '').toLowerCase().includes(q);
        if (!matchActor && !matchDoc && !matchDetails && !matchIp && !matchAction) return false;
      }
      return true;
    });
  }, [logs, selectedAction, selectedUser, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const uniqueIps = new Set(logs.map(l => l.ipAddress).filter(Boolean)).size;
    const logins = logs.filter(l => l.action === 'USER_LOGIN').length;
    const pdpaConsents = logs.filter(l => l.action === 'PDPA_CONSENT').length;
    return { total, uniqueIps, logins, pdpaConsents };
  }, [logs]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Action', 'Actor', 'Role', 'Department', 'DocNo', 'IP_Address', 'Device', 'Details'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.actorName}"`,
      `"${l.actorRole || ''}"`,
      `"${l.department || ''}"`,
      `"${l.docNo || ''}"`,
      `"${l.ipAddress || '-'}"`,
      `"${l.userAgent || '-'}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_ip_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = async () => {
    if (!isAdmin) return;
    const confirmed = await modalService.confirm({
      title: 'ล้างประวัติการใช้งาน (Clear Audit Logs)',
      message: 'ต้องการล้างประวัติการใช้งานและ IP Logs ในเครื่องทั้งหมดหรือไม่? (ข้อมูลใน Google Sheets จะยังคงอยู่)',
      type: 'error',
      confirmText: 'ล้างข้อมูล',
      cancelText: 'ยกเลิก'
    });
    if (confirmed) {
      auditService.clearLogs();
      setLogs([]);
      modalService.success('สำเร็จ', 'ล้างประวัติกิจกรรมเรียบร้อยแล้ว');
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span>บันทึกประวัติการใช้งาน & ที่อยู่ IP (Audit & IP Trail)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            ประวัติการเข้าใช้งาน, ที่อยู่ IP เครื่อง, และการทำรายการของพนักงานแต่ละคนตาม พ.ร.บ. PDPA
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>ส่งออก CSV</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleClearLogs}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="ล้าง Log ในเครื่อง"
            >
              <Trash2 className="w-4 h-4" />
              <span>ล้าง Log</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">บันทึกกิจกรรมทั้งหมด</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">รวมทุกประเภทรายการ</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>จำนวน IP ที่พบ</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{stats.uniqueIps}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">เครื่องที่เชื่อมต่อระบบ</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">การเข้าสู่ระบบ (Logins)</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1 font-mono">{stats.logins}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">ครั้งที่มีการยืนยันตัวตน</div>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">ความยินยอม PDPA</div>
          <div className="text-2xl font-bold text-teal-600 mt-1 font-mono">{stats.pdpaConsents}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">บันทึกการยอมรับข้อตกลง</div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้, เลขที่เอกสาร, ที่อยู่ IP, หรือรายละเอียด..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User Filter Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">พนักงานทุกคน ({uniqueUsers.length})</option>
              {uniqueUsers.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {/* Action Type Dropdown */}
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">กิจกรรมทั้งหมด ({uniqueActions.length})</option>
              {uniqueActions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Audit Logs Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">วัน-เวลา (Timestamp)</th>
                <th className="py-3 px-4">ผู้ใช้งาน (Actor)</th>
                <th className="py-3 px-4">กิจกรรม (Action)</th>
                <th className="py-3 px-4">เอกสารอ้างอิง</th>
                <th className="py-3 px-4">ที่อยู่ IP เครื่อง (Client IP)</th>
                <th className="py-3 px-4">อุปกรณ์ / เบราว์เซอร์</th>
                <th className="py-3 px-4">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    ไม่พบรายการประวัติที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const isLogin = log.action === 'USER_LOGIN';
                  const isPdpa = log.action === 'PDPA_CONSENT';
                  const isApprove = log.action.includes('APPROVED');
                  const isReject = log.action.includes('REJECT');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('th-TH')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{log.actorName}</div>
                        <div className="text-[10px] text-slate-400">{log.actorRole} • {log.department}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isLogin ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          isPdpa ? 'bg-teal-50 text-teal-700 border-teal-200' :
                          isApprove ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          isReject ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.docNo && log.docNo !== '-' ? (
                          <span className="font-mono text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-100">
                            {log.docNo}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs font-semibold">
                          <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{log.ipAddress || '127.0.0.1'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1 max-w-[150px] truncate" title={log.userAgent}>
                          <Laptop className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{log.userAgent || 'Web Client'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs max-w-xs leading-relaxed">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
