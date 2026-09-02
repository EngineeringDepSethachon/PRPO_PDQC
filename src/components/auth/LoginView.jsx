import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import { getClientIp } from '../../utils/ipTracker';
import PdpaModal from '../common/PdpaModal';
import { 
  Factory, Lock, User, Eye, EyeOff,
  AlertCircle, ArrowRight, Lightbulb, ShieldCheck,
  Globe, Shield, CheckSquare, Square
} from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [clientIp, setClientIp] = useState('กำลังตรวจสอบ IP...');
  const [pdpaConsent, setPdpaConsent] = useState(true);
  const [showPdpaModal, setShowPdpaModal] = useState(false);

  useEffect(() => {
    getClientIp().then(ip => setClientIp(ip || '127.0.0.1 (Local)'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pdpaConsent) {
      setErrorMsg('กรุณายินยอมข้อตกลงการคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนเข้าสู่ระบบ');
      return;
    }

    setLoading(true);

    try {
      if (!username.trim() || !password) {
        throw new Error('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านให้ครบถ้วน');
      }

      const userSession = await authService.login(username.trim(), password);
      
      // Save PDPA consent confirmation
      authService.savePdpaConsent(username.trim(), userSession);

      if (onLoginSuccess) {
        onLoginSuccess(userSession);
      }
    } catch (err) {
      setErrorMsg(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans select-none">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-950/30 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 animate-zoom-in">
        
        {/* Header & Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 mb-3 ring-4 ring-indigo-500/10">
            <Factory className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            PR/PO & Inventory System
          </h1>
          <p className="text-xs text-indigo-300/80 mt-1 font-medium">
            ระบบจัดซื้อและคลังสินค้า ฝ่ายผลิต (PD) & ฝ่ายควบคุมคุณภาพ (QC)
          </p>

          {/* Client IP & Cloud Master Data Badge */}
          <div className="flex items-center justify-center gap-2 flex-wrap mt-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-[11px] font-bold shadow-inner">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Google Sheets Master</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-300 text-[11px] font-mono shadow-inner">
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>IP: {clientIp}</span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              ชื่อผู้ใช้งาน (Username หรือรหัสพนักงาน)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอก Username หรือรหัสพนักงาน"
                className="w-full bg-slate-950/80 border border-slate-700 text-slate-100 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium placeholder:text-slate-600"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full bg-slate-950/80 border border-slate-700 text-slate-100 text-sm rounded-xl pl-10 pr-11 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium placeholder:text-slate-600"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* PDPA Consent & Notice Box */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <button
                type="button"
                onClick={() => setPdpaConsent(!pdpaConsent)}
                className="mt-0.5 text-indigo-400 hover:text-indigo-300 shrink-0"
              >
                {pdpaConsent ? (
                  <CheckSquare className="w-4 h-4 text-indigo-500" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600" />
                )}
              </button>
              <span className="text-[11px] text-slate-300 leading-snug">
                ข้าพเจ้ายินยอมให้ระบบบันทึกข้อมูลส่วนบุคคล, วัน-เวลาเข้าสู่ระบบ, 
                ที่อยู่ IP เครื่อง (<span className="font-mono text-indigo-400">{clientIp}</span>) 
                และประวัติการทำรายการ<b className="text-indigo-300 font-bold">เฉพาะภายในระบบ PR/PO นี้เท่านั้น (มิได้มีการเก็บประวัติการใช้งานอื่นภายนอกระบบ)</b> เพื่อการตรวจสอบตาม <b>พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</b>
              </span>
            </label>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowPdpaModal(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
              >
                อ่านประกาศนโยบายคุ้มครองข้อมูลส่วนบุคคลฉบับเต็ม ↗
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>กำลังเข้าสู่ระบบและบันทึก Log...</span>
              </span>
            ) : (
              <>
                <span>เข้าสู่ระบบ (Sign In)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer copyright */}
      <div className="mt-6 text-center text-xs text-slate-500 relative z-10 flex items-center justify-center gap-2">
        <span>© 2026 Production & Quality Control System • PDQC Co., Ltd.</span>
        <span>•</span>
        <button
          onClick={() => setShowPdpaModal(true)}
          className="text-indigo-400 hover:underline cursor-pointer"
        >
          นโยบาย PDPA
        </button>
      </div>

      {/* PDPA Full Policy Modal */}
      <PdpaModal isOpen={showPdpaModal} onClose={() => setShowPdpaModal(false)} />
    </div>
  );
}
