import { STORAGE_KEYS, ROLES } from '../config/constants.js';
import { initialProducts, initialVendors, initialStorageLocations, initialPRs, initialPOs, initialStockLogs, initialBudgets, initialCounters } from '../data/mockData.js';

const DATA_VERSION = 'prpo_clean_v13';

export const storageService = {
  // Initialize storage if empty or version mismatch
  init() {
    const currentVer = localStorage.getItem('prpo_data_version');
    if (!currentVer || currentVer !== DATA_VERSION) {
      this.resetData();
    }
  },

  // Reset data to initial defaults (Clearing mock PR/PO/Logs, Preserving Master Data)
  resetData() {
    localStorage.setItem('prpo_data_version', DATA_VERSION);
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, JSON.stringify(ROLES.REQUESTER_PD));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
    localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(initialVendors));
    localStorage.setItem(STORAGE_KEYS.STORAGE_LOCATIONS, JSON.stringify(initialStorageLocations));
    localStorage.setItem(STORAGE_KEYS.PRS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify({
      PD: { monthlyBudget: 250000, spent: 0, pending: 0, variance: 0 },
      QC: { monthlyBudget: 150000, spent: 0, pending: 0, variance: 0 }
    }));
    localStorage.setItem(STORAGE_KEYS.PR_COUNTERS, JSON.stringify({
      PD: { PR: 0, PO: 0 },
      QC: { PR: 0, PO: 0 }
    }));
    localStorage.setItem('prpo_budget_transactions', JSON.stringify([]));
    localStorage.setItem('prpo_audit_logs', JSON.stringify([]));
    localStorage.setItem('prpo_notifications', JSON.stringify([]));
    console.log('[StorageService] Operational mock data cleared. Master data and storage locations preserved.');
  },

  // Role
  getCurrentRole() {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_ROLE);
    return data ? JSON.parse(data) : ROLES.REQUESTER_PD;
  },
  setCurrentRole(role) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ROLE, JSON.stringify(role));
  },

  // Products (with Lazy Migration)
  getProducts() {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const products = data ? JSON.parse(data) : initialProducts;
    const locations = this.getStorageLocations();
    
    let needsSave = false;
    const migrated = products.map(p => {
      let item = { ...p };
      const cat = item.category || item.department || 'PD';
      if (!item.category || !item.department || item.category !== cat || item.department !== cat) {
        needsSave = true;
        item.category = cat;
        item.department = cat;
      }
      // Migrate legacy 'คู่' unit to 'ชิ้น'
      if (item.stockUnit === 'คู่' || item.unit === 'คู่' || item.code === 'PD-GLV-NBR') {
        if (item.stockUnit === 'คู่' || item.unit === 'คู่') {
          needsSave = true;
          item.stockUnit = 'ชิ้น';
          item.unit = 'ชิ้น';
          if (item.purchaseUnit === 'กล่อง (100 ชิ้น)' && (item.conversionRate === 50 || item.conversionRate === 1)) {
            item.conversionRate = 100;
          }
        }
      }
      if (!item.purchaseUnit || !item.stockUnit || item.conversionRate === undefined) {
        needsSave = true;
        const fallbackUnit = item.unit || 'ชิ้น';
        const rate = Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
        item = {
          ...item,
          purchaseUnit: item.purchaseUnit || fallbackUnit,
          stockUnit: item.stockUnit || fallbackUnit,
          conversionRate: rate,
          unit: item.stockUnit || fallbackUnit
        };
      }

      // Location migration if missing
      if (!item.locationId || !item.locationName) {
        const initMatch = initialProducts.find(ip => ip.id === item.id || ip.code === item.code);
        if (initMatch && initMatch.locationName) {
          needsSave = true;
          item.locationId = initMatch.locationId || `LOC-${item.category || 'PD'}-001`;
          item.locationName = initMatch.locationName;
        } else {
          // Default to first matching location of the department
          const defaultLoc = locations.find(l => l.department === item.category || l.department === 'ALL') || locations[0];
          if (defaultLoc) {
            needsSave = true;
            item.locationId = defaultLoc.id;
            item.locationName = defaultLoc.name;
          }
        }
      }

      return item;
    });

    if (needsSave) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(migrated));
    }
    return migrated;
  },
  saveProducts(products) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  // Storage Locations (Simple Name & Department)
  getStorageLocations() {
    const data = localStorage.getItem(STORAGE_KEYS.STORAGE_LOCATIONS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.STORAGE_LOCATIONS, JSON.stringify(initialStorageLocations));
      return initialStorageLocations;
    }
    return JSON.parse(data);
  },
  saveStorageLocations(locations) {
    localStorage.setItem(STORAGE_KEYS.STORAGE_LOCATIONS, JSON.stringify(locations));
  },
  saveStorageLocation(locationObj) {
    const locations = this.getStorageLocations();
    let updatedLoc = { ...locationObj };
    const isUpdate = Boolean(updatedLoc.id);

    if (!isUpdate) {
      const dept = updatedLoc.department || 'ALL';
      updatedLoc.id = `LOC-${dept}-${Date.now().toString().slice(-6)}`;
      locations.unshift(updatedLoc);
    } else {
      const idx = locations.findIndex(l => l.id === updatedLoc.id);
      if (idx !== -1) {
        locations[idx] = { ...locations[idx], ...updatedLoc };
      } else {
        locations.unshift(updatedLoc);
      }
    }
    this.saveStorageLocations(locations);

    // ── Cascading Sync on Update ──
    // When a location's name is edited, find and sync all products referencing this locationId
    if (isUpdate) {
      const products = this.getProducts();
      let productsNeedUpdate = false;
      const updatedProducts = products.map(p => {
        if (p.locationId === updatedLoc.id) {
          productsNeedUpdate = true;
          return {
            ...p,
            locationName: updatedLoc.name
          };
        }
        return p;
      });
      if (productsNeedUpdate) {
        this.saveProducts(updatedProducts);
      }
    }

    return updatedLoc;
  },
  deleteStorageLocation(locationId, { reassignToLocationId = null, unlinkProducts = false } = {}) {
    const products = this.getProducts();
    const locations = this.getStorageLocations();
    const assignedProducts = products.filter(p => p.locationId === locationId);

    // If products are assigned and no resolution was chosen, block and throw
    if (assignedProducts.length > 0 && !unlinkProducts && !reassignToLocationId) {
      throw new Error(`ไม่สามารถลบจุดเก็บนี้ได้ เนื่องจากมีสินค้าผูกอยู่ ${assignedProducts.length} รายการ กรุณาย้ายหรือเปลี่ยนจุดเก็บของสินค้าออกก่อน`);
    }

    // Handle product unlinking or reassignment
    if (assignedProducts.length > 0) {
      let targetLoc = null;
      if (reassignToLocationId) {
        targetLoc = locations.find(l => l.id === reassignToLocationId);
      }

      const updatedProducts = products.map(p => {
        if (p.locationId === locationId) {
          if (reassignToLocationId && targetLoc) {
            return {
              ...p,
              locationId: targetLoc.id,
              locationName: targetLoc.name
            };
          } else if (unlinkProducts) {
            return {
              ...p,
              locationId: null,
              locationName: null
            };
          }
        }
        return p;
      });

      this.saveProducts(updatedProducts);
    }

    const filtered = locations.filter(l => l.id !== locationId);
    this.saveStorageLocations(filtered);
    return true;
  },

  // Vendors
  getVendors() {
    const data = localStorage.getItem(STORAGE_KEYS.VENDORS);
    return data ? JSON.parse(data) : initialVendors;
  },
  saveVendors(vendors) {
    localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(vendors));
  },

  // PRs (with Lazy Migration)
  getPRs() {
    const data = localStorage.getItem(STORAGE_KEYS.PRS);
    const prs = data ? JSON.parse(data) : initialPRs;
    const filtered = prs.filter(pr => pr.department === 'PD' || pr.department === 'QC');
    
    let needsSave = false;
    const migrated = filtered.map(pr => {
      let itemsMigrated = false;
      const items = (pr.items || []).map(item => {
        if (!item.purchaseUnit || !item.stockUnit || item.purchaseQty === undefined || item.stockQty === undefined) {
          itemsMigrated = true;
          needsSave = true;
          const pQty = Number(item.purchaseQty ?? item.qty) || 1;
          const rate = Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
          const sQty = Number(item.stockQty) || (pQty * rate);
          const pUnit = item.purchaseUnit || item.unit || 'ชิ้น';
          const sUnit = item.stockUnit || item.unit || 'ชิ้น';
          return {
            ...item,
            purchaseQty: pQty,
            stockQty: sQty,
            qty: pQty,
            purchaseUnit: pUnit,
            stockUnit: sUnit,
            unit: pUnit,
            conversionRate: rate
          };
        }
        return item;
      });
      return itemsMigrated ? { ...pr, items } : pr;
    });

    if (needsSave) {
      localStorage.setItem(STORAGE_KEYS.PRS, JSON.stringify(migrated));
    }
    return migrated;
  },
  savePRs(prs) {
    localStorage.setItem(STORAGE_KEYS.PRS, JSON.stringify(prs));
  },

  // POs (with Lazy Migration)
  getPOs() {
    const data = localStorage.getItem(STORAGE_KEYS.POS);
    const pos = data ? JSON.parse(data) : initialPOs;
    const filtered = pos.filter(po => po.department === 'PD' || po.department === 'QC');

    let needsSave = false;
    const migrated = filtered.map(po => {
      let poUpdated = false;
      let items = po.items || [];

      // If PO has legacy VAT, reset it so it matches PR exactly
      let vat = po.vat;
      let grandTotal = po.grandTotal;
      if (vat > 0) {
        vat = 0;
        grandTotal = po.subtotal || po.totalAmount || grandTotal;
        poUpdated = true;
        needsSave = true;
      }

      items = items.map(item => {
        const needsUnitMigration = !item.purchaseUnit || !item.stockUnit || item.purchaseQty === undefined || item.stockQty === undefined;
        const needsQtyMigration = item.orderedQty === undefined || item.remainingQty === undefined;

        if (needsUnitMigration || needsQtyMigration) {
          poUpdated = true;
          needsSave = true;
          const pQty = Number(item.purchaseQty ?? item.qty) || 1;
          const rate = Number(item.conversionRate) > 0 ? Number(item.conversionRate) : 1;
          const sQty = Number(item.stockQty) || (pQty * rate);
          const pUnit = item.purchaseUnit || item.unit || 'ชิ้น';
          const sUnit = item.stockUnit || item.unit || 'ชิ้น';
          const orderedQty = item.orderedQty ?? pQty;
          const receivedQty = Number(item.receivedQty) || 0;
          return {
            ...item,
            purchaseQty: pQty,
            stockQty: sQty,
            qty: pQty,
            purchaseUnit: pUnit,
            stockUnit: sUnit,
            unit: pUnit,
            conversionRate: rate,
            orderedQty,
            receivedQty,
            remainingQty: item.remainingQty ?? (orderedQty - receivedQty),
            receivedStockQty: item.receivedStockQty ?? (receivedQty * rate)
          };
        }
        return item;
      });
      return poUpdated ? { ...po, vat, grandTotal, items } : po;
    });

    if (needsSave) {
      localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(migrated));
    }
    return migrated;
  },
  savePOs(pos) {
    localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(pos));
  },

  // Stock Logs
  getStockLogs() {
    const data = localStorage.getItem(STORAGE_KEYS.STOCK_LOGS);
    return data ? JSON.parse(data) : initialStockLogs;
  },
  saveStockLogs(logs) {
    localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(logs));
  },

  // Budgets
  getBudgets() {
    const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    const budgets = data ? JSON.parse(data) : initialBudgets;
    const sanitized = {};
    if (budgets.PD) sanitized.PD = budgets.PD;
    if (budgets.QC) sanitized.QC = budgets.QC;
    return sanitized;
  },
  saveBudgets(budgets) {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  },

  // Budget Transaction Log (Refund / Restore entries)
  getBudgetTransactions() {
    const data = localStorage.getItem(STORAGE_KEYS.BUDGET_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },
  saveBudgetTransactions(transactions) {
    localStorage.setItem(STORAGE_KEYS.BUDGET_TRANSACTIONS, JSON.stringify(transactions));
  },
  appendBudgetTransaction(tx) {
    const existing = this.getBudgetTransactions();
    existing.unshift({ ...tx, id: `BTX-${Date.now()}` }); // prepend newest first
    localStorage.setItem(STORAGE_KEYS.BUDGET_TRANSACTIONS, JSON.stringify(existing));
  },


  getPRCounters() {
    const data = localStorage.getItem(STORAGE_KEYS.PR_COUNTERS);
    return data ? JSON.parse(data) : initialCounters;
  },
  savePRCounters(counters) {
    localStorage.setItem(STORAGE_KEYS.PR_COUNTERS, JSON.stringify(counters));
  },

  // Signatures Management (Admin Managed)
  getSignatures() {
    const data = localStorage.getItem(STORAGE_KEYS.SIGNATURES);
    if (data) {
      try { return JSON.parse(data); } catch (e) { return {}; }
    }
    const defaultSignatures = {
      'ASST_MANAGER': {
        roleId: 'ASST_MANAGER',
        name: 'คุณสมชาย (Asst. Mgr)',
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M20 50 Q 50 10, 80 50 T 140 50 T 180 30" fill="none" stroke="%231e3a8a" stroke-width="3" stroke-linecap="round"/><text x="20" y="70" font-family="sans-serif" font-size="12" fill="%23475569">Somchai (Asst. Mgr)</text></svg>',
        updatedAt: '2026-08-01 09:00:00',
        updatedBy: 'Admin'
      },
      'PLANT_MANAGER': {
        roleId: 'PLANT_MANAGER',
        name: 'คุณประเสริฐ (Plant Mgr)',
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M15 45 Q 60 5, 90 45 T 150 45 T 190 25" fill="none" stroke="%230f766e" stroke-width="3" stroke-linecap="round"/><text x="20" y="70" font-family="sans-serif" font-size="12" fill="%23475569">Prasert (Plant Mgr)</text></svg>',
        updatedAt: '2026-08-01 09:00:00',
        updatedBy: 'Admin'
      },
      'REVIEWER': {
        roleId: 'REVIEWER',
        name: 'Reviewer',
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M20 50 Q 50 10, 80 50 T 140 50 T 180 30" fill="none" stroke="%231e3a8a" stroke-width="3" stroke-linecap="round"/><text x="20" y="70" font-family="sans-serif" font-size="12" fill="%23475569">Reviewer</text></svg>',
        updatedAt: '2026-08-01 09:00:00',
        updatedBy: 'Admin'
      },
      'APPROVER': {
        roleId: 'APPROVER',
        name: 'Approver',
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M15 45 Q 60 5, 90 45 T 150 45 T 190 25" fill="none" stroke="%230f766e" stroke-width="3" stroke-linecap="round"/><text x="20" y="70" font-family="sans-serif" font-size="12" fill="%23475569">Approver</text></svg>',
        updatedAt: '2026-08-01 09:00:00',
        updatedBy: 'Admin'
      },
      'ADMIN': {
        roleId: 'ADMIN',
        name: 'Admin System',
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M20 40 Q 60 10, 100 40 T 170 30" fill="none" stroke="%233730a3" stroke-width="3" stroke-linecap="round"/><text x="20" y="70" font-family="sans-serif" font-size="12" fill="%23475569">System Admin</text></svg>',
        updatedAt: '2026-08-01 09:00:00',
        updatedBy: 'Admin'
      },
      'REQUESTER_PD': {
        roleId: 'REQUESTER_PD',
        name: 'คุณวิชัย (PD)',
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M25 45 Q 65 15, 95 45 T 160 40" fill="none" stroke="%232563eb" stroke-width="3" stroke-linecap="round"/><text x="20" y="70" font-family="sans-serif" font-size="12" fill="%23475569">Wichai (PD)</text></svg>',
        updatedAt: '2026-08-01 09:00:00',
        updatedBy: 'Admin'
      },
      'REQUESTER_QC': {
        roleId: 'REQUESTER_QC',
        name: 'คุณสมหญิง (QC)',
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><path d="M20 45 Q 55 15, 85 45 T 150 40" fill="none" stroke="%23d97706" stroke-width="3" stroke-linecap="round"/><text x="20" y="70" font-family="sans-serif" font-size="12" fill="%23475569">Somying (QC)</text></svg>',
        updatedAt: '2026-08-01 09:00:00',
        updatedBy: 'Admin'
      }
    };
    localStorage.setItem(STORAGE_KEYS.SIGNATURES, JSON.stringify(defaultSignatures));
    return defaultSignatures;
  },
  saveSignatures(signatures) {
    localStorage.setItem(STORAGE_KEYS.SIGNATURES, JSON.stringify(signatures));
  },
  getSignatureByRole(userOrRoleId) {
    if (!userOrRoleId) return null;
    const sigs = this.getSignatures();
    if (typeof userOrRoleId === 'object') {
      const key = userOrRoleId.roleId || userOrRoleId.id;
      return (
        (key && sigs[key]) ||
        (key && sigs[key.toUpperCase()]) ||
        (userOrRoleId.id && sigs[userOrRoleId.id]) ||
        null
      );
    }
    return sigs[userOrRoleId] || sigs[userOrRoleId?.toUpperCase()] || null;
  },
  saveSignatureForRole(roleId, data) {
    const sigs = this.getSignatures();
    sigs[roleId] = {
      roleId,
      ...data,
      updatedAt: new Date().toLocaleString('th-TH')
    };
    this.saveSignatures(sigs);
    return sigs[roleId];
  },
  deleteSignatureForRole(roleId) {
    const sigs = this.getSignatures();
    delete sigs[roleId];
    delete sigs[roleId?.toUpperCase()];
    if (roleId === 'ASST_MANAGER') delete sigs['REVIEWER'];
    if (roleId === 'PLANT_MANAGER') delete sigs['APPROVER'];
    if (roleId === 'REVIEWER') delete sigs['ASST_MANAGER'];
    if (roleId === 'APPROVER') delete sigs['PLANT_MANAGER'];
    this.saveSignatures(sigs);
  },

  // --- GAS Sync Helpers ---
  getFullState() {
    return {
      products: this.getProducts(),
      vendors: this.getVendors(),
      storageLocations: this.getStorageLocations(),
      prs: this.getPRs(),
      pos: this.getPOs(),
      stockLogs: this.getStockLogs(),
      budgets: this.getBudgets(),
      auditLogs: JSON.parse(localStorage.getItem('prpo_audit_logs') || '[]'),
      notifications: JSON.parse(localStorage.getItem('prpo_notifications') || '[]'),
      users: JSON.parse(localStorage.getItem('prpo_registered_users') || '[]')
    };
  },

  loadFromGAS(data) {
    if (!data) return false;
    if (data.products && Array.isArray(data.products) && data.products.length > 0) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
    }
    if (data.vendors && Array.isArray(data.vendors) && data.vendors.length > 0) {
      localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(data.vendors));
    }
    if (data.storageLocations && Array.isArray(data.storageLocations) && data.storageLocations.length > 0) {
      localStorage.setItem(STORAGE_KEYS.STORAGE_LOCATIONS, JSON.stringify(data.storageLocations));
    }
    
    // Intelligent merge for PRs: NEVER wipe local PRs if GAS is empty or missing newly created local PRs
    if (data.prs && Array.isArray(data.prs)) {
      const localPRs = this.getPRs();
      if (data.prs.length === 0 && localPRs.length > 0) {
        // Keep local PRs intact when remote is empty
      } else {
        const gasPRs = data.prs.map(p => ({
          ...p,
          prNo: p.prNo || p.prNumber,
          prNumber: p.prNumber || p.prNo,
          requestedBy: p.requestedBy || p.requesterName || p.requester || 'Requester',
          requestedDate: p.requestedDate || p.createdAt || p.requestDate || ''
        }));
        const mergedPRs = [...gasPRs];
        // Preserve any local PR not yet in GAS
        localPRs.forEach(lp => {
          const exists = mergedPRs.some(gp => 
            (gp.id && gp.id === lp.id) || 
            (gp.prNo && gp.prNo === (lp.prNo || lp.prNumber)) || 
            (gp.prNumber && gp.prNumber === (lp.prNumber || lp.prNo))
          );
          if (!exists) {
            mergedPRs.unshift(lp);
          }
        });
        localStorage.setItem(STORAGE_KEYS.PRS, JSON.stringify(mergedPRs));
      }
    }

    // Intelligent merge for POs: NEVER wipe local POs if GAS is empty or missing newly created local POs
    if (data.pos && Array.isArray(data.pos)) {
      const localPOs = this.getPOs();
      if (data.pos.length === 0 && localPOs.length > 0) {
        // Keep local POs intact
      } else {
        const gasPOs = data.pos.map(p => ({
          ...p,
          poNo: p.poNo || p.poNumber,
          poNumber: p.poNumber || p.poNo
        }));
        const mergedPOs = [...gasPOs];
        localPOs.forEach(lp => {
          const exists = mergedPOs.some(gp => 
            (gp.id && gp.id === lp.id) || 
            (gp.poNo && gp.poNo === (lp.poNo || lp.poNumber)) || 
            (gp.poNumber && gp.poNumber === (lp.poNumber || lp.poNo))
          );
          if (!exists) {
            mergedPOs.unshift(lp);
          }
        });
        localStorage.setItem(STORAGE_KEYS.POS, JSON.stringify(mergedPOs));
      }
    }

    // Intelligent merge for StockLogs
    if (data.stockLogs && Array.isArray(data.stockLogs)) {
      const localLogs = this.getStockLogs();
      if (data.stockLogs.length === 0 && localLogs.length > 0) {
        // Keep local stock logs intact
      } else {
        const mergedLogs = [...data.stockLogs];
        localLogs.forEach(ll => {
          if (!mergedLogs.some(gl => gl.id === ll.id)) {
            mergedLogs.unshift(ll);
          }
        });
        localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(mergedLogs));
      }
    }

    if (data.budgets && typeof data.budgets === 'object' && Object.keys(data.budgets).length > 0) {
      localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(data.budgets));
    }
    if (data.auditLogs && Array.isArray(data.auditLogs) && data.auditLogs.length > 0) {
      localStorage.setItem('prpo_audit_logs', JSON.stringify(data.auditLogs));
    }
    if (data.notifications && Array.isArray(data.notifications) && data.notifications.length > 0) {
      localStorage.setItem('prpo_notifications', JSON.stringify(data.notifications));
    }
    if (data.users && Array.isArray(data.users) && data.users.length > 0) {
      localStorage.setItem('prpo_registered_users', JSON.stringify(data.users));
    }
    return true;
  }
};


