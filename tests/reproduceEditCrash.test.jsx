// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import MasterDataView from '../src/views/MasterDataView';
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
});

