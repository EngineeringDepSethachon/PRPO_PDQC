import { describe, it, expect, beforeEach } from 'vitest';
import './setup.js';
import { ROLES } from '../src/config/constants';
import { workflowEngine } from '../src/services/workflowEngine';
import { storageService } from '../src/services/storageService';

describe('Scenario 2: PR Lifecycle & Workflow Transitions', () => {
  beforeEach(() => {
    storageService.resetData();
  });

  it('PR Number Generation follows prefix + seq + year format', () => {
    const prNoPD = workflowEngine.generatePRNo('PD');
    const currentYear = new Date().getFullYear();
    expect(prNoPD).toMatch(new RegExp(`^PD\\d{3}/${currentYear}$`));

    const prNoQC = workflowEngine.generatePRNo('QC');
    expect(prNoQC).toMatch(new RegExp(`^QC\\d{3}/${currentYear}$`));
  });

  it('Submit PR changes status from DRAFT to SUBMITTED and appends activity log', async () => {
    // Setup products & a draft PR
    storageService.saveProducts([
      { id: 'PROD-1', code: 'P01', name: 'Item 1', category: 'PD', price: 1000, stockBalance: 10, unit: 'pcs' }
    ]);

    const createdPR = await workflowEngine.createPR({
      department: 'PD',
      source: 'FACTORY',
      purchaseChannel: 'SELF',
      requiredDate: '2026-09-01',
      items: [{ productId: 'PROD-1', code: 'P01', name: 'Item 1', qty: 5, price: 1000 }],
      totalAmount: 5000,
      reason: 'General production supply',
      isDraft: true
    }, ROLES.REQUESTER_PD);

    expect(createdPR.status).toBe('DRAFT');

    // Submit PR
    const submittedPR = await workflowEngine.submitPR(createdPR.id, ROLES.REQUESTER_PD);
    expect(submittedPR.status).toBe('SUBMITTED');
    expect(submittedPR.activityLog.some(l => l.action.includes('ส่งพิจารณา'))).toBe(true);

    // Check Assistant Manager can action SUBMITTED PR
    expect(workflowEngine.canAction(ROLES.ASST_MANAGER, submittedPR)).toBe(true);
    // Requester cannot action submitted PR (waiting for review)
    expect(workflowEngine.canAction(ROLES.REQUESTER_PD, submittedPR)).toBe(false);
  });

  it('Review Level 1: Asst Manager can REVIEW or REJECT_TO_DRAFT', async () => {
    const pr = await workflowEngine.createPR({
      department: 'QC',
      source: 'OFFICE',
      purchaseChannel: 'SELF',
      requiredDate: '2026-09-01',
      items: [{ productId: 'P-QC-1', code: 'QC01', name: 'QC Tube', qty: 2, price: 500 }],
      totalAmount: 1000,
      reason: 'Lab testing',
      isDraft: false
    }, ROLES.REQUESTER_QC);

    // Review Pass
    const { pr: reviewedPR } = await workflowEngine.updatePRStatus(pr.id, 'REVIEWED', ROLES.ASST_MANAGER, 'ข้อมูลครบถ้วน ผ่านการตรวจสอบ');
    expect(reviewedPR.status).toBe('REVIEWED');

    // Now Plant Manager can action
    expect(workflowEngine.canAction(ROLES.PLANT_MANAGER, reviewedPR)).toBe(true);
  });

  it('Reject to Draft sends PR back to Requester for modifications', async () => {
    const pr = await workflowEngine.createPR({
      department: 'PD',
      source: 'FACTORY',
      purchaseChannel: 'SELF',
      requiredDate: '2026-09-01',
      items: [{ productId: 'P1', code: 'P01', name: 'Item', qty: 10, price: 1000 }],
      totalAmount: 10000,
      reason: 'Test',
      isDraft: false
    }, ROLES.REQUESTER_PD);

    const { pr: rejectedPR } = await workflowEngine.updatePRStatus(pr.id, 'REJECTED_TO_DRAFT', ROLES.ASST_MANAGER, 'ขอปรับลดจำนวนลง');
    expect(rejectedPR.status).toBe('REJECTED_TO_DRAFT');

    // Requester can now action and edit again
    expect(workflowEngine.canAction(ROLES.REQUESTER_PD, rejectedPR)).toBe(true);

    // Requester edits and resubmits the PR with adjusted quantity
    const updatedPR = await workflowEngine.updatePR(rejectedPR.id, {
      department: 'PD',
      source: 'FACTORY',
      purchaseChannel: 'SELF',
      requiredDate: '2026-09-05',
      items: [{ productId: 'P1', code: 'P01', name: 'Item', qty: 5, price: 1000 }],
      note: 'ปรับลดจำนวนเหลือ 5 ชิ้นตามคำแนะนำ'
    }, ROLES.REQUESTER_PD, false);

    expect(updatedPR.status).toBe('SUBMITTED');
    expect(updatedPR.items[0].purchaseQty).toBe(5);
    expect(updatedPR.totalAmount).toBe(5000);
    expect(updatedPR.activityLog.some(l => l.action.includes('PR Resubmitted') || l.action.includes('แก้ไขและส่งใบ PR ใหม่'))).toBe(true);

    // Asst Manager can now review the resubmitted PR
    expect(workflowEngine.canAction(ROLES.ASST_MANAGER, updatedPR)).toBe(true);
  });

  it('Newly created PR is preserved after GAS sync with empty or partial remote data', async () => {
    // 1. Requester creates a new PR
    const newPR = await workflowEngine.createPR({
      department: 'QC',
      items: [{ productId: 'P-QC-TEST', qty: 3, price: 1200, name: 'น้ำยาเคมี' }],
      totalAmount: 3600
    }, ROLES.REQUESTER_QC, false);

    expect(newPR).toBeDefined();
    expect(newPR.prNo).toMatch(/^QC\d{3}\/\d{4}$/);

    // 2. Simulate GAS sync where remote returns empty array (e.g. fresh sheet)
    storageService.loadFromGAS({ prs: [] });

    // 3. Verify local PR is NOT wiped out
    const prsAfterEmptySync = storageService.getPRs();
    expect(prsAfterEmptySync.length).toBeGreaterThan(0);
    expect(prsAfterEmptySync.some(p => p.id === newPR.id || p.prNo === newPR.prNo)).toBe(true);

    // 4. Simulate GAS sync where remote returns existing PR plus another PR
    const remotePR = {
      id: 'PR-REMOTE-001',
      prNumber: 'PD999/2026',
      department: 'PD',
      requester: 'คุณสมชาย',
      status: 'APPROVED',
      totalAmount: 15000,
      items: []
    };
    storageService.loadFromGAS({ prs: [remotePR] });

    // 5. Verify BOTH the newly created local PR and remote PR exist in merged list
    const prsAfterMerge = storageService.getPRs();
    expect(prsAfterMerge.some(p => p.id === newPR.id || p.prNo === newPR.prNo)).toBe(true);
    expect(prsAfterMerge.some(p => p.prNo === 'PD999/2026')).toBe(true);
  });

  it('Deleted PR in Google Sheets is removed from frontend upon GAS sync', () => {
    // 1. Existing synced PRs (already in Google Sheets, so no _pendingGasSync)
    const pr1 = { id: 'PR-1', prNo: 'PD001/2026', department: 'PD', status: 'SUBMITTED', items: [] };
    const pr2 = { id: 'PR-2', prNo: 'PD002/2026', department: 'PD', status: 'SUBMITTED', items: [] };
    storageService.savePRs([pr1, pr2]);
    expect(storageService.getPRs().length).toBe(2);

    // 2. User deletes PR-2 from Google Sheets (remote returns only PR-1)
    storageService.loadFromGAS({ prs: [pr1] });
    const prsAfterDelete = storageService.getPRs();
    expect(prsAfterDelete.length).toBe(1);
    expect(prsAfterDelete.some(p => p.id === 'PR-2')).toBe(false);

    // 3. User deletes all PRs from Google Sheets (remote returns empty array)
    storageService.loadFromGAS({ prs: [] });
    expect(storageService.getPRs().length).toBe(0);
  });

  it('Level 2 (Reviewer/Asst Manager) edits PR items successfully even when pr.activityLog is undefined or null', async () => {
    // 1. Setup PR where activityLog is undefined (simulating Google Sheets flat sync)
    const rawPRFromSheets = {
      id: 'PR-SHEETS-001',
      prNo: 'PD005/2026',
      department: 'PD',
      status: 'SUBMITTED',
      totalAmount: 10000,
      items: [
        { productId: 'P-1', code: 'P01', name: 'Item 1', qty: 10, purchaseQty: 10, price: 1000, total: 10000 }
      ],
      activityLog: undefined
    };
    storageService.savePRs([rawPRFromSheets]);

    // 2. Level 2 (Asst Manager) edits price and quantity
    const updatedItems = [
      { productId: 'P-1', code: 'P01', name: 'Item 1', qty: 8, purchaseQty: 8, price: 900, total: 7200 }
    ];

    // Must NOT throw "Cannot read properties of undefined (reading 'push')"
    const result = await workflowEngine.editPRItems('PR-SHEETS-001', updatedItems, ROLES.ASST_MANAGER, 'ต่อรองราคาได้เหลือ 900 บาท');

    expect(result).toBeDefined();
    expect(result.totalAmount).toBe(7200);
    expect(result.items[0].purchaseQty).toBe(8);
    expect(result.items[0].price).toBe(900);
    expect(Array.isArray(result.activityLog)).toBe(true);
    expect(result.activityLog.length).toBe(1);
    expect(result.activityLog[0].action).toContain('แก้ไขรายการสินค้า');
    expect(result.activityLog[0].note).toContain('ต่อรองราคาได้เหลือ 900 บาท');

    // 3. Test when activityLog is null
    const prWithNullLog = {
      id: 'PR-SHEETS-002',
      prNo: 'PD006/2026',
      department: 'PD',
      status: 'SUBMITTED',
      totalAmount: 5000,
      items: [
        { productId: 'P-2', code: 'P02', name: 'Item 2', qty: 5, purchaseQty: 5, price: 1000, total: 5000 }
      ],
      activityLog: null
    };
    storageService.savePRs([...storageService.getPRs(), prWithNullLog]);

    const result2 = await workflowEngine.editPRItems('PR-SHEETS-002', [
      { productId: 'P-2', code: 'P02', name: 'Item 2', qty: 4, purchaseQty: 4, price: 1000, total: 4000 }
    ], ROLES.ASST_MANAGER, 'ปรับลดตามงบ');

    expect(result2).toBeDefined();
    expect(result2.totalAmount).toBe(4000);
    expect(Array.isArray(result2.activityLog)).toBe(true);
    expect(result2.activityLog.length).toBe(1);
  });

  it('My Workspace: When Level 2 reviews PR, document moves to "waiting" tab, not "action" tab', async () => {
    // 1. Create two PRs: one PD, one QC
    const prPD = await workflowEngine.createPR({
      department: 'PD',
      items: [{ productId: 'P-1', qty: 2, price: 500, name: 'Item PD' }],
      totalAmount: 1000
    }, ROLES.REQUESTER_PD, false);

    const prQC = await workflowEngine.createPR({
      department: 'QC',
      items: [{ productId: 'P-2', qty: 1, price: 800, name: 'Item QC' }],
      totalAmount: 800
    }, ROLES.REQUESTER_QC, false);

    // Initial state: Both PRs are SUBMITTED
    // For Asst Manager: both should be in "action" (To Do)
    let tasksL2 = workflowEngine.getUserTasks(ROLES.ASST_MANAGER, [prPD, prQC], []);
    expect(tasksL2.action.length).toBe(2);
    expect(tasksL2.waiting.length).toBe(0);

    // For Requester PD: prPD should be in "waiting" (รอผู้อื่นดำเนินการ), not in "action"
    let tasksReq = workflowEngine.getUserTasks(ROLES.REQUESTER_PD, [prPD, prQC], []);
    expect(tasksReq.action.length).toBe(0);
    expect(tasksReq.waiting.some(t => t.id === prPD.id)).toBe(true);

    // 2. Asst Manager reviews prPD -> status becomes REVIEWED
    const { pr: reviewedPD } = await workflowEngine.updatePRStatus(prPD.id, 'REVIEWED', ROLES.ASST_MANAGER, 'ผ่านการตรวจสอบขั้นที่ 1');
    expect(reviewedPD.status).toBe('REVIEWED');

    // 3. Now Asst Manager checks My Workspace tasks again
    tasksL2 = workflowEngine.getUserTasks(ROLES.ASST_MANAGER, [reviewedPD, prQC], []);
    // prPD (REVIEWED) MUST move to "waiting" tab!
    expect(tasksL2.waiting.some(t => t.id === reviewedPD.id)).toBe(true);
    // prPD MUST NOT be in "action" tab!
    expect(tasksL2.action.some(t => t.id === reviewedPD.id)).toBe(false);
    // prQC (SUBMITTED) should still be in "action" tab!
    expect(tasksL2.action.some(t => t.id === prQC.id)).toBe(true);
    expect(tasksL2.action.length).toBe(1);

    // 4. For Plant Manager (Level 3 Approver):
    // reviewedPD should now be in "action" (To Do for Plant Mgr to approve)
    const tasksL3 = workflowEngine.getUserTasks(ROLES.PLANT_MANAGER, [reviewedPD, prQC], []);
    expect(tasksL3.action.some(t => t.id === reviewedPD.id)).toBe(true);
    // prQC is SUBMITTED (Level 2 hasn't reviewed yet), so Plant Mgr has it in waiting
    expect(tasksL3.action.some(t => t.id === prQC.id)).toBe(false);

    // 5. For Admin who performed the review on reviewedPD:
    // If Admin performed review on reviewedPD, reviewedPD should be in waiting for Admin too
    const adminUser = { ...ROLES.ADMIN, name: ROLES.ASST_MANAGER.name };
    const tasksAdmin = workflowEngine.getUserTasks(adminUser, [reviewedPD, prQC], []);
    expect(tasksAdmin.waiting.some(t => t.id === reviewedPD.id)).toBe(true);
    expect(tasksAdmin.action.some(t => t.id === reviewedPD.id)).toBe(false);
    expect(tasksAdmin.action.some(t => t.id === prQC.id)).toBe(true);
  });
});


