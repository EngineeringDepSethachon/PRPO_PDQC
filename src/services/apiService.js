import { storageService } from './storageService';
import { workflowEngine } from './workflowEngine';
import { auditService } from './auditService';
import { gasService } from './gasService';
import { PO_STATUS } from '../config/constants';

// API Service Layer for Data & Operations
export const apiService = {
  // --- Cloud Sync & GAS Connection ---
  getGasService() {
    return gasService;
  },

  async syncFromGAS() {
    const data = await gasService.pullInitialData();
    if (data) {
      storageService.loadFromGAS(data);
      return data;
    }
    return null;
  },

  async syncAllToGAS(user = null) {
    const fullState = storageService.getFullState();
    return gasService.syncAllToGAS(fullState, user);
  },

  // --- Audit Trail Operations (GAS Ready) ---
  async getAuditLogs(filters) {
    return auditService.getLogs(filters);
  },
  async exportAuditLogsToGAS(filters) {
    return auditService.exportToGASPayload(filters);
  },
  async clearAuditLogs() {
    return auditService.clearLogs();
  },
  // --- Data Getters ---
  async getProducts() {
    return storageService.getProducts();
  },
  async getVendors() {
    return storageService.getVendors();
  },
  async getStorageLocations() {
    return storageService.getStorageLocations();
  },
  async getPRs() {
    return storageService.getPRs();
  },
  async getPOs() {
    return storageService.getPOs();
  },
  async getStockLogs() {
    return storageService.getStockLogs();
  },
  async getBudgets() {
    return storageService.getBudgets();
  },
  
  async updateBudget(department, newAmount, user = null) {
    const budgets = storageService.getBudgets();
    if (!budgets[department]) budgets[department] = { monthlyBudget: 0, spent: 0, pending: 0, variance: 0, history: {} };
    
    budgets[department].monthlyBudget = newAmount;
    
    // Save to current month history to prevent changing past months
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (!budgets[department].history) budgets[department].history = {};
    budgets[department].history[currentMonth] = newAmount;

    storageService.saveBudgets(budgets);

    // Trigger GAS sync in background
    gasService.sendMutation('updateBudget', { department, amount: newAmount }, user);

    return budgets[department];
  },

  // --- Budget & Over-Budget Check ---
  calculateBudgetSummary() {
    return workflowEngine.calculateBudgetSummary();
  },


  isOverBudget(department, amount) {
    return workflowEngine.isOverBudget(department, amount);
  },

  // Helper to format PR for GAS schema
  _formatPRForGAS(pr) {
    if (!pr) return null;
    return {
      ...pr,
      prNumber: pr.prNo || pr.prNumber,
      prNo: pr.prNo || pr.prNumber,
      requester: pr.requestedBy || 'Requester',
      requesterName: pr.requestedBy || 'Requester',
      requestDate: pr.requestedDate || pr.createdAt || new Date().toISOString(),
      remarks: pr.note || '',
      memoData: pr.memo || null
    };
  },

  // --- PR Operations ---
  async createPR(prData, user, isDraft = false) {
    const newPR = await workflowEngine.createPR(prData, user, isDraft);
    // Background sync to GAS
    gasService.sendMutation('savePR', { prData: this._formatPRForGAS(newPR) }, user).catch(err => {
      console.warn('[ApiService] Background savePR to GAS failed:', err);
    });
    return newPR;
  },

  async updatePR(prId, prData, user, isDraft = false) {
    const updatedPR = await workflowEngine.updatePR(prId, prData, user, isDraft);
    gasService.sendMutation('savePR', { prData: this._formatPRForGAS(updatedPR) }, user).catch(err => {
      console.warn('[ApiService] Background savePR update to GAS failed:', err);
    });
    return updatedPR;
  },

  async submitPR(prId, user, memoData = null) {
    const res = await workflowEngine.submitPR(prId, user, memoData);
    if (res) {
      gasService.sendMutation('savePR', { prData: this._formatPRForGAS(res) }, user).catch(err => {
        console.warn('[ApiService] Background savePR submit to GAS failed:', err);
      });
    }
    return res;
  },

  async updatePRStatus(prId, nextStatus, user, note = '') {
    const res = await workflowEngine.updatePRStatus(prId, nextStatus, user, note);
    const pr = res?.pr || res;
    if (pr && (pr.prNo || pr.prNumber)) {
      gasService.sendMutation('savePR', { prData: this._formatPRForGAS(pr) }, user).catch(err => {
        console.warn('[ApiService] Background savePR status update to GAS failed:', err);
      });
    }
    return res;
  },

  async rejectPR(prId, user, reason) {
    const res = await workflowEngine.rejectPR(prId, user, reason);
    if (res && (res.prNo || res.prNumber)) {
      gasService.sendMutation('savePR', { prData: this._formatPRForGAS(res) }, user).catch(err => {
        console.warn('[ApiService] Background savePR reject to GAS failed:', err);
      });
    }
    return res;
  },

  async editPRItems(prId, items, user, reason = '') {
    const res = await workflowEngine.editPRItems(prId, items, user, reason);
    if (res && (res.prNo || res.prNumber)) {
      gasService.sendMutation('savePR', { prData: this._formatPRForGAS(res) }, user).catch(err => {
        console.warn('[ApiService] Background savePR editItems to GAS failed:', err);
      });
    }
    return res;
  },

  async cancelPR(prId, user, reason) {
    const res = await workflowEngine.cancelPR(prId, user, reason);
    if (res && (res.prNo || res.prNumber)) {
      gasService.sendMutation('savePR', { prData: this._formatPRForGAS(res) }, user).catch(err => {
        console.warn('[ApiService] Background savePR cancel to GAS failed:', err);
      });
    }
    return res;
  },

  async cancelPO(poId, user, reason) {
    return workflowEngine.cancelPO(poId, user, reason);
  },

  async acknowledgeOnlineTask(poId, vendorName, user, updatedItems = null, varianceNote = '') {
    return workflowEngine.acknowledgeOnlineTask(poId, vendorName, user, updatedItems, varianceNote);
  },

  // --- PO & Receive Goods Operations ---
  async assignVendor(poId, vendorId, customVendorName, user) {
    return workflowEngine.assignVendor(poId, vendorId, customVendorName, user);
  },

  // Generic claim filing — supports both ONLINE and SELF-BUY channels
  async fileClaim(poId, claimData, user) {
    return workflowEngine.fileClaim(poId, claimData, user);
  },
  async fileOnlineClaim(poId, claimData, user) {
    return workflowEngine.fileClaim(poId, claimData, user);
  },

  // Generic claim resolution — supports both ONLINE and SELF-BUY channels
  async resolveClaim(poId, resolution, user) {
    return workflowEngine.resolveClaim(poId, resolution, user);
  },
  async resolveOnlineClaim(poId, resolution, user) {
    return workflowEngine.resolveClaim(poId, resolution, user);
  },

  async updatePOStatus(poId, nextStatus, user, note = '') {
    return workflowEngine.updatePOStatus(poId, nextStatus, user, note);
  },

  async updateActualPrice(poId, itemIndex, actPrice, user) {
    return workflowEngine.updateActualPrice(poId, itemIndex, actPrice, user);
  },

  async closePO(poId, user, note = '') {
    return workflowEngine.closePO(poId, user, note);
  },

  // Partial or Full goods receiving — handles PARTIAL → CLOSED transitions
  async receiveGoods(poId, receivingItems, user, note = '', options = {}) {
    return workflowEngine.receiveGoods(poId, receivingItems, user, note, options);
  },

  async receiveAllGoods(poId, user, note = '', options = {}) {
    // Convenience wrapper: build receivingItems from all remaining quantities
    const pos = await this.getPOs();
    const po = pos.find(p => p.id === poId);
    if (!po) throw new Error('PO not found');
    const receivingItems = po.items.map(item => ({
      productId: item.productId,
      receivedThisTime: Number(item.orderedQty ?? item.purchaseQty ?? item.qty) - (Number(item.receivedQty) || 0)
    }));
    return workflowEngine.receiveGoods(poId, receivingItems, user, note, options);
  },

  // Short-Close PO (ปิด PO ก่อนกำหนดเมื่อได้ของไม่ครบและไม่รอของแล้ว)
  async shortClosePO(poId, reason, user) {
    return workflowEngine.shortClosePO(poId, reason, user);
  },

  // --- Quick Issue Stock (เบิกจ่าย) ---
  async quickIssueStock(productId, issueQty, user, note = '', issueUnit = '') {
    return workflowEngine.quickIssueStock(productId, issueQty, user, note, issueUnit);
  },

  // --- Master Data CRUD ---
  async saveProduct(product, user = null) {
    const products = storageService.getProducts();
    const isUpdate = Boolean(product.id);
    const targetCode = (product.code || '').trim().toUpperCase();

    if (targetCode) {
      const isDuplicate = products.some(p => p.id !== product.id && (p.code || '').trim().toUpperCase() === targetCode);
      if (isDuplicate) {
        throw new Error(`รหัสสินค้า "${targetCode}" มีอยู่ในระบบแล้ว กรุณาระบุรหัสสินค้าอื่น`);
      }
    }

    const cat = product.category || product.department || 'PD';
    product.category = cat;
    product.department = cat;

    if (product.id) {
      const idx = products.findIndex(p => p.id === product.id);
      if (idx !== -1) products[idx] = { ...products[idx], ...product };
    } else {
      product.id = `PROD-${cat}-${Date.now()}`;
      products.push(product);
    }
    storageService.saveProducts(products);

    auditService.logAction({
      action: isUpdate ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
      actor: user || 'Admin / Master Manager',
      department: product.category,
      docNo: product.code || product.id,
      docType: 'PRODUCT',
      details: `${isUpdate ? 'ปรับปรุงข้อมูลสินค้า' : 'สร้างรายการสินค้าใหม่'} "${product.name}" (${product.code}) แผนก ${product.category}`
    });

    return product;
  },

  async saveVendor(vendor, user = null) {
    const vendors = storageService.getVendors();
    const isUpdate = Boolean(vendor.id);
    const targetCode = (vendor.code || '').trim().toUpperCase();

    if (targetCode) {
      const isDuplicate = vendors.some(v => v.id !== vendor.id && (v.code || '').trim().toUpperCase() === targetCode);
      if (isDuplicate) {
        throw new Error(`รหัสผู้ขาย "${targetCode}" มีอยู่ในระบบแล้ว กรุณาระบุรหัสผู้ขายอื่น`);
      }
    }

    if (vendor.id) {
      const idx = vendors.findIndex(v => v.id === vendor.id);
      if (idx !== -1) vendors[idx] = vendor;
    } else {
      vendor.id = `VEN-${Date.now()}`;
      vendors.push(vendor);
    }
    storageService.saveVendors(vendors);

    auditService.logAction({
      action: isUpdate ? 'VENDOR_UPDATED' : 'VENDOR_CREATED',
      actor: user || 'Admin / Vendor Manager',
      department: vendor.category || 'ALL',
      docNo: vendor.code || vendor.id,
      docType: 'VENDOR',
      details: `${isUpdate ? 'ปรับปรุงข้อมูลผู้ขาย' : 'เพิ่มผู้ขายรายใหม่'} "${vendor.name}" (${vendor.code || vendor.id})`
    });

    return vendor;
  },

  async saveStorageLocation(location, user = null) {
    const locations = storageService.getStorageLocations();
    const isUpdate = Boolean(location.id);
    const targetName = (location.name || '').trim().toLowerCase();

    if (targetName) {
      const isDuplicate = locations.some(l => l.id !== location.id && (l.name || '').trim().toLowerCase() === targetName);
      if (isDuplicate) {
        throw new Error(`ชื่อจุดจัดเก็บ "${location.name}" มีอยู่ในระบบแล้ว กรุณาระบุชื่ออื่น`);
      }
    }

    const saved = storageService.saveStorageLocation(location);

    auditService.logAction({
      action: isUpdate ? 'LOCATION_UPDATED' : 'LOCATION_CREATED',
      actor: user || 'Admin / Warehouse Manager',
      department: location.department || 'ALL',
      docNo: saved.id,
      docType: 'LOCATION',
      details: `${isUpdate ? 'แก้ไขจุดจัดเก็บ' : 'เพิ่มจุดจัดเก็บใหม่'} "${saved.name}" (${saved.department || 'ALL'})`
    });

    return saved;
  },

  async deleteStorageLocation(locationId, options = {}, user = null) {
    const locations = storageService.getStorageLocations();
    const loc = locations.find(l => l.id === locationId);
    
    // storageService.deleteStorageLocation will perform integrity check & reassign/unlink
    storageService.deleteStorageLocation(locationId, options);

    if (loc) {
      auditService.logAction({
        action: 'LOCATION_DELETED',
        actor: user || 'Admin / Warehouse Manager',
        department: loc.department || 'ALL',
        docNo: loc.id,
        docType: 'LOCATION',
        details: `ลบจุดจัดเก็บสินค้า "${loc.name}" ออกจากระบบ${options.unlinkProducts ? ' (ปลดสินค้าที่ผูกอยู่ออก)' : options.reassignToLocationId ? ' (ย้ายสินค้าไปยังจุดจัดเก็บใหม่)' : ''}`
      });
    }

    return true;
  }
};
