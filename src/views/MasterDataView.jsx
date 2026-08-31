import React, { useState, useMemo, useEffect } from 'react';
import { Database, Plus, Edit3, Trash2, ShieldAlert, Building2, Search, X, Package, Store, PenTool, MapPin, Layers, Boxes } from 'lucide-react';
import ProductCRUDModal from '../components/admin/ProductCRUDModal';
import VendorCRUDModal from '../components/admin/VendorCRUDModal';
import StorageLocationCRUDModal from '../components/admin/StorageLocationCRUDModal';
import DeleteLocationModal from '../components/admin/DeleteLocationModal';
import SignatureManagerSection from '../components/admin/SignatureManagerSection';
import { storageService } from '../services/storageService';
import { apiService } from '../services/apiService';
import { modalService } from '../services/modalService';

export default function MasterDataView({ products = [], vendors = [], currentRole, onRefresh }) {
  const [activeTab, setActiveTab] = useState('products');
  const [showProdModal, setShowProdModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [editVendor, setEditVendor] = useState(null);
  const [editLocation, setEditLocation] = useState(null);
  const [deleteLocationItem, setDeleteLocationItem] = useState(null);
  const [locsList, setLocsList] = useState(() => storageService.getStorageLocations());

  useEffect(() => {
    setLocsList(storageService.getStorageLocations());
  }, [products]);

  // Search & Dept Filter States
  const [prodSearch, setProdSearch] = useState('');
  const [prodCategoryFilter, setProdCategoryFilter] = useState(currentRole?.canViewAllDepts ? 'ALL' : currentRole?.department || 'ALL');
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorDeptFilter, setVendorDeptFilter] = useState(currentRole?.canViewAllDepts ? 'ALL' : currentRole?.department || 'ALL');
  const [locSearch, setLocSearch] = useState('');
  const [locDeptFilter, setLocDeptFilter] = useState(currentRole?.canViewAllDepts ? 'ALL' : currentRole?.department || 'ALL');

  const canSeeAll = currentRole?.canViewAllDepts;
  const myDept = currentRole?.department;
  const isAdmin = currentRole?.id === 'ADMIN' || currentRole?.roleId === 'ADMIN' || Number(currentRole?.level) >= 99;
  const canDeleteMaster = currentRole?.canDeleteMaster || currentRole?.canManageMaster || isAdmin;

  // Retrieve Storage Locations
  const storageLocations = useMemo(() => {
    return storageService.getStorageLocations();
  }, [products]); // Re-evaluate when products refresh

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesDeptRole = canSeeAll || p.category === myDept;
      const matchesCategory = prodCategoryFilter === 'ALL' || p.category === prodCategoryFilter;
      const q = prodSearch.trim().toLowerCase();
      const matchesSearch = !q || (
        p.code?.toLowerCase().includes(q) ||
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.locationName?.toLowerCase().includes(q)
      );
      return matchesDeptRole && matchesCategory && matchesSearch;
    });
  }, [products, canSeeAll, myDept, prodCategoryFilter, prodSearch]);

  // Filtered Vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchesDeptRole = canSeeAll || v.department === myDept || v.department === 'BOTH';
      const matchesDeptFilter = vendorDeptFilter === 'ALL' || v.department === vendorDeptFilter || v.department === 'BOTH';
      const q = vendorSearch.trim().toLowerCase();
      const matchesSearch = !q || (
        v.code?.toLowerCase().includes(q) ||
        v.name?.toLowerCase().includes(q) ||
        v.contactPerson?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q) ||
        v.taxId?.toLowerCase().includes(q)
      );
      return matchesDeptRole && matchesDeptFilter && matchesSearch;
    });
  }, [vendors, canSeeAll, myDept, vendorDeptFilter, vendorSearch]);

  // Filtered Storage Locations (Clean Simple by Name)
  const filteredLocations = useMemo(() => {
    return locsList.filter(l => {
      const matchesDeptRole = canSeeAll || l.department === myDept || l.department === 'ALL';
      const matchesDeptFilter = locDeptFilter === 'ALL' || l.department === locDeptFilter;
      const q = locSearch.trim().toLowerCase();
      const matchesSearch = !q || (
        l.name?.toLowerCase().includes(q)
      );
      return matchesDeptRole && matchesDeptFilter && matchesSearch;
    });
  }, [locsList, canSeeAll, myDept, locDeptFilter, locSearch]);

  // Access check
  if (!currentRole?.canManageMaster) {
    return (
      <div className="w-full my-12 text-center p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-4 animate-fade-in">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center border border-rose-100">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">ไม่มีสิทธิ์เข้าถึง (Access Restricted)</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          บทบาท <b>{currentRole?.title}</b> ไม่ได้รับอนุญาตให้จัดการ Master Data
        </p>
      </div>
    );
  }

  const handleDeleteProduct = async (prod) => {
    if (!canDeleteMaster) return;
    const confirmed = await modalService.confirm({
      title: 'ยืนยันการลบสินค้า',
      message: `ต้องการลบรายการสินค้า "${prod.name}" (${prod.code}) ออกจากระบบหรือไม่?`,
      type: 'error',
      confirmText: 'ลบสินค้า',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    const prods = storageService.getProducts().filter(p => p.id !== prod.id);
    storageService.saveProducts(prods);
    modalService.success('ลบสินค้าสำเร็จ', `ลบ "${prod.name}" เรียบร้อยแล้ว`);
    onRefresh();
  };

  const handleDeleteVendor = async (vendor) => {
    if (!canDeleteMaster) return;
    const confirmed = await modalService.confirm({
      title: 'ยืนยันการลบผู้ขาย',
      message: `ต้องการลบข้อมูลผู้จัดจำหน่าย "${vendor.name}" ออกจากระบบหรือไม่?`,
      type: 'error',
      confirmText: 'ลบผู้ขาย',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;
    const vends = storageService.getVendors().filter(v => v.id !== vendor.id);
    storageService.saveVendors(vends);
    modalService.success('ลบผู้ขายสำเร็จ', `ลบ "${vendor.name}" เรียบร้อยแล้ว`);
    onRefresh();
  };

  // ─── Requirement 1: Data Integrity Guardrail on Delete ───
  const handleDeleteLocation = async (loc) => {
    if (!canDeleteMaster) return;
    
    // Check if any product is assigned to this storage location
    const allProds = storageService.getProducts();
    const assigned = allProds.filter(p => p.locationId === loc.id);
    
    if (assigned.length > 0) {
      return modalService.warning(
        'ไม่สามารถลบจุดเก็บนี้ได้',
        `เนื่องจากมีสินค้าผูกอยู่ ${assigned.length} รายการ กรุณาย้ายหรือเปลี่ยนจุดเก็บของสินค้าออกก่อน`
      );
    }

    const confirmed = await modalService.confirm({
      title: 'ยืนยันการลบจุดจัดเก็บ',
      message: `ต้องการลบจุดจัดเก็บสินค้า "${loc.name}" ออกจากระบบหรือไม่?`,
      type: 'error',
      confirmText: 'ลบจุดจัดเก็บ',
      cancelText: 'ยกเลิก'
    });
    if (!confirmed) return;

    try {
      await apiService.deleteStorageLocation(loc.id, currentRole?.name);
      modalService.success('ลบจุดจัดเก็บสำเร็จ', `ลบ "${loc.name}" เรียบร้อยแล้ว`);
      onRefresh();
    } catch (err) {
      modalService.error('เกิดข้อผิดพลาด', err.message);
    }
  };

  const deptBadge = (dept) => {
    if (!dept) return null;
    const colors = {
      PD: 'bg-blue-50 text-blue-700 border-blue-200/80',
      QC: 'bg-amber-50 text-amber-700 border-amber-200/80',
      BOTH: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      ALL: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[dept] || 'bg-slate-100 text-slate-600'}`}>
        {dept === 'BOTH' || dept === 'ALL' ? 'ส่วนกลาง (ALL)' : dept}
      </span>
    );
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5 tracking-tight">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs">
                <Database className="w-5 h-5" />
              </div>
              <span>จัดการข้อมูลหลัก (Master Data)</span>
            </h2>
            {!canSeeAll && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                <Building2 className="w-4 h-4" />
                แผนก {myDept}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            {canSeeAll
              ? 'จัดการและค้นหารายการสินค้า ข้อมูลผู้ขาย (Vendor) จุดจัดเก็บสินค้าในคลัง และระบบลายเซ็นอิเล็กทรอนิกส์'
              : `สิทธิ์เฉพาะแผนก ${myDept} — เพิ่ม/แก้ไขข้อมูลสินค้า จุดจัดเก็บ และ Vendor ของคุณ`}
          </p>
        </div>

        {/* Primary Action Button in Header */}
        <div className="flex items-center gap-2.5">
          {activeTab === 'products' ? (
            <button
              onClick={() => { setEditProd(null); setShowProdModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มสินค้าใหม่</span>
            </button>
          ) : activeTab === 'vendors' ? (
            <button
              onClick={() => { setEditVendor(null); setShowVendorModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มผู้ขายใหม่</span>
            </button>
          ) : activeTab === 'locations' ? (
            <button
              onClick={() => { setEditLocation(null); setShowLocationModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มจุดจัดเก็บใหม่</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-2xs overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'products'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Package className="w-4 h-4 text-indigo-600" />
          <span>แคตตาล็อกสินค้า ({filteredProducts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'vendors'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Store className="w-4 h-4 text-emerald-600" />
          <span>รายชื่อผู้ขาย / ร้านค้า ({filteredVendors.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'locations'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <MapPin className="w-4 h-4 text-violet-600" />
          <span>จุดจัดเก็บสินค้า ({filteredLocations.length})</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('signatures')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'signatures'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <PenTool className="w-4 h-4 text-amber-600" />
            <span>จัดการลายเซ็นอิเล็กทรอนิกส์</span>
          </button>
        )}
      </div>

      {/* Tab 1: Products */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {canSeeAll && (
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0">
                {['ALL', 'PD', 'QC'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setProdCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      prodCategoryFilter === cat
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'ALL' ? 'ทุกแผนก' : cat === 'PD' ? 'ฝ่ายผลิต (PD)' : 'ฝ่าย QC'}
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 sm:w-80 ml-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหารหัส, ชื่อสินค้า, จุดเก็บ หรือโซน..."
                value={prodSearch}
                onChange={e => setProdSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {prodSearch && (
                <button onClick={() => setProdSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-0.5">✕</button>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[580px] custom-scrollbar">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/90 shadow-2xs border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 pl-6">รหัสสินค้า</th>
                    <th className="py-3.5 px-4 w-1/3">ชื่อสินค้า / สเปก & จุดจัดเก็บ</th>
                    <th className="py-3.5 px-4">แผนก</th>
                    <th className="py-3.5 px-4 text-right">ราคาต่อหน่วย</th>
                    <th className="py-3.5 px-4 text-right">สต็อกคงเหลือ</th>
                    <th className="py-3.5 px-4 text-right">จุดสั่งซื้อ (ROP)</th>
                    <th className="py-3.5 pr-6 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-6 font-mono font-bold text-slate-800 text-xs">{p.code}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50/80 text-indigo-700 border border-indigo-100">
                            <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{p.locationName || 'ไม่ระบุจุดจัดเก็บ'}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">{deptBadge(p.category)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        ฿{p.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-700 tabular-nums">
                        {p.stockBalance || 0} <span className="text-xs text-slate-400 font-sans">{p.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 tabular-nums">
                        {p.reorderPoint || 0} <span className="text-xs text-slate-400 font-sans">{p.unit}</span>
                      </td>
                      <td className="py-3.5 pr-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setEditProd(p); setShowProdModal(true); }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขสินค้า"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {canDeleteMaster && (
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="ลบสินค้า"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Vendors */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {canSeeAll && (
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0">
                {['ALL', 'PD', 'QC'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setVendorDeptFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      vendorDeptFilter === cat
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'ALL' ? 'ทุกแผนก' : cat === 'PD' ? 'ฝ่ายผลิต (PD)' : 'ฝ่าย QC'}
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 sm:w-80 ml-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้ขาย, เบอร์โทร, เลขภาษี..."
                value={vendorSearch}
                onChange={e => setVendorSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {vendorSearch && (
                <button onClick={() => setVendorSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-0.5">✕</button>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[580px] custom-scrollbar">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/90 shadow-2xs border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 pl-6">รหัสผู้ขาย</th>
                    <th className="py-3.5 px-4 w-1/3">ชื่อบริษัท / ร้านค้า</th>
                    <th className="py-3.5 px-4">ผู้ติดต่อ</th>
                    <th className="py-3.5 px-4">เบอร์โทรศัพท์</th>
                    <th className="py-3.5 px-4">แผนก</th>
                    <th className="py-3.5 pr-6 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVendors.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-6 font-mono font-bold text-slate-800 text-xs">{v.code}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{v.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{v.contactPerson || '-'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{v.phone || '-'}</td>
                      <td className="py-3.5 px-4">{deptBadge(v.department)}</td>
                      <td className="py-3.5 pr-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setEditVendor(v); setShowVendorModal(true); }}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไขข้อมูลผู้ขาย"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {canDeleteMaster && (
                            <button
                              onClick={() => handleDeleteVendor(v)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="ลบผู้ขาย"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Storage Locations */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {canSeeAll && (
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0">
                {['ALL', 'PD', 'QC'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setLocDeptFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      locDeptFilter === cat
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat === 'ALL' ? 'ทุกแผนก' : cat === 'PD' ? 'ฝ่ายผลิต (PD)' : 'ฝ่าย QC'}
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex-1 sm:w-80 ml-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อจุดจัดเก็บสินค้า..."
                value={locSearch}
                onChange={e => setLocSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {locSearch && (
                <button onClick={() => setLocSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-0.5">✕</button>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[580px] custom-scrollbar">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/90 shadow-2xs border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 pl-6 w-16">ลำดับ</th>
                    <th className="py-3.5 px-4 w-1/2">ชื่อจุดจัดเก็บสินค้า</th>
                    <th className="py-3.5 px-4">แผนกที่ใช้งาน</th>
                    <th className="py-3.5 px-4 text-center">จำนวนสินค้าที่จัดเก็บ</th>
                    <th className="py-3.5 pr-6 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLocations.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">
                        ไม่พบข้อมูลจุดจัดเก็บสินค้าตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredLocations.map((loc, idx) => {
                      const assignedProducts = products.filter(p => p.locationId === loc.id);
                      return (
                        <tr key={loc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 pl-6 font-mono font-bold text-slate-400 text-xs whitespace-nowrap">
                            #{idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80 flex items-center justify-center shrink-0 shadow-2xs">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-slate-900 text-sm">{loc.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">{deptBadge(loc.department)}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border tabular-nums ${
                              assignedProducts.length > 0
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              <Boxes className="w-3.5 h-3.5" />
                              <span>{assignedProducts.length} รายการ</span>
                            </span>
                          </td>
                          <td className="py-3.5 pr-6 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => { setEditLocation(loc); setShowLocationModal(true); }}
                                className="p-2 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
                                title="แก้ไขจุดจัดเก็บ"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {canDeleteMaster && (
                                <button
                                  onClick={() => setDeleteLocationItem(loc)}
                                  className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                                  title="ลบจุดจัดเก็บ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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
      )}

      {/* Tab 4: Signatures (Admin Only) */}
      {activeTab === 'signatures' && isAdmin && (
        <SignatureManagerSection currentRole={currentRole} onRefresh={onRefresh} />
      )}

      {/* Modals */}
      {showProdModal && (
        <ProductCRUDModal
          editProd={editProd}
          product={editProd}
          products={products}
          vendors={vendors}
          storageLocations={locsList}
          currentRole={currentRole}
          onClose={() => { setShowProdModal(false); setEditProd(null); }}
          onRefresh={onRefresh}
        />
      )}

      {showVendorModal && (
        <VendorCRUDModal
          editVendor={editVendor}
          vendor={editVendor}
          vendors={vendors}
          currentRole={currentRole}
          onClose={() => { setShowVendorModal(false); setEditVendor(null); }}
          onRefresh={onRefresh}
        />
      )}

      {showLocationModal && (
        <StorageLocationCRUDModal
          editLocation={editLocation}
          location={editLocation}
          storageLocations={locsList}
          currentRole={currentRole}
          onClose={() => { setShowLocationModal(false); setEditLocation(null); }}
          onSaved={(saved) => {
            setLocsList(prev => prev.map(l => l.id === saved.id ? saved : l));
            if (onRefresh) onRefresh();
          }}
          onCreated={(created) => {
            setLocsList(prev => [created, ...prev.filter(l => l.id !== created.id)]);
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {deleteLocationItem && (
        <DeleteLocationModal
          location={deleteLocationItem}
          products={products}
          storageLocations={locsList}
          currentRole={currentRole}
          onClose={() => setDeleteLocationItem(null)}
          onDeleted={(deletedId) => {
            setLocsList(prev => prev.filter(l => l.id !== deletedId));
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
