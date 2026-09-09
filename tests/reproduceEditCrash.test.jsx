// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import MasterDataView from '../src/views/MasterDataView';
import StockCardView from '../src/views/StockCardView';
import ProductCRUDModal from '../src/components/admin/ProductCRUDModal';
import VendorCRUDModal from '../src/components/admin/VendorCRUDModal';
import StorageLocationCRUDModal from '../src/components/admin/StorageLocationCRUDModal';
import { ROLES } from '../src/config/constants';
import { act } from 'react';

describe('Reproduce Edit Modal Crash', () => {
  const dummyProduct = {
    id: 'PROD-001',
    code: 'PD-OIL-001',
    name: 'น้ำมันหล่อลื่น',
    category: 'PD',
    price: 1500,
    stockBalance: 10,
    reorderPoint: 5,
    unit: 'ถัง',
    locationId: 'LOC-PD-001',
    locationName: 'ชั้นวาง A-01 (สารหล่อลื่น & น้ำมัน)'
  };

  const dummyVendor = {
    id: 'VEND-001',
    code: 'V-001',
    name: 'PTT Lubricants',
    department: 'PD'
  };

  const dummyLocation = {
    id: 'LOC-PD-001',
    name: 'ชั้นวาง A-01 (สารหล่อลื่น & น้ำมัน)',
    department: 'PD'
  };

  it('renders ProductCRUDModal in happy-dom when editing a product', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ProductCRUDModal
          editProd={dummyProduct}
          product={dummyProduct}
          products={[dummyProduct]}
          vendors={[dummyVendor]}
          storageLocations={[dummyLocation]}
          currentRole={ROLES.REQUESTER_PD}
          onClose={() => {}}
        />
      );
    });

    expect(document.body.innerHTML).toContain('แก้ไขข้อมูลสินค้า Master Data');
  });

  it('renders and clicks edit on a location', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MasterDataView
          products={[dummyProduct]}
          vendors={[dummyVendor]}
          storageLocations={[dummyLocation]}
          users={[]}
          currentRole={ROLES.REQUESTER_PD}
          onRefresh={() => {}}
        />
      );
    });

    // Switch to locations tab
    const locTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('จุดจัดเก็บสินค้า'));
    expect(locTabBtn).not.toBeNull();
    await act(async () => {
      locTabBtn.click();
    });

    const editLocBtn = document.querySelector('button[title="แก้ไขจุดจัดเก็บ"]');
    expect(editLocBtn).not.toBeNull();
    await act(async () => {
      editLocBtn.click();
    });

    expect(document.body.innerHTML).toContain('แก้ไขจุดจัดเก็บสินค้า');
  });

  it('renders and clicks edit on a vendor', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MasterDataView
          products={[dummyProduct]}
          vendors={[dummyVendor]}
          storageLocations={[dummyLocation]}
          users={[]}
          currentRole={ROLES.REQUESTER_PD}
          onRefresh={() => {}}
        />
      );
    });

    // Switch to vendors tab
    const vendorTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('รายชื่อผู้ขาย'));
    expect(vendorTabBtn).not.toBeNull();
    await act(async () => {
      vendorTabBtn.click();
    });

    const editVendorBtn = document.querySelector('button[title="แก้ไขข้อมูลผู้ขาย"]');
    expect(editVendorBtn).not.toBeNull();
    await act(async () => {
      editVendorBtn.click();
    });

    expect(document.body.innerHTML).toContain('แก้ไขข้อมูลผู้ขาย');
  });

  it('renders and clicks edit on a product when vendors and storageLocations are empty arrays', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <MasterDataView
          products={[{
            id: 'PROD-EMPTY',
            code: 'PD-EMPTY',
            name: 'สินค้าทดสอบ',
            category: 'PD',
            price: '',
            stockBalance: '',
            reorderPoint: '',
            locationId: 'LOC-NON-EXISTENT',
            locationName: 'จุดเก็บที่ไม่มีอยู่'
          }]}
          vendors={[]}
          storageLocations={[]}
          users={[]}
          currentRole={ROLES.REQUESTER_PD}
          onRefresh={() => {}}
        />
      );
    });

    const editBtn = document.querySelector('button[title="แก้ไขสินค้า"]');
    expect(editBtn).not.toBeNull();
    await act(async () => {
      editBtn.click();
    });

    expect(document.body.innerHTML).toContain('แก้ไขข้อมูลสินค้า Master Data');
  });

  it('handles null, undefined, and ghost rows gracefully without white screen crash', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const corruptProducts = [
      null,
      undefined,
      {},
      { id: 'P1', code: 'P1', name: 'Valid Product 1', price: null, stockBalance: null, locationId: null },
      { id: 'P2', code: null, name: null }
    ];

    const corruptVendors = [
      null,
      undefined,
      {},
      { id: 'V1', code: 'V1', name: 'Valid Vendor 1', department: null }
    ];

    const corruptLocations = [
      null,
      undefined,
      {},
      { id: 'L1', name: null },
      { id: 'L2', name: 'Valid Location 1', department: null }
    ];

    await act(async () => {
      root.render(
        <MasterDataView
          products={corruptProducts}
          vendors={corruptVendors}
          storageLocations={corruptLocations}
          users={[]}
          currentRole={ROLES.REQUESTER_PD}
          onRefresh={() => {}}
        />
      );
    });

    // 1. Edit Product with corrupt records present in arrays
    const editProdBtn = document.querySelector('button[title="แก้ไขสินค้า"]');
    expect(editProdBtn).not.toBeNull();
    await act(async () => {
      editProdBtn.click();
    });
    expect(document.body.innerHTML).toContain('แก้ไขข้อมูลสินค้า Master Data');

    // Close product modal
    const closeBtn = document.querySelector('button[aria-label="Close modal"]');
    if (closeBtn) {
      await act(async () => {
        closeBtn.click();
      });
    }

    // 2. Switch to Vendors and Edit Vendor
    const vendorTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('รายชื่อผู้ขาย'));
    await act(async () => {
      vendorTabBtn.click();
    });
    const editVendorBtn = document.querySelector('button[title="แก้ไขข้อมูลผู้ขาย"]');
    expect(editVendorBtn).not.toBeNull();
    await act(async () => {
      editVendorBtn.click();
    });
    expect(document.body.innerHTML).toContain('แก้ไขข้อมูลผู้จัดจำหน่าย / คู่ค้า');

    // Close vendor modal
    const closeVendorBtn = document.querySelector('button[aria-label="Close modal"]');
    if (closeVendorBtn) {
      await act(async () => {
        closeVendorBtn.click();
      });
    }

    // 3. Switch to Locations and Edit Location
    const locTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('จุดจัดเก็บสินค้า'));
    await act(async () => {
      locTabBtn.click();
    });
    const editLocBtn = document.querySelector('button[title="แก้ไขจุดจัดเก็บ"]');
    expect(editLocBtn).not.toBeNull();
    await act(async () => {
      editLocBtn.click();
    });
    expect(document.body.innerHTML).toContain('แก้ไขจุดจัดเก็บสินค้า');
  });

  it('handles NUMERIC location name, vendor code, and product code without (u || "").trim is not a function error', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Numeric values from Google Sheets (e.g., cell formatted as number)
    const numericLocations = [
      { id: 'L-NUM-1', name: 101, department: 'PD' },
      { id: 'L-NUM-2', name: 202, department: 'ALL' }
    ];

    const numericVendors = [
      { id: 'V-NUM-1', code: 9999, name: 'Vendor 9999', department: 'PD' }
    ];

    const numericProducts = [
      { id: 'P-NUM-1', code: 12345, name: 'Product 12345', price: 50, stockBalance: 10, unit: 'ชิ้น', locationId: 'L-NUM-1' }
    ];

    await act(async () => {
      root.render(
        <MasterDataView
          products={numericProducts}
          vendors={numericVendors}
          storageLocations={numericLocations}
          users={[]}
          currentRole={ROLES.REQUESTER_PD}
          onRefresh={() => {}}
        />
      );
    });

    // 1. Edit Product with numeric code
    const editProdBtn = document.querySelector('button[title="แก้ไขสินค้า"]');
    expect(editProdBtn).not.toBeNull();
    await act(async () => {
      editProdBtn.click();
    });
    expect(document.body.innerHTML).toContain('แก้ไขข้อมูลสินค้า Master Data');

    const closeBtn = document.querySelector('button[aria-label="Close modal"]');
    if (closeBtn) {
      await act(async () => {
        closeBtn.click();
      });
    }

    // 2. Edit Location with numeric name (101)
    const locTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('จุดจัดเก็บสินค้า'));
    await act(async () => {
      locTabBtn.click();
    });
    const editLocBtn = document.querySelector('button[title="แก้ไขจุดจัดเก็บ"]');
    expect(editLocBtn).not.toBeNull();
    await act(async () => {
      editLocBtn.click();
    });
    expect(document.body.innerHTML).toContain('แก้ไขจุดจัดเก็บสินค้า');
    expect(document.body.innerHTML).not.toContain('(u || "").trim is not a function');
  });

  it('allows qa.backend to open StockCardView with numeric product codes without localeCompare crash', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const qaRole = {
      id: 'QA_BACKEND',
      roleId: 'QA_BACKEND',
      name: 'QA ตรวจระบบหลังบ้าน',
      title: 'Backend QA',
      department: 'ALL',
      level: 99,
      canViewAllDepts: true,
      canManageMaster: true,
      canManageUsers: true
    };

    const productsWithNumericCodes = [
      { id: 'P-1', code: 101, name: 'Numeric Item 1', stockBalance: 5, reorderPoint: 10, category: 'PD' },
      { id: 'P-2', code: 202, name: 'Numeric Item 2', stockBalance: 20, reorderPoint: 5, category: 'QC' },
      { id: 'P-3', code: 'PD-OIL-01', name: 'Regular Item', stockBalance: 0, reorderPoint: 10, category: 'PD' },
      null,
      {}
    ];

    await act(async () => {
      root.render(
        <StockCardView
          products={productsWithNumericCodes}
          storageLocations={[]}
          stockLogs={[]}
          currentRole={qaRole}
          onQuickPR={() => {}}
          onRefresh={() => {}}
        />
      );
    });

    expect(document.body.innerHTML).toContain('คลังสินค้าและสต็อก');
    expect(document.body.innerHTML).not.toContain('localeCompare is not a function');
  });
});

