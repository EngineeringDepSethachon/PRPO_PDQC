import { resolveUserPermissions, ROLES } from '../config/constants';
import { gasService } from './gasService';
import { auditService } from './auditService';
import { getClientIpSync, getClientDeviceInfo } from '../utils/ipTracker';

const AUTH_SESSION_KEY = 'prpo_auth_session';
const REGISTERED_USERS_KEY = 'prpo_registered_users';



// Pre-configured Employee Accounts categorized by Position for Localhost Testing
export const DEFAULT_EMPLOYEE_ACCOUNTS = [
  {
    id: 'USR-0001',
    employeeId: 'EMP-PD-001',
    username: 'wichai.pd',
    password: 'password123',
    name: 'คุณวิชัย (PD)',
    employeeName: 'คุณวิชัย สุขใจ',
    displayName: 'Wichai (PD)',
    department: 'PD',
    roleId: 'REQUESTER_PD',
    positionKey: 'REQUESTER_PD',
    title: 'Requester (PD)',
    level: 1,
    status: 'ACTIVE',
    pictureUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    description: 'สร้าง/ส่ง PR ฝ่ายผลิต, เบิกจ่ายสินค้า, ตรวจรับของเข้าสต็อก'
  },
  {
    id: 'USR-0002',
    employeeId: 'EMP-QC-001',
    username: 'somying.qc',
    password: 'password123',
    name: 'คุณสมหญิง (QC)',
    employeeName: 'คุณสมหญิง รักดี',
    displayName: 'Somying (QC)',
    department: 'QC',
    roleId: 'REQUESTER_QC',
    positionKey: 'REQUESTER_QC',
    title: 'Requester (QC)',
    level: 1,
    status: 'ACTIVE',
    pictureUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    description: 'สร้าง/ส่ง PR ฝ่าย QC/Lab, เบิกจ่ายสารเคมี, ตรวจรับของ'
  },
  {
    id: 'USR-0003',
    employeeId: 'EMP-MGR-001',
    username: 'somchai.am',
    password: 'password123',
    name: 'คุณสมชาย (Asst. Mgr)',
    employeeName: 'คุณสมชาย มุ่งมั่น',
    displayName: 'Somchai (Asst Mgr)',
    department: 'ALL',
    roleId: 'ASST_MANAGER',
    positionKey: 'REVIEWER',
    title: 'Assistant Manager',
    level: 2,
    status: 'ACTIVE',
    pictureUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    description: 'ตรวจทาน PR (Level 1 Reviewer), ดูงบประมาณทุกแผนก'
  },
  {
    id: 'USR-0004',
    employeeId: 'EMP-PUR-001',
    username: 'nat.on',
    password: 'password123',
    name: 'คุณนัท (Online Purchaser)',
    employeeName: 'คุณนัท จัดซื้อ',
    displayName: 'Nat (Online)',
    department: 'ALL',
    roleId: 'ONLINE_PURCHASER',
    positionKey: 'ONLINE_PURCHASER',
    title: 'Online Purchaser (คุณนัท)',
    level: 2,
    status: 'ACTIVE',
    pictureUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    description: 'จัดการสั่งซื้อออนไลน์ Shopee/Lazada, บันทึกราคาจริง'
  },
  {
    id: 'USR-0005',
    employeeId: 'EMP-MGR-002',
    username: 'prasert.pm',
    password: 'password123',
    name: 'คุณประเสริฐ (Plant Mgr)',
    employeeName: 'คุณประเสริฐ ยิ่งยง',
    displayName: 'Prasert (Plant Mgr)',
    department: 'ALL',
    roleId: 'PLANT_MANAGER',
    positionKey: 'APPROVER',
    title: 'Plant Manager',
    level: 3,
    status: 'ACTIVE',
    pictureUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    description: 'อนุมัติสั่งซื้อ (Final Approver), ออก PO อัตโนมัติ, คุมงบประมาณ'
  },
  {
    id: 'USR-0006',
    employeeId: 'EMP-SYS-999',
    username: 'admin',
    password: 'admin123',
    name: 'Admin System',
    displayName: 'Admin',
    department: 'ALL',
    roleId: 'ADMIN',
    positionKey: 'ADMIN',
    title: 'System Administrator',
    level: 99,
    status: 'ACTIVE',
    pictureUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    description: 'ผู้ดูแลระบบ สิทธิ์สูงสุดในการจัดการข้อมูลทุกส่วน'
  }
];

export const authService = {
  // Get all registered accounts
  getRegisteredUsers() {
    try {
      const data = localStorage.getItem(REGISTERED_USERS_KEY);
      return data ? JSON.parse(data) : DEFAULT_EMPLOYEE_ACCOUNTS;
    } catch {
      return DEFAULT_EMPLOYEE_ACCOUNTS;
    }
  },

  saveRegisteredUsers(users) {
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  },

  // Get active session
  getCurrentSession() {
    try {
      const data = localStorage.getItem(AUTH_SESSION_KEY);
      if (data) {
        const session = JSON.parse(data);
        // Enrich with fresh role permissions dynamically based on role/level
        const rolePermissions = resolveUserPermissions(session);
        return {
          ...session,
          ...rolePermissions,
          role: rolePermissions
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  getCurrentUser() {
    return this.getCurrentSession();
  },


  // Authenticate user with Username / Password
  async login(username, password, _optionalLegacyUid = null) {
    const cleanUser = (username || '').trim().toLowerCase();
    const clientIp = getClientIpSync();
    const deviceInfo = getClientDeviceInfo();

    // 1. Try Authenticating via Google Apps Script Web App (if configured)
    if (gasService.isConfigured()) {
      try {
        const gasUser = await gasService.login(cleanUser, password);
        if (gasUser) {
          const rolePermissions = resolveUserPermissions(gasUser);
          const sessionData = {
            id: gasUser.id,
            username: gasUser.username,
            employeeId: gasUser.employeeId,
            name: gasUser.name || gasUser.employeeName,
            employeeName: gasUser.employeeName || gasUser.name,
            displayName: gasUser.displayName || gasUser.name,
            department: gasUser.department || 'ALL',
            roleId: gasUser.roleId,
            positionKey: gasUser.positionKey || gasUser.roleId,
            title: gasUser.title,
            level: Number(gasUser.level) || 1,
            pictureUrl: gasUser.pictureUrl || '',
            lastLogin: new Date().toISOString(),
            lastLoginIp: clientIp,
            deviceInfo: deviceInfo,
            pdpaConsentAt: gasUser.pdpaConsentAt || new Date().toISOString(),
            authSource: 'GOOGLE_SHEETS'
          };

          localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));

          // Also update local registered users cache
          const localUsers = this.getRegisteredUsers();
          const existingIdx = localUsers.findIndex(u => u.username?.toLowerCase() === cleanUser);
          if (existingIdx !== -1) {
            localUsers[existingIdx] = { ...localUsers[existingIdx], ...gasUser, password, lastLoginIp: clientIp, lastLoginAt: sessionData.lastLogin };
          } else {
            localUsers.push({ ...gasUser, password, lastLoginIp: clientIp, lastLoginAt: sessionData.lastLogin });
          }
          this.saveRegisteredUsers(localUsers);

          // Write to local audit trail with IP address
          auditService.logAction({
            action: 'USER_LOGIN',
            actor: sessionData,
            department: sessionData.department,
            docNo: sessionData.employeeId || sessionData.username,
            docType: 'SYSTEM',
            details: `เข้าสู่ระบบสำเร็จ (${sessionData.username}) ผ่าน Google Sheets Master [IP: ${clientIp}]`,
            ipAddress: clientIp,
            userAgent: deviceInfo
          });

          return {
            ...rolePermissions,
            ...sessionData,
            role: rolePermissions
          };
        }
      } catch (err) {
        // If authentication error returned from GAS (wrong password, account inactive), throw directly
        if (err.message && (err.message.includes('รหัสผ่าน') || err.message.includes('ชื่อผู้ใช้งาน') || err.message.includes('ระงับ'))) {
          throw err;
        }
        console.warn('[AuthService] GAS login failed or timed out, falling back to local cache:', err);
      }
    }

    // 2. Fallback to Local Master Data cache
    const users = this.getRegisteredUsers();
    const matched = users.find(u => 
      (u.username?.toLowerCase() === cleanUser || u.employeeId?.toLowerCase() === cleanUser) && 
      u.password === password
    );

    if (!matched) {
      throw new Error('ชื่อผู้ใช้งาน (Username) หรือรหัสผ่าน (Password) ไม่ถูกต้อง');
    }

    matched.lastLogin = new Date().toISOString();
    matched.lastLoginIp = clientIp;
    this.saveRegisteredUsers(users);

    const rolePermissions = resolveUserPermissions(matched);
    const sessionData = {
      id: matched.id,
      username: matched.username,
      employeeId: matched.employeeId,
      name: matched.name,
      employeeName: matched.employeeName,
      displayName: matched.displayName,
      department: matched.department,
      roleId: matched.roleId,
      positionKey: matched.positionKey,
      title: matched.title,
      level: matched.level,
      pictureUrl: matched.pictureUrl,
      lastLogin: matched.lastLogin,
      lastLoginIp: clientIp,
      deviceInfo: deviceInfo,
      pdpaConsentAt: matched.pdpaConsentAt || new Date().toISOString(),
      authSource: 'LOCAL_CACHE'
    };

    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));

    // Write to local audit trail with IP address
    auditService.logAction({
      action: 'USER_LOGIN',
      actor: sessionData,
      department: sessionData.department,
      docNo: sessionData.employeeId || sessionData.username,
      docType: 'SYSTEM',
      details: `เข้าสู่ระบบสำเร็จ (${sessionData.username}) [IP: ${clientIp}]`,
      ipAddress: clientIp,
      userAgent: deviceInfo
    });

    return {
      ...rolePermissions,
      ...sessionData,
      role: rolePermissions
    };
  },

  // Save PDPA consent for user
  savePdpaConsent(username, userObject = null) {
    const consentTime = new Date().toISOString();
    const clientIp = getClientIpSync();
    const device = getClientDeviceInfo();

    // Update active session
    const current = this.getCurrentSession();
    if (current) {
      current.pdpaConsentAt = consentTime;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(current));
    }


    // Update in registered users cache
    const users = this.getRegisteredUsers();
    const cleanU = (username || current?.username || '').toLowerCase();
    const user = users.find(u => u.username?.toLowerCase() === cleanU);
    if (user) {
      user.pdpaConsentAt = consentTime;
      user.lastLoginIp = clientIp;
      this.saveRegisteredUsers(users);
    }

    // Log to Audit trail
    auditService.logPdpaConsent(userObject || current || { name: username }, clientIp, device);

    // Sync to GAS
    gasService.savePdpaConsent(username).catch(() => {});
    return true;
  },



  // Instant login by Position for Localhost Testing
  async loginByPosition(positionOrUsername) {
    const users = this.getRegisteredUsers();
    const cleanKey = (positionOrUsername || '').trim().toLowerCase();

    const matched = users.find(u => 
      u.positionKey?.toLowerCase() === cleanKey ||
      u.roleId?.toLowerCase() === cleanKey ||
      u.username?.toLowerCase() === cleanKey
    );

    if (!matched) {
      throw new Error(`ไม่พบบัญชีสำหรับตำแหน่ง: ${positionOrUsername}`);
    }

    return this.login(matched.username, matched.password);
  },

  // Log out current session
  logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }
};
