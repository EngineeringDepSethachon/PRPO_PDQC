import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, FileText, CheckCircle2, Lock, Eye, Clock, Building2, ShieldAlert } from 'lucide-react';


export default function PdpaModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in print:hidden">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden text-slate-800 animate-zoom-in">
        
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-base tracking-tight">
                ประกาศนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA Privacy Notice)
              </h3>
              <p className="text-xs text-slate-500 font-normal truncate mt-0.5">
                ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 • บริษัท พีดีคิวซี จำกัด
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-600 leading-relaxed custom-scrollbar">
          
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-indigo-950 flex items-start gap-3">
            <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-indigo-900">การเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล</h4>
              <p className="text-xs text-indigo-800/90 mt-1">
                ระบบขอซื้อและคลังสินค้า (PR/PO & Inventory System) ให้ความสำคัญสูงสุดต่อการรักษาความมั่นคงปลอดภัยของข้อมูลและคุ้มครองสิทธิความเป็นส่วนตัวของผู้ใช้งานทุกคน
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>1. ข้อมูลส่วนบุคคลที่เราจัดเก็บและบันทึก</span>
            </h4>
            <p>เมื่อท่านเข้าใช้งานระบบและทำรายการต่างๆ ระบบจะทำการจัดเก็บข้อมูลดังต่อไปนี้:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-700">
              <li><b>ข้อมูลระบุตัวตนพนักงาน:</b> ชื่อ-นามสกุล, รหัสพนักงาน, แผนก, ตำแหน่งหน้าที่, และสิทธิ์การทำงาน</li>
              <li><b>ข้อมูลการเชื่อมต่อและอุปกรณ์ (Technical Data):</b> ที่อยู่ไอพี (IP Address), วันที่และเวลาที่เข้าใช้งาน, ประเภทอุปกรณ์ (Device), และเว็บเบราว์เซอร์</li>
              <li><b>ประวัติการทำรายการ (Audit Trail Logs):</b> รายละเอียดการสร้างใบขอซื้อ (PR), การอนุมัติใบสั่งซื้อ (PO), การตรวจรับสินค้าเข้าสต็อก, การเบิกจ่ายสินค้า, และการลงลายเซ็นอิเล็กทรอนิกส์</li>
            </ul>

            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-start gap-2 mt-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                <b>ขอบเขตความคุ้มครองข้อมูล:</b> ระบบจะจัดเก็บและบันทึกประวัติการเข้าสู่ระบบ วันที่-เวลา และกิจกรรม<b>เฉพาะที่เกิดขึ้นภายในระบบ PR/PO & Inventory นี้เท่านั้น</b> ทางระบบ<b>ไม่มีการเข้าถึงหรือจัดเก็บประวัติการใช้งานภายนอก เว็บไซต์อื่น หรือข้อมูลส่วนบุคคลอื่นใดในเครื่องของท่านทั้งสิ้น</b>
              </span>
            </div>
          </div>


          {/* Section 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>2. วัตถุประสงค์ในการเก็บรวบรวมและประมวลผล</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-700">
              <li>เพื่อบริหารจัดการและดำเนินงานกระบวนการขอซื้อ สั่งซื้อ และควบคุมสต็อกสินค้าอย่างถูกต้องโปร่งใส</li>
              <li>เพื่อเก็บบันทึกประวัติการปฏิบัติงาน (Audit Trail) สำหรับการตรวจสอบย้อนกลับ ป้องกันการทุจริต และยืนยันความถูกต้องของเอกสารจัดซื้อ</li>
              <li>เพื่อการรักษาความมั่นคงปลอดภัยสารสนเทศ ตรวจสอบการเข้าถึงโดยมิชอบ และระงับเหตุการณ์ผิดปกติในระบบ</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>3. ระยะเวลาในการเก็บรักษาข้อมูล</span>
            </h4>
            <p>
              ข้อมูลบันทึกประวัติการทำรายการ (Audit Logs) และประวัติการเข้าใช้งานระบบจะถูกจัดเก็บไว้เป็นระยะเวลาไม่น้อยกว่า 5-10 ปี ตามที่กฎหมายว่าด้วยการบัญชีและระเบียบปฏิบัติของบริษัทกำหนด เพื่อประโยชน์ในการตรวจสอบทางบัญชีและภาษีอากร
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>4. สิทธิของเจ้าของข้อมูลส่วนบุคคล (Data Subject Rights)</span>
            </h4>
            <p>
              ท่านมีสิทธิตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ในการขอเข้าถึง ขอรับสำเนา ตรวจสอบประวัติการใช้งาน หรือขอให้แก้ไขข้อมูลของตนเองให้ถูกต้อง โดยสามารถติดต่อผู้ดูแลระบบสารสนเทศ (System Administrator) ของบริษัทได้ตลอดเวลา
            </p>
          </div>

        </div>

        {/* Footer Action */}
        <div className="shrink-0 p-4 px-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>รับทราบและเข้าใจข้อกำหนด</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
