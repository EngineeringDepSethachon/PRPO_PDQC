import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  CloudAlert, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Key, 
  Database, 
  UploadCloud, 
  DownloadCloud, 
  X, 
  Copy, 
  ShieldCheck 
} from 'lucide-react';
import { gasService } from '../../services/gasService';
import { storageService } from '../../services/storageService';
import Portal from './Portal';


export default function CloudSyncModal({ isOpen, onClose, onDataSynced }) {
  const [gasUrl, setGasUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncStatus, setSyncStatus] = useState(gasService.getSyncStatus());
  const [lastSyncTime, setLastSyncTime] = useState(gasService.getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGasUrl(gasService.getGasUrl());
      setSyncStatus(gasService.getSyncStatus());
      setLastSyncTime(gasService.getLastSyncTime());
      setTestResult(null);
      setActionFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveUrl = () => {
    gasService.setGasUrl(gasUrl);
    setSyncStatus(gasService.getSyncStatus());
    setActionFeedback({
      type: 'success',
      message: gasUrl.trim() ? 'บันทึก URL เรียบร้อยแล้ว' : 'ล้างการตั้งค่า URL แล้ว (ใช้โหมด LocalStorage)'
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setActionFeedback(null);
    try {
      const result = await gasService.testConnection(gasUrl);
      setTestResult({
        success: true,
        message: result.message || 'เชื่อมต่อกับ Google Apps Script สำเร็จ!',
        data: result
      });
      gasService.setGasUrl(gasUrl);
      setSyncStatus('CONNECTED');
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message
      });
      setSyncStatus('ERROR');
    } finally {
      setIsTesting(false);
    }
  };

  const handlePullData = async () => {
    if (!gasUrl.trim()) {
      setActionFeedback({ type: 'error', message: 'กรุณากรอก Web App URL ก่อนซิงค์ข้อมูล' });
      return;
    }
    setIsSyncing(true);
    setActionFeedback(null);
    try {
      gasService.setGasUrl(gasUrl);
      const data = await gasService.pullInitialData();
      if (data) {
        if (onDataSynced) await onDataSynced();
        setLastSyncTime(gasService.getLastSyncTime());
        setSyncStatus('CONNECTED');
        setActionFeedback({
          type: 'success',
          message: 'ดึงข้อมูลล่าสุดจาก Google Sheets สำเร็จเรียบร้อยแล้ว!'
        });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `ดึงข้อมูลไม่สำเร็จ: ${err.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushAllData = async () => {
    if (!gasUrl.trim()) {
      setActionFeedback({ type: 'error', message: 'กรุณากรอก Web App URL ก่อนสำรองข้อมูล' });
      return;
    }
    if (!window.confirm('คุณต้องการส่งข้อมูลทั้งหมดในเครื่องขึ้นไปทับใน Google Sheets หรือไม่?')) {
      return;
    }
    setIsSyncing(true);
    setActionFeedback(null);
    try {
      gasService.setGasUrl(gasUrl);
      const fullState = storageService.getFullState();
      await gasService.syncAllToGAS(fullState, { name: 'Admin/System' });
      setLastSyncTime(gasService.getLastSyncTime());
      setSyncStatus('CONNECTED');
      setActionFeedback({
        type: 'success',
        message: 'ส่งและสำรองข้อมูลทั้งหมดขึ้น Google Sheets สำเร็จแล้ว!'
      });
    } catch (err) {

      setActionFeedback({
        type: 'error',
        message: `ส่งข้อมูลไม่สำเร็จ: ${err.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">เชื่อมต่อ Google Sheets & Apps Script</h3>
                <p className="text-xs text-slate-300">ระบบคลาวด์ฐานข้อมูลกลาง (Google Workspace Backend)</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 text-sm">
            
            {/* Status Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              syncStatus === 'CONNECTED'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : syncStatus === 'ERROR'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : syncStatus === 'SYNCING'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full animate-pulse bg-current"></div>
                <div>
                  <div className="font-bold">
                    {syncStatus === 'CONNECTED' && '🟢 เชื่อมต่อกับ Google Sheets เรียบร้อย (Live Cloud)'}
                    {syncStatus === 'ERROR' && '🔴 การเชื่อมต่อมีปัญหา (โปรดตรวจเช็ค URL หรือสิทธิ์)'}
                    {syncStatus === 'SYNCING' && '🔄 กำลังซิงค์ข้อมูลกับ Google Sheets...'}
                    {syncStatus === 'OFFLINE' && '🟡 โหมดออฟไลน์ / LocalStorage (ยังไม่ได้เชื่อมต่อ)'}
                  </div>
                  {lastSyncTime && (
                    <p className="text-xs opacity-80 mt-0.5">
                      ซิงค์ล่าสุด: {new Date(lastSyncTime).toLocaleString('th-TH')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Input URL */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-900 text-xs flex items-center justify-between">
                <span>Google Apps Script Web App URL</span>
                <span className="text-slate-400 font-normal text-[11px]">ลงท้ายด้วย <code>/exec</code></span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={gasUrl}
                  onChange={(e) => setGasUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  onClick={handleSaveUrl}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-700 active:scale-95 transition-all shadow-xs"
                >
                  บันทึก
                </button>
              </div>
            </div>

            {/* Action Buttons: Test, Pull, Push */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !gasUrl.trim()}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : ''}`} />
                <span>{isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
              </button>

              <button
                onClick={handlePullData}
                disabled={isSyncing || !gasUrl.trim()}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95 shadow-sm"
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูล (Pull Data)'}</span>
              </button>

              <button
                onClick={handlePushAllData}
                disabled={isSyncing || !gasUrl.trim()}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>สำรองขึ้นชีต (Push All)</span>
              </button>
            </div>

            {/* Action Feedback Message */}
            {actionFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                actionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {actionFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{actionFeedback.message}</span>
              </div>
            )}

            {/* Test Result Box */}
            {testResult && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {testResult.success ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{testResult.message}</span>
                </div>
                {testResult.data && testResult.data.spreadsheetName && (
                  <p className="text-[11px] text-emerald-700">
                    เชื่อมต่อกับสเปรดชีต: <strong>{testResult.data.spreadsheetName}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Quick Setup Guide Accordion/Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>ขั้นตอนการติดตั้ง Backend สรุปย่อ:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                <li>เปิด Google Sheets ใหม่ที่ <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-600 font-medium underline inline-flex items-center gap-0.5">sheets.new <ExternalLink className="w-2.5 h-2.5" /></a></li>
                <li>ไปที่ <strong>ส่วนขยาย (Extensions)</strong> &gt; <strong>Apps Script</strong></li>
                <li>นำโค้ดจากไฟล์ <code>gas/Code.gs</code> ไปวาง และรันฟังก์ชัน <code>setupInitialDatabase()</code> 1 ครั้ง</li>
                <li>กด <strong>การทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้ใหม่ (New deployment)</strong> เลือก Web app (Who has access: <strong>Anyone</strong>)</li>
                <li>นำ Web App URL ที่ได้มาวางในช่องด้านบนนี้แล้วกด <strong>บันทึก</strong></li>
              </ol>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {gasUrl.trim() ? 'ระบบพร้อมซิงค์ข้อมูลอัตโนมัติ' : 'ทำงานในโหมดจัดเก็บชั่วคราว'}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
            >
              เสร็จสิ้น
            </button>
          </div>

        </div>
      </div>
    </Portal>
  );
}
