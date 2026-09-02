/**
 * ============================================================================
 * PR/PO & STOCK MANAGEMENT SYSTEM - GOOGLE APPS SCRIPT BACKEND ENGINE
 * บริษัท พีดีคิวซี จำกัด (PDQC Co., Ltd.)
 * REST API Backend for GitHub Pages Frontend
 * ============================================================================
 */

// ─── 1. DATABASE CONFIGURATION & SCHEMA ─────────────────────────────────────
const DB_SCHEMA = {
  Products: [
    'id', 'code', 'name', 'category', 'purchaseUnit', 'stockUnit', 
    'conversionRate', 'price', 'stockBalance', 'reorderPoint', 
    'leadTimeDays', 'supplierId', 'locationId', 'locationName', 'updatedAt'
  ],
  Vendors: [
    'id', 'name', 'contact', 'phone', 'email', 'address', 'taxId', 'department', 'updatedAt'
  ],
  StorageLocations: [
    'id', 'name', 'department', 'updatedAt'
  ],
  PRs: [
    'id', 'prNumber', 'department', 'requester', 'requesterName', 'requestDate', 
    'urgency', 'requiredDate', 'status', 'totalAmount', 'items', 'memoData', 
    'remarks', 'createdAt', 'updatedAt'
  ],
  POs: [
    'id', 'poNumber', 'prId', 'prNumber', 'department', 'vendorId', 'vendorName', 
    'customVendorName', 'channel', 'status', 'items', 'subtotal', 'vat', 
    'grandTotal', 'orderDate', 'expectedDeliveryDate', 'claims', 'createdAt', 'updatedAt'
  ],
  StockLogs: [
    'id', 'timestamp', 'type', 'productId', 'productCode', 'productName', 
    'department', 'qty', 'unit', 'unitPrice', 'totalValue', 'referenceType', 
    'referenceId', 'locationId', 'locationName', 'operator', 'remarks'
  ],
  Budgets: [
    'department', 'monthlyBudget', 'spent', 'pending', 'variance', 'updatedAt'
  ],
  AuditLogs: [
    'id', 'timestamp', 'action', 'actorName', 'role', 'docNo', 'department', 'details', 'ipAddress', 'userAgent'
  ],
  Notifications: [
    'id', 'type', 'title', 'message', 'docNo', 'department', 'targetRoles', 'amount', 'actor', 'timestamp', 'timeFormatted', 'isRead'
  ],
  Users: [
    'id', 'username', 'password', 'name', 'employeeName', 'employeeId', 
    'department', 'roleId', 'positionKey', 'title', 'level', 'status', 
    'pictureUrl', 'lastLoginIp', 'lastLoginAt', 'pdpaConsentAt', 'updatedAt'
  ]
};



// ─── 2. AUTO-CREATE SHEET & DATABASE SETUP ──────────────────────────────────
/**
 * รันฟังก์ชันนี้ครั้งแรกเพื่อสร้างแท็บชีต, หัวคอลัมน์, จัดสไตล์ Header และใส่ Master Data ตั้งต้น
 */
function setupInitialDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const headerStyle = {
    bg: '#1E293B',    // Slate 800
    color: '#FFFFFF', // White
    bold: true
  };

  Object.keys(DB_SCHEMA).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    const headers = DB_SCHEMA[sheetName];

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // กำหนดหัวคอลัมน์
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // จัดสไตล์ Header
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground(headerStyle.bg)
               .setFontColor(headerStyle.color)
               .setFontWeight(headerStyle.bold ? 'bold' : 'normal')
               .setFontFamily('Sarabun')
               .setFontSize(10)
               .setHorizontalAlignment('center')
               .setVerticalAlignment('middle');
    
    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);

    // ปรับความกว้างคอลัมน์ให้อ่านง่าย
    for (let col = 1; col <= headers.length; col++) {
      sheet.setColumnWidth(col, 150);
    }
  });

  // ลบ Sheet1 หรือ แผ่นงาน1 ที่ติดมากับ Spreadsheet ตั้งต้น
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่นงาน1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  // เติม Master Data ตั้งต้น (หากชีตยังว่าง)
  seedMasterData(ss);

  Logger.log('✅ Setup Database Completed Successfully!');
  return { status: 'success', message: 'สร้างฐานข้อมูลและตารางเรียบร้อยแล้ว' };
}

/**
 * เติมข้อมูลเริ่มต้นสำหรับ Master Data (Locations, Products, Vendors, Budgets)
 */
function seedMasterData(ss) {
  // 1. Storage Locations
  const locSheet = ss.getSheetByName('StorageLocations');
  if (locSheet && locSheet.getLastRow() === 1) {
    const locs = [
      ['LOC-PD-001', 'ชั้นวาง A-01 (สารหล่อลื่น & น้ำมัน)', 'PD', new Date()],
      ['LOC-PD-002', 'ชั้นวาง A-02 (อะไหล่เครื่องจักร)', 'PD', new Date()],
      ['LOC-PD-003', 'ตู้เก็บอุปกรณ์ความปลอดภัย (PPE)', 'PD', new Date()],
      ['LOC-QC-001', 'ตู้เก็บสารเคมีทดสอบ (Lab 1)', 'QC', new Date()],
      ['LOC-QC-002', 'ชั้นวางอาหารเลี้ยงเชื้อ (Media Shelf B)', 'QC', new Date()],
      ['LOC-GEN-001', 'คลังพัสดุกลาง', 'ALL', new Date()]
    ];
    locSheet.getRange(2, 1, locs.length, locs[0].length).setValues(locs);
  }

  // 2. Products
  const prodSheet = ss.getSheetByName('Products');
  if (prodSheet && prodSheet.getLastRow() === 1) {
    const prods = [
      ['PROD-PD-001', 'PD-OIL-068', 'น้ำมันไฮดรอลิกอุตสาหกรรม VG 68', 'PD', 'ถัง (200L)', 'ลิตร', 200, 14500, 2400, 1000, 5, '', 'LOC-PD-001', 'ชั้นวาง A-01 (สารหล่อลื่น & น้ำมัน)', new Date()],
      ['PROD-PD-002', 'PD-GRS-002', 'จาระบีทนความร้อนสูง Food Grade', 'PD', 'กล่อง (12 กระป๋อง)', 'กระป๋อง', 12, 9600, 25, 10, 3, '', 'LOC-PD-001', 'ชั้นวาง A-01 (สารหล่อลื่น & น้ำมัน)', new Date()],
      ['PROD-PD-003', 'PD-BLT-380', 'สายพานลำเลียงทนความร้อน 380-5M-15', 'PD', 'เส้น', 'เส้น', 1, 620, 6, 8, 7, '', 'LOC-PD-002', 'ชั้นวาง A-02 (อะไหล่เครื่องจักร)', new Date()],
      ['PROD-PD-004', 'PD-GLV-NBR', 'ถุงมือไนไตรล์กันสารเคมี Size L', 'PD', 'กล่อง (100 ชิ้น)', 'ชิ้น', 100, 320, 2000, 750, 3, '', 'LOC-PD-003', 'ตู้เก็บอุปกรณ์ความปลอดภัย (PPE)', new Date()],
      ['PROD-QC-001', 'QC-BUF-PH7', 'สารละลายบัฟเฟอร์มาตรฐานสอบเทียบ pH 7.00 Buffer Solution (500ml)', 'QC', 'ขวด', 'ขวด', 1, 750, 8, 4, 5, '', 'LOC-QC-001', 'ตู้เก็บสารเคมีทดสอบ (Lab 1)', new Date()],
      ['PROD-QC-002', 'QC-BUF-PH4', 'สารละลายบัฟเฟอร์มาตรฐานสอบเทียบ pH 4.01 Buffer Solution (500ml)', 'QC', 'ขวด', 'ขวด', 1, 750, 6, 3, 5, '', 'LOC-QC-001', 'ตู้เก็บสารเคมีทดสอบ (Lab 1)', new Date()],
      ['PROD-QC-003', 'QC-PPT-100', 'ทิปปิเปตไมโครสีขาว (Micropipette Tips 100-1000 uL, DNase/RNase Free)', 'QC', 'กล่อง (1000 ชิ้น)', 'ชิ้น', 1000, 1200, 4500, 2000, 7, '', 'LOC-QC-001', 'ตู้เก็บสารเคมีทดสอบ (Lab 1)', new Date()],
      ['PROD-QC-004', 'QC-FLT-WAT', 'กระดาษกรองเชิงคุณภาพ Whatman Grade 1 (เส้นผ่านศูนย์กลาง 110mm)', 'QC', 'กล่อง (100 แผ่น)', 'แผ่น', 100, 680, 500, 200, 5, '', 'LOC-QC-001', 'ตู้เก็บสารเคมีทดสอบ (Lab 1)', new Date()],
      ['PROD-QC-005', 'QC-AGR-PCA', 'อาหารเลี้ยงเชื้อ Plate Count Agar (PCA) สำหรับทดสอบจุลชีววิทยา (500g)', 'QC', 'กระปุก', 'กระปุก', 1, 2400, 5, 2, 10, '', 'LOC-QC-002', 'ชั้นวางอาหารเลี้ยงเชื้อ (Media Shelf B)', new Date()],
      ['PROD-QC-006', 'QC-PDI-STR', 'แผ่นทดสอบความสะอาดสวอปสำเร็จรูป (Surface Hygiene Swab Test Kits)', 'QC', 'กล่อง (50 ชุด)', 'ชุด', 50, 1850, 120, 50, 4, '', 'LOC-QC-001', 'ตู้เก็บสารเคมีทดสอบ (Lab 1)', new Date()],
      ['PROD-QC-007', 'QC-THM-CAL', 'โพรบวัดอุณหภูมิดิจิตอลพร้อมใบรับรองการสอบเทียบ ISO/IEC 17025', 'QC', 'เครื่อง', 'เครื่อง', 1, 3500, 4, 2, 14, '', 'LOC-QC-001', 'ตู้เก็บสารเคมีทดสอบ (Lab 1)', new Date()],
      ['PROD-QC-008', 'QC-GLV-EXM', 'ถุงมือตรวจโรคลาเท็กซ์ไม่มีแป้งสำหรับการทดสอบแล็บ (Powder-Free Latex Gloves Size M)', 'QC', 'กล่อง (100 ชิ้น)', 'ชิ้น', 100, 260, 1500, 600, 3, '', 'LOC-QC-001', 'ตู้เก็บสารเคมีทดสอบ (Lab 1)', new Date()],
      ['PROD-QC-009', 'QC-ETH-995', 'เอทานอลบริสุทธิ์เกรดวิเคราะห์ Ethanol Absolute 99.5% AR Grade (4.0L)', 'QC', 'ขวด (4L)', 'ลิตร', 4, 1600, 12, 6, 5, '', 'LOC-QC-001', 'ตู้เก็บสารเคมีทดสอบ (Lab 1)', new Date()],
      ['PROD-QC-010', 'QC-ALC-PAD', 'แผ่นแอลกอฮอล์ฆ่าเชื้อสำหรับทำความสะอาดอุปกรณ์วัด (Alcohol Prep Pads)', 'QC', 'กล่อง (200 แผ่น)', 'แผ่น', 200, 180, 2000, 800, 3, '', 'LOC-QC-001', 'ตู้เก็บสารเคมีทดสอบ (Lab 1)', new Date()]
    ];
    prodSheet.getRange(2, 1, prods.length, prods[0].length).setValues(prods);
  }


  // 3. Vendors
  const vendorSheet = ss.getSheetByName('Vendors');
  if (vendorSheet && vendorSheet.getLastRow() === 1) {
    const vendors = [
      ['VEND-001', 'บริษัท สยามลูบริแคนท์ส จำกัด', 'คุณสมศักดิ์', '02-123-4567', 'sales@siamlub.com', 'กทม.', '0105551234567', 'PD', new Date()],
      ['VEND-002', 'บริษัท ไซแอนติฟิค ซัพพลาย จำกัด', 'คุณนภา', '02-987-6543', 'info@scisup.co.th', 'นนทบุรี', '0105559876543', 'QC', new Date()],
      ['VEND-003', 'ร้านจัดซื้อออนไลน์ (Shopee / Lazada)', 'ฝ่ายจัดซื้อออนไลน์', '-', '-', '-', '-', 'BOTH', new Date()]
    ];
    vendorSheet.getRange(2, 1, vendors.length, vendors[0].length).setValues(vendors);
  }

  // 4. Budgets
  const budgetSheet = ss.getSheetByName('Budgets');
  if (budgetSheet && budgetSheet.getLastRow() === 1) {
    const budgets = [
      ['PD', 250000, 0, 0, 250000, new Date()],
      ['QC', 150000, 0, 0, 150000, new Date()]
    ];
    budgetSheet.getRange(2, 1, budgets.length, budgets[0].length).setValues(budgets);
  }

  // 5. Users (Master User Accounts & Login Credentials)
  const userSheet = ss.getSheetByName('Users');
  if (userSheet && userSheet.getLastRow() === 1) {
    const users = [
      ['USR-0001', 'wichai.pd', 'password123', 'คุณวิชัย (PD)', 'คุณวิชัย สุขใจ', 'EMP-PD-001', 'PD', 'REQUESTER_PD', 'REQUESTER_PD', 'Requester (PD)', 1, 'ACTIVE', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', new Date()],
      ['USR-0002', 'somying.qc', 'password123', 'คุณสมหญิง (QC)', 'คุณสมหญิง รักดี', 'EMP-QC-001', 'QC', 'REQUESTER_QC', 'REQUESTER_QC', 'Requester (QC)', 1, 'ACTIVE', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', new Date()],
      ['USR-0003', 'somchai.am', 'password123', 'คุณสมชาย (Asst. Mgr)', 'คุณสมชาย มุ่งมั่น', 'EMP-MGR-001', 'ALL', 'ASST_MANAGER', 'REVIEWER', 'Assistant Manager', 2, 'ACTIVE', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', new Date()],
      ['USR-0004', 'nat.on', 'password123', 'คุณนัท (Online Purchaser)', 'คุณนัท จัดซื้อ', 'EMP-PUR-001', 'ALL', 'ONLINE_PURCHASER', 'ONLINE_PURCHASER', 'Online Purchaser', 2, 'ACTIVE', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', new Date()],
      ['USR-0005', 'prasert.pm', 'password123', 'คุณประเสริฐ (Plant Mgr)', 'คุณประเสริฐ ยิ่งยง', 'EMP-MGR-002', 'ALL', 'PLANT_MANAGER', 'APPROVER', 'Plant Manager', 3, 'ACTIVE', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', new Date()],
      ['USR-0006', 'admin', 'admin123', 'Admin System', 'ผู้ดูแลระบบ', 'EMP-SYS-999', 'ALL', 'ADMIN', 'ADMIN', 'System Administrator', 99, 'ACTIVE', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', new Date()],
      ['USR-0010', 'requester', 'password123', 'คุณผู้ขอซื้อ (Requester)', 'คุณผู้ขอซื้อ ปฏิบัติการ', 'EMP-REQ-001', 'PD', 'REQUESTER', 'REQUESTER', 'Requester', 1, 'ACTIVE', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', new Date()],
      ['USR-0011', 'reviewer', 'password123', 'คุณผู้ตรวจทาน (Reviewer)', 'คุณผู้ตรวจทาน งานจัดซื้อ', 'EMP-REV-001', 'ALL', 'ASST_MANAGER', 'REVIEWER', 'Reviewer / Asst. Manager', 2, 'ACTIVE', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80', new Date()],
      ['USR-0012', 'approver', 'password123', 'คุณผู้อนุมัติ (Approver)', 'คุณผู้อนุมัติ ขั้นสุดท้าย', 'EMP-APP-001', 'ALL', 'PLANT_MANAGER', 'APPROVER', 'Approver / Plant Manager', 3, 'ACTIVE', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80', new Date()],
      ['USR-0013', 'qa.backend', 'password123', 'QA ตรวจระบบหลังบ้าน (Backend QA)', 'ทีมตรวจสอบระบบหลังบ้าน (QA Engineer)', 'EMP-QA-001', 'ALL', 'ADMIN', 'ADMIN', 'QA Backend Engineer', 99, 'ACTIVE', 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80', new Date()],
      ['USR-0014', 'dev.backend', 'password123', 'Dev แก้ไขหลังบ้าน (Backend Dev)', 'ทีมนักพัฒนาหลังบ้าน (Backend Developer)', 'EMP-DEV-001', 'ALL', 'ADMIN', 'ADMIN', 'Dev Backend Engineer', 99, 'ACTIVE', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', new Date()]
    ];
    userSheet.getRange(2, 1, users.length, users[0].length).setValues(users);
  }
}



// ─── 3. WEB APP ENTRY POINT (doGet & doPost) ────────────────────────────────
function doGet(e) {
  const action = e?.parameter?.action;

  let responseData = {};
  try {
    if (action === 'ping') {
      responseData = { 
        status: 'success', 
        message: 'Google Apps Script Backend is Live and Ready', 
        timestamp: new Date().toISOString(),
        spreadsheetName: SpreadsheetApp.getActiveSpreadsheet().getName()
      };
    } else if (action === 'getInitialData') {
      responseData = {
        status: 'success',
        data: apiGetInitialData()
      };
    } else if (action === 'setup') {
      responseData = setupInitialDatabase();
    } else {
      // Fallback: If accessed via browser without params, return status summary
      responseData = {
        status: 'online',
        system: 'PR/PO & Inventory Management Backend Engine',
        company: 'PDQC Co., Ltd.',
        timestamp: new Date().toISOString()
      };
    }
  } catch (err) {
    responseData = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let responseData = {};
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      body = e.parameter;
    }

    const action = body.action;

    if (action === 'ping') {
      responseData = { status: 'success', message: 'Pong! GAS Backend connected successfully.' };
    } else if (action === 'getInitialData') {
      responseData = { status: 'success', data: apiGetInitialData() };
    } else if (action === 'syncAllData') {
      responseData = apiSyncAllData(body.payload, body.user);
    } else if (action === 'savePR') {
      responseData = apiSavePR(body.prData || body.payload, body.user);
    } else if (action === 'approvePR') {
      responseData = apiApprovePRAndCreatePO(body.prId, body.user);
    } else if (action === 'receiveGoods') {
      responseData = apiReceiveGoods(body.poId, body.receivingItems, body.user, body.note);
    } else if (action === 'quickIssue') {
      responseData = apiQuickIssue(body.issueData || body.payload, body.user);
    } else if (action === 'saveProduct') {
      responseData = apiSaveProduct(body.product || body.payload, body.user);
    } else if (action === 'saveVendor') {
      responseData = apiSaveVendor(body.vendor || body.payload, body.user);
    } else if (action === 'saveStorageLocation') {
      responseData = apiSaveStorageLocation(body.location || body.payload, body.user);
    } else if (action === 'deleteStorageLocation') {
      responseData = apiDeleteStorageLocation(body.locationId, body.options, body.user);
    } else if (action === 'updateBudget') {
      responseData = apiUpdateBudget(body.department, body.amount, body.user);
    } else if (action === 'login') {
      responseData = apiLoginUser(body.username, body.password, body.ipAddress || body.clientIp, body.userAgent);
    } else if (action === 'savePdpaConsent') {
      responseData = apiSavePdpaConsent(body.username || body.payload?.username, body.clientIp || body.ipAddress, body.userAgent);
    } else if (action === 'getUsers') {
      responseData = { status: 'success', data: getSheetRecords(SpreadsheetApp.getActiveSpreadsheet(), 'Users') };
    } else if (action === 'saveUser') {
      responseData = apiSaveUser(body.user || body.payload, body.operator);
    } else if (action === 'logAudit') {
      const entry = body.entry || body.payload || {};
      if (body.ipAddress && !entry.ipAddress) entry.ipAddress = body.ipAddress;
      if (body.userAgent && !entry.userAgent) entry.userAgent = body.userAgent;
      responseData = apiLogAuditAction(entry);
    } else if (action === 'setup') {
      responseData = setupInitialDatabase();
    } else {
      responseData = { status: 'error', message: 'Unknown action: ' + action };
    }

  } catch (err) {
    responseData = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── 4. API FUNCTIONS ───────────────────────────────────────────────────────

const DEFAULT_MASTER_USERS = [
  { id: 'USR-0001', username: 'wichai.pd', password: 'password123', name: 'คุณวิชัย (PD)', employeeName: 'คุณวิชัย สุขใจ', employeeId: 'EMP-PD-001', department: 'PD', roleId: 'REQUESTER_PD', title: 'Requester (PD)', level: 1, status: 'ACTIVE' },
  { id: 'USR-0002', username: 'somying.qc', password: 'password123', name: 'คุณสมหญิง (QC)', employeeName: 'คุณสมหญิง รักดี', employeeId: 'EMP-QC-001', department: 'QC', roleId: 'REQUESTER_QC', title: 'Requester (QC)', level: 1, status: 'ACTIVE' },
  { id: 'USR-0003', username: 'somchai.am', password: 'password123', name: 'คุณสมชาย (Asst. Mgr)', employeeName: 'คุณสมชาย มุ่งมั่น', employeeId: 'EMP-MGR-001', department: 'ALL', roleId: 'ASST_MANAGER', title: 'Assistant Manager', level: 2, status: 'ACTIVE' },
  { id: 'USR-0004', username: 'nat.on', password: 'password123', name: 'คุณนัท (Online Purchaser)', employeeName: 'คุณนัท จัดซื้อ', employeeId: 'EMP-PUR-001', department: 'ALL', roleId: 'ONLINE_PURCHASER', title: 'Online Purchaser', level: 2, status: 'ACTIVE' },
  { id: 'USR-0005', username: 'prasert.pm', password: 'password123', name: 'คุณประเสริฐ (Plant Mgr)', employeeName: 'คุณประเสริฐ ยิ่งยง', employeeId: 'EMP-MGR-002', department: 'ALL', roleId: 'PLANT_MANAGER', title: 'Plant Manager', level: 3, status: 'ACTIVE' },
  { id: 'USR-0006', username: 'admin', password: 'admin123', name: 'Admin System', employeeName: 'ผู้ดูแลระบบ', employeeId: 'EMP-SYS-999', department: 'ALL', roleId: 'ADMIN', title: 'System Administrator', level: 99, status: 'ACTIVE' },
  { id: 'USR-0010', username: 'requester', password: 'password123', name: 'คุณผู้ขอซื้อ (Requester)', employeeName: 'คุณผู้ขอซื้อ ปฏิบัติการ', employeeId: 'EMP-REQ-001', department: 'PD', roleId: 'REQUESTER', title: 'Requester', level: 1, status: 'ACTIVE' },
  { id: 'USR-0011', username: 'reviewer', password: 'password123', name: 'คุณผู้ตรวจทาน (Reviewer)', employeeName: 'คุณผู้ตรวจทาน งานจัดซื้อ', employeeId: 'EMP-REV-001', department: 'ALL', roleId: 'ASST_MANAGER', title: 'Reviewer / Asst. Manager', level: 2, status: 'ACTIVE' },
  { id: 'USR-0012', username: 'approver', password: 'password123', name: 'คุณผู้อนุมัติ (Approver)', employeeName: 'คุณผู้อนุมัติ ขั้นสุดท้าย', employeeId: 'EMP-APP-001', department: 'ALL', roleId: 'PLANT_MANAGER', title: 'Approver / Plant Manager', level: 3, status: 'ACTIVE' },
  { id: 'USR-0013', username: 'qa.backend', password: 'password123', name: 'QA ตรวจระบบหลังบ้าน (Backend QA)', employeeName: 'ทีมตรวจสอบระบบหลังบ้าน (QA Engineer)', employeeId: 'EMP-QA-001', department: 'ALL', roleId: 'ADMIN', title: 'QA Backend Engineer', level: 99, status: 'ACTIVE' },
  { id: 'USR-0014', username: 'dev.backend', password: 'password123', name: 'Dev แก้ไขหลังบ้าน (Backend Dev)', employeeName: 'ทีมนักพัฒนาหลังบ้าน (Backend Developer)', employeeId: 'EMP-DEV-001', department: 'ALL', roleId: 'ADMIN', title: 'Dev Backend Engineer', level: 99, status: 'ACTIVE' }
];

/**
 * ดึงข้อมูลทั้งหมดใน 1 Round-Trip และรับประกันว่า Master Users มีครบถ้วน
 */
function apiGetInitialData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const users = getSheetRecords(ss, 'Users');

  // Only seed default users if the Users sheet is completely empty (first-time initialization)
  if (users.length === 0) {
    DEFAULT_MASTER_USERS.forEach(mu => {
      const record = { ...mu, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      upsertSheetRecord(ss, 'Users', record);
      users.push(record);
    });
  }

  const rawPRs = getSheetRecords(ss, 'PRs', ['items', 'memoData']);
  const formattedPRs = rawPRs.map(pr => ({
    ...pr,
    prNo: pr.prNumber || pr.prNo,
    prNumber: pr.prNumber || pr.prNo,
    requestedBy: pr.requesterName || pr.requester || pr.requestedBy || 'Requester',
    requestedDate: pr.requestDate || pr.createdAt || pr.requestedDate || '',
    note: pr.remarks || pr.note || '',
    memo: pr.memoData || pr.memo || null
  }));

  return {
    products: getSheetRecords(ss, 'Products'),
    vendors: getSheetRecords(ss, 'Vendors'),
    storageLocations: getSheetRecords(ss, 'StorageLocations'),
    prs: formattedPRs,
    pos: getSheetRecords(ss, 'POs', ['items', 'claims']),
    stockLogs: getSheetRecords(ss, 'StockLogs'),
    budgets: getBudgetsObject(ss),
    auditLogs: getSheetRecords(ss, 'AuditLogs'),
    notifications: getSheetRecords(ss, 'Notifications', ['targetRoles']),
    users: users
  };
}



/**
 * ซิงค์ข้อมูลทั้งหมดจาก Frontend ขึ้นสู่ Google Sheets (Full Sync / Backup)
 */
function apiSyncAllData(payload, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (payload.products && Array.isArray(payload.products)) {
      overwriteSheetRecords(ss, 'Products', payload.products);
    }
    if (payload.vendors && Array.isArray(payload.vendors)) {
      overwriteSheetRecords(ss, 'Vendors', payload.vendors);
    }
    if (payload.storageLocations && Array.isArray(payload.storageLocations)) {
      overwriteSheetRecords(ss, 'StorageLocations', payload.storageLocations);
    }
    if (payload.prs && Array.isArray(payload.prs)) {
      overwriteSheetRecords(ss, 'PRs', payload.prs, ['items', 'memoData']);
    }
    if (payload.pos && Array.isArray(payload.pos)) {
      overwriteSheetRecords(ss, 'POs', payload.pos, ['items', 'claims']);
    }
    if (payload.stockLogs && Array.isArray(payload.stockLogs)) {
      overwriteSheetRecords(ss, 'StockLogs', payload.stockLogs);
    }
    if (payload.budgets) {
      saveBudgetsFromObject(ss, payload.budgets);
    }
    if (payload.auditLogs && Array.isArray(payload.auditLogs)) {
      overwriteSheetRecords(ss, 'AuditLogs', payload.auditLogs);
    }
    if (payload.notifications && Array.isArray(payload.notifications)) {
      overwriteSheetRecords(ss, 'Notifications', payload.notifications, ['targetRoles']);
    }
    if (payload.users && Array.isArray(payload.users)) {
      overwriteSheetRecords(ss, 'Users', payload.users);
    }

    apiLogAudit('SYNC_ALL_DATA', user?.name || 'System User', user?.title || 'Admin', '-', 'ซิงค์และสำรองข้อมูลทั้งหมดเข้า Google Sheets');

    return { status: 'success', message: 'ซิงค์ข้อมูลทั้งหมดขึ้น Google Sheets สำเร็จ', timestamp: new Date().toISOString() };

  } finally {
    lock.releaseLock();
  }
}

/**
 * บันทึกหรือสร้างเอกสาร PR
 */
function apiSavePR(prData, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dept = prData.department || 'PD';
    
    if (!prData.prNumber) {
      if (prData.prNo) {
        prData.prNumber = prData.prNo;
      } else {
        const year = new Date().getFullYear().toString().slice(-2);
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const prefix = `PR-${dept}-${year}${month}-`;
        const prs = getSheetRecords(ss, 'PRs');
        const count = prs.filter(p => p.prNumber && p.prNumber.startsWith(prefix)).length + 1;
        prData.prNumber = `${prefix}${String(count).padStart(3, '0')}`;
      }
    }
    prData.prNo = prData.prNumber;
    prData.totalAmount = parseFloat(prData.totalAmount) || 0;

    if (!prData.id) prData.id = 'PR-' + Date.now();
    prData.updatedAt = new Date().toISOString();
    if (!prData.createdAt) prData.createdAt = new Date().toISOString();

    if (!prData.requester) prData.requester = prData.requestedBy || user?.name || 'Requester';
    if (!prData.requesterName) prData.requesterName = prData.requestedBy || user?.name || 'Requester';
    if (!prData.requestDate) prData.requestDate = prData.requestedDate || prData.createdAt;
    if (!prData.remarks) prData.remarks = prData.note || '';
    if (!prData.memoData) prData.memoData = prData.memo || null;

    upsertSheetRecord(ss, 'PRs', prData, ['items', 'memoData']);
    
    apiLogAudit('SAVE_PR', user?.name || 'Requester', user?.title || 'Staff', prData.prNumber, `บันทึก PR ยอด ${prData.totalAmount} บาท สถานะ: ${prData.status}`);
    return { status: 'success', data: prData };
  } finally {
    lock.releaseLock();
  }
}

/**
 * อนุมัติ PR และแปลงเป็น PO อัตโนมัติ (Approver / Plant Manager)
 */
function apiApprovePRAndCreatePO(prId, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const prs = getSheetRecords(ss, 'PRs', ['items', 'memoData']);
    const pr = prs.find(p => p.id === prId);
    if (!pr) throw new Error('ไม่พบเอกสาร PR: ' + prId);

    // 1. Update PR Status
    pr.status = 'APPROVED';
    pr.updatedAt = new Date().toISOString();
    upsertSheetRecord(ss, 'PRs', pr, ['items', 'memoData']);

    // 2. Generate PO Number
    const year = new Date().getFullYear().toString().slice(-2);
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = `PO-${pr.department}-${year}${month}-`;
    const pos = getSheetRecords(ss, 'POs');
    const count = pos.filter(p => p.poNumber && p.poNumber.startsWith(prefix)).length + 1;
    const poNumber = `${prefix}${String(count).padStart(3, '0')}`;
    const docPrNumber = pr.prNumber || pr.prNo || pr.id;

    // 3. Create PO Data
    const subtotal = Number(pr.totalAmount) || 0;
    const vat = Math.round(subtotal * 0.07 * 100) / 100;
    const poData = {
      id: 'PO-' + Date.now(),
      poNumber: poNumber,
      prId: pr.id,
      prNumber: docPrNumber,
      department: pr.department,
      vendorId: '',
      vendorName: 'รอระบุผู้จำหน่าย',
      customVendorName: '',
      channel: 'SELF',
      status: 'ISSUED',
      items: pr.items || [],
      subtotal: subtotal,
      vat: vat,
      grandTotal: subtotal + vat,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: pr.requiredDate || '',
      claims: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    upsertSheetRecord(ss, 'POs', poData, ['items', 'claims']);

    // 4. Update Department Budget (Spent & Variance)
    try {
      const budgets = getBudgetsObject(ss);
      if (budgets[pr.department]) {
        const amt = Number(pr.totalAmount) || 0;
        budgets[pr.department].spent = (budgets[pr.department].spent || 0) + amt;
        budgets[pr.department].variance = (budgets[pr.department].monthlyBudget || 0) - budgets[pr.department].spent;
        saveBudgetsFromObject(ss, budgets);
      }
    } catch (bErr) {
      Logger.log('Budget update error: ' + bErr);
    }

    apiLogAudit('APPROVE_PR_CREATE_PO', user?.name || 'Approver', user?.title || 'Plant Manager', poNumber, `อนุมัติ PR ${docPrNumber} และออก PO ${poNumber}`);
    
    return { status: 'success', data: { pr, po: poData } };

  } finally {
    lock.releaseLock();
  }
}

/**
 * รับสินค้าเข้าคลัง (Receive Goods) & อัปเดตสต็อกอัตโนมัติ
 */
function apiReceiveGoods(poId, receivingItems, user, note) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pos = getSheetRecords(ss, 'POs', ['items', 'claims']);
    const po = pos.find(p => p.id === poId);
    if (!po) throw new Error('ไม่พบเอกสาร PO: ' + poId);

    const products = getSheetRecords(ss, 'Products');
    let allCompleted = true;

    po.items = po.items.map(item => {
      const match = receivingItems.find(r => r.productId === item.productId || r.code === item.code);
      const receiveQty = match ? Number(match.receivedThisTime || 0) : 0;
      const currentReceived = Number(item.receivedQty || 0) + receiveQty;
      const orderedQty = Number(item.purchaseQty || item.orderedQty || item.qty || 0);

      if (currentReceived < orderedQty) allCompleted = false;

      // ปรับปรุงยอดคงเหลือสินค้าใน Products
      if (receiveQty > 0) {
        const prod = products.find(p => p.id === item.productId || p.code === item.code);
        if (prod) {
          const conversionRate = Number(prod.conversionRate) || 1;
          const stockToAdd = receiveQty * conversionRate;
          prod.stockBalance = Number(prod.stockBalance || 0) + stockToAdd;
          prod.updatedAt = new Date().toISOString();
          upsertSheetRecord(ss, 'Products', prod);

          // บันทึกความเคลื่อนไหวใน StockLogs
          const logData = {
            id: 'LOG-' + Date.now() + '-' + Math.floor(Math.random()*1000),
            timestamp: new Date().toISOString(),
            type: 'IN',
            productId: prod.id,
            productCode: prod.code,
            productName: prod.name,
            department: prod.category || po.department,
            qty: stockToAdd,
            unit: prod.stockUnit || prod.unit,
            unitPrice: prod.price || 0,
            totalValue: stockToAdd * (prod.price || 0),
            referenceType: 'PO',
            referenceId: po.poNumber,
            locationId: prod.locationId || '',
            locationName: prod.locationName || '',
            operator: user?.name || 'Warehouse Staff',
            remarks: note || 'รับของเข้าคลังตาม PO'
          };
          upsertSheetRecord(ss, 'StockLogs', logData);
        }
      }

      return {
        ...item,
        receivedQty: currentReceived,
        remainingQty: Math.max(0, orderedQty - currentReceived)
      };
    });

    po.status = allCompleted ? 'RECEIVED' : 'PARTIAL';
    po.updatedAt = new Date().toISOString();
    upsertSheetRecord(ss, 'POs', po, ['items', 'claims']);

    apiLogAudit('RECEIVE_GOODS', user?.name || 'Staff', user?.title || 'Requester', po.poNumber, `รับสินค้าเข้าคลัง PO: ${po.poNumber} สถานะ: ${po.status}`);
    return { status: 'success', data: po };
  } finally {
    lock.releaseLock();
  }
}

/**
 * เบิกจ่ายสินค้าด่วน (Quick Issue / Stock Out)
 */
function apiQuickIssue(issueData, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const products = getSheetRecords(ss, 'Products');
    const prod = products.find(p => p.id === issueData.productId);
    if (!prod) throw new Error('ไม่พบสินค้านี้ในระบบ');

    const issueQty = Number(issueData.qty);
    if (prod.stockBalance < issueQty) {
      throw new Error(`ยอดคงเหลือไม่พอจ่าย (มีอยู่ ${prod.stockBalance} ${prod.stockUnit})`);
    }

    prod.stockBalance -= issueQty;
    prod.updatedAt = new Date().toISOString();
    upsertSheetRecord(ss, 'Products', prod);

    const logData = {
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toISOString(),
      type: 'OUT',
      productId: prod.id,
      productCode: prod.code,
      productName: prod.name,
      department: prod.category,
      qty: -issueQty,
      unit: prod.stockUnit || prod.unit,
      unitPrice: prod.price || 0,
      totalValue: -(issueQty * (prod.price || 0)),
      referenceType: 'QUICK_ISSUE',
      referenceId: issueData.issueLocation || 'ห้องผลิต',
      locationId: prod.locationId || '',
      locationName: prod.locationName || '',
      operator: user?.name || 'Staff',
      remarks: issueData.note || `เบิกจ่ายไปที่ ${issueData.issueLocation}`
    };
    upsertSheetRecord(ss, 'StockLogs', logData);
    apiLogAudit('QUICK_ISSUE', user?.name || 'Staff', user?.title || 'Requester', prod.code, `เบิกจ่าย ${prod.name} จำนวน ${issueQty} ${prod.stockUnit}`);

    return { status: 'success', data: { product: prod, log: logData } };
  } finally {
    lock.releaseLock();
  }
}

/**
 * บันทึกข้อมูลสินค้า Master Data
 */
function apiSaveProduct(product, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!product.id) product.id = `PROD-${product.category || 'PD'}-${Date.now()}`;
    product.updatedAt = new Date().toISOString();
    upsertSheetRecord(ss, 'Products', product);
    apiLogAudit('SAVE_PRODUCT', user?.name || 'Staff', user?.title || 'Manager', product.code, `บันทึกข้อมูลสินค้า: ${product.name}`);
    return { status: 'success', data: product };
  } finally {
    lock.releaseLock();
  }
}

/**
 * บันทึกข้อมูลผู้จำหน่าย Master Data
 */
function apiSaveVendor(vendor, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!vendor.id) vendor.id = `VEND-${Date.now()}`;
    vendor.updatedAt = new Date().toISOString();
    upsertSheetRecord(ss, 'Vendors', vendor);
    apiLogAudit('SAVE_VENDOR', user?.name || 'Staff', user?.title || 'Manager', vendor.name, `บันทึกข้อมูลผู้ขาย: ${vendor.name}`);
    return { status: 'success', data: vendor };
  } finally {
    lock.releaseLock();
  }
}

/**
 * บันทึกจุดจัดเก็บสินค้า
 */
function apiSaveStorageLocation(location, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!location.id) location.id = `LOC-${location.department || 'GEN'}-${Date.now()}`;
    location.updatedAt = new Date().toISOString();
    upsertSheetRecord(ss, 'StorageLocations', location);
    apiLogAudit('SAVE_LOCATION', user?.name || 'Staff', user?.title || 'Manager', location.name, `บันทึกจุดจัดเก็บ: ${location.name}`);
    return { status: 'success', data: location };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ลบจุดจัดเก็บสินค้า
 */
function apiDeleteStorageLocation(locationId, options, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('StorageLocations');
    if (!sheet) return { status: 'error', message: 'Sheet not found' };

    const values = sheet.getDataRange().getValues();
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][0]) === String(locationId)) {
        sheet.deleteRow(r + 1);
        break;
      }
    }
    apiLogAudit('DELETE_LOCATION', user?.name || 'Staff', user?.title || 'Manager', locationId, `ลบจุดจัดเก็บรหัส: ${locationId}`);
    return { status: 'success', locationId };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ปรับปรุงงบประมาณประจำเดือน
 */
function apiUpdateBudget(department, amount, user) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const budgetRecord = {
      department: department,
      monthlyBudget: Number(amount) || 0,
      spent: 0,
      pending: 0,
      variance: Number(amount) || 0,
      updatedAt: new Date().toISOString()
    };
    upsertSheetRecord(ss, 'Budgets', budgetRecord);
    apiLogAudit('UPDATE_BUDGET', user?.name || 'Manager', user?.title || 'Approver', department, `ปรับปรุงงบประมาณฝ่าย ${department} เป็น ฿${amount}`);
    return { status: 'success', data: budgetRecord };
  } finally {
    lock.releaseLock();
  }
}

function apiLogAuditAction(entry) {
  if (!entry) return { status: 'error' };
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  upsertSheetRecord(ss, 'AuditLogs', entry);
  return { status: 'success' };
}

/**
 * ตรวจสอบการเข้าสู่ระบบผ่าน Google Sheets (Users Sheet)
 */
function apiLoginUser(username, password, clientIp, userAgent) {
  if (!username || !password) {
    return { status: 'error', message: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' };
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const users = getSheetRecords(ss, 'Users');
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();
  const ip = clientIp || '127.0.0.1';
  const device = userAgent || 'Web Browser';

  // If Users sheet is 100% empty, seed initial defaults once
  let userList = users;
  if (userList.length === 0) {
    DEFAULT_MASTER_USERS.forEach(mu => {
      const record = { ...mu, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      upsertSheetRecord(ss, 'Users', record);
      userList.push(record);
    });
  }

  // Find user by username or employeeId, matching password exactly (trimmed string comparison)
  const matched = userList.find(u => 
    (String(u.username || '').trim().toLowerCase() === cleanUser || String(u.employeeId || '').trim().toLowerCase() === cleanUser) &&
    String(u.password || '').trim() === cleanPass
  );

  if (!matched) {
    return { status: 'error', message: 'ชื่อผู้ใช้งาน (Username) หรือรหัสผ่าน (Password) ไม่ถูกต้อง' };
  }

  if (matched.status && String(matched.status).trim().toUpperCase() !== 'ACTIVE') {
    return { status: 'error', message: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว' };
  }

  // Update ONLY lastLogin timestamp & IP in sheet (NEVER overwrite password or user profile with default)
  try {
    updateUserLoginTimestamp(ss, matched.id || matched.username, ip);
  } catch (err) {
    console.warn('Failed to update login timestamp in sheet:', err);
  }

  // Record audit log with IP address and device info
  apiLogAudit('USER_LOGIN', matched.name || matched.username, matched.title || matched.roleId, matched.employeeId || '-', `เข้าสู่ระบบสำเร็จ (${matched.username}) [IP: ${ip}]`, ip, device);

  // Return user details without exposing raw password in API response
  const userSafe = { ...matched };
  delete userSafe.password;

  return {
    status: 'success',
    message: 'เข้าสู่ระบบสำเร็จ',
    user: userSafe
  };
}

/**
 * บันทึกความยินยอม PDPA (Personal Data Protection Act)
 */
function apiSavePdpaConsent(username, clientIp, userAgent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const users = getSheetRecords(ss, 'Users');
  const cleanUser = String(username || '').trim().toLowerCase();
  const ip = clientIp || '127.0.0.1';
  const device = userAgent || 'Web Browser';

  const matched = users.find(u => String(u.username || '').trim().toLowerCase() === cleanUser);
  if (matched) {
    try {
      updateUserPdpaConsent(ss, matched.username, ip);
    } catch (err) {
      console.warn('Failed to update PDPA timestamp in sheet:', err);
    }

    apiLogAudit('PDPA_CONSENT', matched.name || matched.username, matched.title || matched.roleId, matched.employeeId || '-', `ผู้ใช้ยินยอมให้บันทึกประวัติการใช้งานเฉพาะภายในระบบ PR/PO (PDPA Consent) [IP: ${ip}]`, ip, device);
    return { status: 'success', message: 'บันทึกความยินยอม PDPA เรียบร้อยแล้ว' };
  }
  return { status: 'error', message: 'ไม่พบผู้ใช้งาน' };
}

/**
 * อัปเดตเฉพาะ Timestamp และ IP ตอน Login ในตาราง Users โดยไม่แตะต้องรหัสผ่านหรือข้อมูลอื่น
 */
function updateUserLoginTimestamp(ss, idOrUsername, ip) {
  const sheet = ss.getSheetByName('Users');
  if (!sheet || sheet.getLastRow() <= 1) return;
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIdx = headers.indexOf('id');
  const userIdx = headers.indexOf('username');
  const lastLoginAtIdx = headers.indexOf('lastLoginAt');
  const lastLoginIpIdx = headers.indexOf('lastLoginIp');
  const updatedAtIdx = headers.indexOf('updatedAt');

  for (let r = 1; r < values.length; r++) {
    const rowId = idIdx !== -1 ? String(values[r][idIdx]) : '';
    const rowUser = userIdx !== -1 ? String(values[r][userIdx]).toLowerCase() : '';
    if (rowId === String(idOrUsername) || (rowUser && rowUser === String(idOrUsername).toLowerCase())) {
      const rowNum = r + 1;
      const nowStr = new Date().toISOString();
      if (lastLoginAtIdx !== -1) sheet.getRange(rowNum, lastLoginAtIdx + 1).setValue(nowStr);
      if (lastLoginIpIdx !== -1) sheet.getRange(rowNum, lastLoginIpIdx + 1).setValue(ip);
      if (updatedAtIdx !== -1) sheet.getRange(rowNum, updatedAtIdx + 1).setValue(nowStr);
      break;
    }
  }
}

/**
 * อัปเดตเฉพาะสถานะ PDPA Consent และ IP ในตาราง Users โดยไม่แตะต้องรหัสผ่านหรือข้อมูลอื่น
 */
function updateUserPdpaConsent(ss, username, ip) {
  const sheet = ss.getSheetByName('Users');
  if (!sheet || sheet.getLastRow() <= 1) return;
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const userIdx = headers.indexOf('username');
  const pdpaIdx = headers.indexOf('pdpaConsentAt');
  const ipIdx = headers.indexOf('lastLoginIp');
  const updatedAtIdx = headers.indexOf('updatedAt');

  for (let r = 1; r < values.length; r++) {
    const rowUser = userIdx !== -1 ? String(values[r][userIdx]).toLowerCase() : '';
    if (rowUser === String(username).toLowerCase()) {
      const rowNum = r + 1;
      const nowStr = new Date().toISOString();
      if (pdpaIdx !== -1) sheet.getRange(rowNum, pdpaIdx + 1).setValue(nowStr);
      if (ipIdx !== -1) sheet.getRange(rowNum, ipIdx + 1).setValue(ip);
      if (updatedAtIdx !== -1) sheet.getRange(rowNum, updatedAtIdx + 1).setValue(nowStr);
      break;
    }
  }
}



/**
 * บันทึกหรือสร้างข้อมูลผู้ใช้งานในชีต Users
 */
function apiSaveUser(userData, operator) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!userData.id) {
      userData.id = 'USR-' + Date.now();
    }
    userData.updatedAt = new Date().toISOString();
    upsertSheetRecord(ss, 'Users', userData);

    apiLogAudit('SAVE_USER', operator?.name || 'Admin', operator?.title || 'System', userData.username, `บันทึกข้อมูลผู้ใช้งาน: ${userData.name} (${userData.username})`);
    return { status: 'success', data: userData };
  } finally {
    lock.releaseLock();
  }
}


// ─── 5. HELPER UTILITIES FOR SHEET READ / WRITE ─────────────────────────────
function getSheetRecords(ss, sheetName, jsonFields = []) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const records = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      let val = row[c];
      if (jsonFields.includes(key) && typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { val = JSON.parse(val); } catch (e) {}
      }
      obj[key] = val;
    }
    records.push(obj);
  }
  return records;
}

function upsertSheetRecord(ss, sheetName, record, jsonFields = []) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColIdx = headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('department');
  const values = sheet.getDataRange().getValues();

  let targetRow = -1;
  const matchValue = record.id || record.department;
  if (idColIdx !== -1 && matchValue) {
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][idColIdx]) === String(matchValue)) {
        targetRow = r + 1;
        break;
      }
    }
  }

  const rowData = headers.map(header => {
    let val = record[header] !== undefined ? record[header] : '';
    if (jsonFields.includes(header) && typeof val === 'object') {
      val = JSON.stringify(val);
    }
    return val;
  });

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function overwriteSheetRecords(ss, sheetName, records, jsonFields = []) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  const headers = DB_SCHEMA[sheetName] || (records.length > 0 ? Object.keys(records[0]) : []);
  if (headers.length === 0) return;

  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (records.length === 0) return;

  const rows = records.map(record => {
    return headers.map(h => {
      let val = record[h] !== undefined ? record[h] : '';
      if (jsonFields.includes(h) && typeof val === 'object') {
        val = JSON.stringify(val);
      }
      return val;
    });
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function getBudgetsObject(ss) {
  const records = getSheetRecords(ss, 'Budgets');
  const budgets = {};
  records.forEach(r => {
    if (r.department) {
      budgets[r.department] = {
        monthlyBudget: Number(r.monthlyBudget) || 0,
        spent: Number(r.spent) || 0,
        pending: Number(r.pending) || 0,
        variance: Number(r.variance) || 0
      };
    }
  });
  return budgets;
}

function saveBudgetsFromObject(ss, budgetsObj) {
  const records = Object.keys(budgetsObj).map(dept => ({
    department: dept,
    monthlyBudget: budgetsObj[dept].monthlyBudget || 0,
    spent: budgetsObj[dept].spent || 0,
    pending: budgetsObj[dept].pending || 0,
    variance: budgetsObj[dept].variance || 0,
    updatedAt: new Date().toISOString()
  }));
  overwriteSheetRecords(ss, 'Budgets', records);
}

function apiLogAudit(action, actorName, role, docNo, details, ipAddress = '-', userAgent = '-') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const log = {
    id: 'AUDIT-' + Date.now(),
    timestamp: new Date().toISOString(),
    action: action,
    actorName: actorName,
    role: role,
    docNo: docNo || '-',
    department: 'SYSTEM',
    details: details || '',
    ipAddress: ipAddress || '-',
    userAgent: userAgent || '-'
  };
  upsertSheetRecord(ss, 'AuditLogs', log);
}

