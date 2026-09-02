import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  UserCheck, Shield, X, LogOut, CheckCircle2, User, Check, 
  Globe, Clock, Laptop, ShieldCheck, History, FileText, ChevronRight
} from 'lucide-react';
import { auditService } from '../../services/auditService';
import { getClientIpSync, getClientDeviceInfo } from '../../utils/ipTracker';
import PdpaModal from './PdpaModal';

export default function UserProfileModal({ isOpen, onClose, currentRole, onLogout }) {
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'history'
  const [showPdpaModal, setShowPdpaModal] = useState(false);

  // User's own activity logs with IP addresses
  const userLogs = useMemo(() => {
    if (!currentRole) return [];
    return auditService.getUserHistory(currentRole.username || currentRole.name);
  }, [currentRole, isOpen]);

  if (!isOpen || !currentRole) return null;

  const currentIp = currentRole.lastLoginIp || getClientIpSync();
  const currentDevice = currentRole.deviceInfo || getClientDeviceInfo();

  const deptColor = currentRole.department === 'QC'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : currentRole.department === 'ALL'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:hidden">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden text-slate-800 animate-zoom-in">
        
        {/* ── 1. Fixed Header (Sticky Top / Non-scrollable) ── */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 flex items-center justify-center shadow-2xs shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-base tracking-tight">
                ข้อมูลผู้ใช้งานและประวัติกิจกรรม (Profile & History)
              </h3>
              <p className="text-xs text-slate-500 font-normal truncate mt-0.5">
                สิทธิ์การทำงาน, ที่อยู่ IP, และบันทึกประวัติการเข้าใช้งานตาม PDPA
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="shrink-0 px-6 pt-3 bg-slate-50/50 border-b border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>ข้อมูลสิทธิ์ & อุปกรณ์</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>ประวัติกิจกรรมของฉัน & บันทึก IP ({userLogs.length})</span>
          </button>
        </div>

        {/* ── 2. Scrollable Content Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 custom-scrollbar bg-slate-50/30">
          
          {/* TAB 1: User Profile & Security Info */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fade-in">
              {/* User Info Card */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                {currentRole.pictureUrl ? (
                  <img
                    src={currentRole.pictureUrl}
                    alt="Profile"
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl border-2 border-indigo-300 shrink-0">
                    {currentRole.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-base truncate">{currentRole.name}</h4>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${deptColor}`}>
                      {currentRole.department}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    ตำแหน่ง: <span className="font-bold text-slate-800">{currentRole.title}</span>
                  </p>
                  {currentRole.username && (
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Username: @{currentRole.username} • รหัส: {currentRole.employeeId || 'EMP-SYS'}
                    </p>
                  )}
                </div>
              </div>

              {/* IP Address & Technical Security Card */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                    <Globe className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>ข้อมูลการเชื่อมต่อและที่อยู่ IP (Network & Device)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-semibold">
                    บันทึกตาม PDPA
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <div className="text-[10px] text-slate-400 font-medium">ที่อยู่ IP ล่าสุด:</div>
                    <div className="font-mono font-bold text-sm text-emerald-400 mt-0.5">
                      {currentIp}
                    </div>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <div className="text-[10px] text-slate-400 font-medium">อุปกรณ์ / เบราว์เซอร์:</div>
                    <div className="font-medium text-slate-200 truncate mt-0.5">
                      {currentDevice}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-indigo-200/90">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>สถานะ PDPA: ยินยอมแล้ว</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPdpaModal(true)}
                    className="underline text-indigo-300 hover:text-white cursor-pointer"
                  >
                    ดูประกาศ PDPA ฉบับเต็ม ↗
                  </button>
                </div>
              </div>

              {/* Permissions Matrix Box */}
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-2.5 text-xs shadow-xs">
                <p className="font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>สิทธิ์การเข้าถึงและการดำเนินงาน:</span>
                </p>
                <ul className="space-y-2 text-slate-600 text-xs pt-1">
                  <li className="flex items-center justify-between">
                    <span>สร้างใบขอซื้อ (PR):</span>
                    <span className={`font-semibold inline-flex items-center gap-1 ${currentRole.canCreatePR ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {currentRole.canCreatePR ? <><Check className="w-3.5 h-3.5" /> มีสิทธิ์</> : <><X className="w-3.5 h-3.5" /> ไม่มีสิทธิ์</>}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>ตรวจทาน PR (Reviewer Level 1):</span>
                    <span className={`font-semibold inline-flex items-center gap-1 ${currentRole.canReview ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {currentRole.canReview ? <><Check className="w-3.5 h-3.5" /> มีสิทธิ์</> : <><X className="w-3.5 h-3.5" /> ไม่มีสิทธิ์</>}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>อนุมัติสั่งซื้อ (Final Approver):</span>
                    <span className={`font-semibold inline-flex items-center gap-1 ${currentRole.canFinalApprove ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {currentRole.canFinalApprove ? <><Check className="w-3.5 h-3.5" /> มีสิทธิ์</> : <><X className="w-3.5 h-3.5" /> ไม่มีสิทธิ์</>}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>ดูภาพรวมงบประมาณ (Budget):</span>
                    <span className={`font-semibold inline-flex items-center gap-1 ${currentRole.canViewBudgetMenu ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {currentRole.canViewBudgetMenu ? <><Check className="w-3.5 h-3.5" /> มีสิทธิ์</> : <><X className="w-3.5 h-3.5" /> ซ่อน</>}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>จัดการ Master Data:</span>
                    <span className={`font-semibold inline-flex items-center gap-1 ${currentRole.canManageMaster ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {currentRole.canManageMaster ? <><Check className="w-3.5 h-3.5" /> มีสิทธิ์</> : <><X className="w-3.5 h-3.5" /> ไม่มีสิทธิ์</>}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: User Activity History & IP Logs */}
          {activeTab === 'history' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700">
                  รายการประวัติการเข้าใช้งานและการทำรายการ ({userLogs.length} รายการ):
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  บันทึก IP ล่าสุด
                </span>
              </div>

              {userLogs.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
                  ยังไม่มีประวัติกิจกรรมที่บันทึกไว้ในรอบนี้
                </div>
              ) : (
                <div className="space-y-2">
                  {userLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-indigo-200 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            log.action === 'USER_LOGIN' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            log.action === 'PDPA_CONSENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            log.action.includes('APPROVED') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            log.action.includes('REJECT') ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {log.action}
                          </span>
                          {log.docNo && log.docNo !== '-' && (
                            <span className="font-mono text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded text-[11px]">
                              {log.docNo}
                            </span>
                          )}
                        </div>

                        {/* IP Badge */}
                        <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{log.ipAddress || currentIp}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {log.details}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(log.timestamp).toLocaleString('th-TH')}</span>
                        </span>
                        {log.userAgent && (
                          <span className="truncate max-w-[200px]">
                            {log.userAgent}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── 3. Sticky Action Footer (Non-scrollable) ── */}
        <div className="shrink-0 px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3 sticky bottom-0 z-20">
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          ) : <span />}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer"
          >
            ปิด
          </button>
        </div>

      </div>

      {/* PDPA Full Modal */}
      <PdpaModal isOpen={showPdpaModal} onClose={() => setShowPdpaModal(false)} />
    </div>,
    document.body
  );
}
