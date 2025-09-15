'use client';


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import LogoutButton from '@/components/LogoutButton';

import {
  HiMenu, HiX, HiHome, HiUsers, HiViewGrid, HiCurrencyDollar, HiChevronDown,
  HiChevronRight, HiShoppingCart, HiUserGroup, HiOutlineCube, HiOutlineCreditCard,
  HiPuzzle, HiOutlineLibrary, HiGlobeAlt, HiFlag, HiOutlineOfficeBuilding, HiCube,
  HiReceiptTax, HiChartSquareBar,
} from 'react-icons/hi';
import { SiCivicrm } from 'react-icons/si';
import { GiStockpiles } from 'react-icons/gi';
import NotificationBell from '@/components/NotificationBell';

/* ---------- Tiny reusable components ---------- */
const MenuBtn = ({ isOpen, onToggle, icon, label }) => (
  <button
    onClick={onToggle}
    className="flex items-center justify-between w-full px-4 py-2 rounded hover:bg-gray-600"
  >
    <span className="flex items-center gap-2">{icon} {label}</span>
    {isOpen ? <HiChevronDown /> : <HiChevronRight />}
  </button>
);

const Item = ({ href, icon, label, close }) => (
  
  <Link
    href={href}
    onClick={close}
    className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-600"
  >
    {icon} {label}
  </Link>
);

/* ---------- Main layout ---------- */
export default function Sidebar({ children }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [open, setOpen] = useState({ menu: null, sub: null });
  const [session, setSession] = useState(null);

  /* --- decode token --- */
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) return router.push('/');
    try {
      setSession(jwtDecode(t));
    } catch {
      localStorage.removeItem('token');
      router.push('/');
    }
  }, [router]);
  if (!session) return null;


  console.log("data of the session",session);

  /* --- roles helper --- */
  const getRoles = (s) => {
    let a = [];
    if (Array.isArray(s?.roles)) a = s.roles;
    else if (typeof s?.role === 'string') a = s.role.split(',');
    else if (Array.isArray(s?.user?.roles)) a = s.user.roles;
    else if (typeof s?.user?.role === 'string') a = s.user.role.split(',');
    return a.map((r) => r.trim().toLowerCase());
  };
  const roles = getRoles(session);
  const has = (r) => roles.includes('admin') || roles.includes(r.toLowerCase());

  /* --- visibility flags --- */
  const v = {
    masters: has('hr manager'),
    mastersView: has('hr manager'),
    tsales: has('sales manager') ,
    tpurchase: has('purchase manager'),
    crm:  has('support executive'),
    stock: has('inventory manager'),
    pay: has('accounts manager'),
    prod: has('production head'),
    project: has('project manager'),
    Employee: has('employee'),  
  };
  if (has('admin')) Object.keys(v).forEach((k) => (v[k] = true));

  const PREFIX = has('admin') ? '/admin' : '/users';
  const P = (p) => `${PREFIX}${p}`;
  const toggleMenu = (k) =>
    setOpen((o) => ({ ...o, menu: o.menu === k ? null : k, sub: null }));
  const toggleSub = (k) =>
    setOpen((o) => ({ ...o, sub: o.sub === k ? null : k }));
  const closeDrawer = () => setDrawer(false);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* mobile topbar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-800 shadow">
        <button onClick={() => setDrawer(true)} className="text-2xl">
          <HiMenu />
        </button>
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </header>
      {drawer && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto bg-gray-700 text-white transform duration-200 ${
          drawer ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:static`}
      >
        {/* mobile header inside drawer */}
        <div className="md:hidden flex items-center justify-between px-4 h-14">
          <span className="text-xl font-bold flex items-center gap-2">
            <HiHome /> Dashboard
          </span>
          <button onClick={closeDrawer} className="text-2xl">
            <HiX />
          </button>
        </div>

        <nav className="mt-6 px-2 pb-6 space-y-3">
          {/* Masters */}
          {v.masters && (
            <div>
              <MenuBtn
                isOpen={open.menu === 'm'}
                onToggle={() => toggleMenu('m')}
                icon={<HiUsers />}
                label="Masters"
              />
              {open.menu === 'm' && (
                <div className="ml-6 mt-2 space-y-1">
                  <Item
                    href={P('/createCustomers')}
                    icon={<HiUserGroup />}
                    label="Create Customer"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/Countries')}
                    icon={<HiGlobeAlt />}
                    label="Countries"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/company')}
                    icon={<HiHome />}
                    label="Company"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/State')}
                    icon={<HiFlag />}
                    label="State"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/City')}
                    icon={<HiOutlineOfficeBuilding />}
                    label="City"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/supplier')}
                    icon={<HiUserGroup />}
                    label="Supplier"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/item')}
                    icon={<HiCube />}
                    label="Item"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/WarehouseDetailsForm')}
                    icon={<HiOutlineLibrary />}
                    label="Warehouse Details"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/CreateGroup')}
                    icon={<HiUserGroup />}
                    label="Create Group"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/CreateItemGroup')}
                    icon={<HiOutlineCube />}
                    label="Create Item Group"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/account-bankhead')}
                    icon={<HiOutlineLibrary />}
                    label="Account Head"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/bank-head-details')}
                    icon={<HiCurrencyDollar />}
                    label="Bank Head"
                    close={closeDrawer}
                  />
                </div>
              )}
            </div>
          )}

          {/* Masters View */}
          {v.mastersView && (
            <div>
              <MenuBtn
                isOpen={open.menu === 'mv'}
                onToggle={() => toggleMenu('mv')}
                icon={<HiViewGrid />}
                label="Masters View"
              />
              {open.menu === 'mv' && (
                <div className="ml-6 mt-2 space-y-1">
                  <Item
                    href={P('/customer-view')}
                    icon={<HiUsers />}
                    label="Customer View"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/supplier-view')}
                    icon={<HiUserGroup />}
                    label="Supplier View"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/item-view')}
                    icon={<HiCube />}
                    label="Item View"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/account-head-view')}
                    icon={<HiOutlineLibrary />}
                    label="Account Head View"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/bank-head-view')}
                    icon={<HiCurrencyDollar />}
                    label="Bank Head View"
                    close={closeDrawer}
                  />
                </div>
              )}
            </div>
          )}

          {/* Transactions */}
          {(v.tsales || v.tpurchase) && (
            <div>
              <MenuBtn
                isOpen={open.menu === 't'}
                onToggle={() => toggleMenu('t')}
                icon={<HiOutlineCreditCard />}
                label="Transactions"
              />
              {open.menu === 't' && (
                <div className="ml-6 mt-2 space-y-1">
                  {/* Sales submenu */}
                  {v.tsales && (
                    <div>
                      <MenuBtn
                        isOpen={open.sub === 'sales'}
                        onToggle={() => toggleSub('sales')}
                        icon={<HiShoppingCart />}
                        label="Sales"
                      />
                      {open.sub === 'sales' && (
                        <div className="ml-4 mt-1 space-y-1">
                          <Item
                            href={P('/sales-quotation-view')}
                            icon={<HiChevronDown />}
                            label="Quotation View"
                            close={closeDrawer}
                          />
                          <Item
                            href={P('/sales-order-view')}
                            icon={<HiChevronRight />}
                            label="Order View"
                            close={closeDrawer}
                          />
                          <Item
                            href={P('/delivery-view')}
                            icon={<HiOutlineCube />}
                            label="Delivery View"
                            close={closeDrawer}
                           
                          />
                          <Item
                            href={P('/sales-invoice-view')}
                            icon={<HiOutlineCreditCard />}
                            label="Invoice View"
                            close={closeDrawer}
                          />
                          <Item
                            href={P('/credit-memo-view')}
                            icon={<HiReceiptTax />}
                            label="Credit Memo View"
                            close={closeDrawer}
                          />
                          <Item
                            href={P('/sales-report')}
                            icon={<HiChartSquareBar />}
                            label="Report"
                            close={closeDrawer}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Purchase submenu */}
                  {v.tpurchase && (
                    <div>
                      <MenuBtn
                        isOpen={open.sub === 'purchase'}
                        onToggle={() => toggleSub('purchase')}
                        icon={<GiStockpiles />}
                        label="Purchase"
                      />
                      {open.sub === 'purchase' && (
                        <div className="ml-4 mt-1 space-y-1">
                          <Item
                            href={P('/purchase-quotation-view')}
                            icon={<HiChevronDown />}
                            label="Quotation View"
                            close={closeDrawer}
                          />
                          <Item
                            href={P('/purchase-order-view')}
                            icon={<HiChevronRight />}
                            label="Order View"
                            close={closeDrawer}
                          />
                          <Item
                            href={P('/grn-view')}
                            icon={<HiOutlineCube />}
                            label="GRN View"
                            close={closeDrawer}
                          />
                          <Item
                            href={P('/purchase-invoice-view')}
                            icon={<HiOutlineCreditCard />}
                            label="Invoice View"
                            close={closeDrawer}
                          />
                          <Item
                            href={P('/debit-notes-view')}
                            icon={<HiReceiptTax />}
                            label="Debit Notes View"
                            close={closeDrawer}
                          />
                          <Item
                            href={P('/purchase-report')}
                            icon={<HiChartSquareBar />}
                            label="Report"
                            close={closeDrawer}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CRM */}
          {v.crm && (
            <div>
              <MenuBtn
                isOpen={open.menu === 'crm'}
                onToggle={() => toggleMenu('crm')}
                icon={<SiCivicrm />}
                label="CRM"
              />
              {open.menu === 'crm' && (
                <div className="ml-6 mt-2 space-y-1">
                  <Item
                    href={P('/LeadDetailsFormMaster')}
                    icon={<HiUserGroup />}
                    label="Lead Generation"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/OpportunityDetailsForm')}
                    icon={<HiPuzzle />}
                    label="Opportunity"
                    close={closeDrawer}
                  />
                </div>
              )}
            </div>
          )}

          {/* Stock */}
          {v.stock && (
            <div>
              <MenuBtn
                isOpen={open.menu === 'stock'}
                onToggle={() => toggleMenu('stock')}
                icon={<HiOutlineCube />}
                label="Stock"
              />
              {open.menu === 'stock' && (
                <div className="ml-6 mt-2 space-y-1">
                  <Item
                    href={P('/inventory-view')}
                    icon={<HiOutlineLibrary />}
                    label="Inventory View"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/inventory-entry')}
                    icon={<HiOutlineLibrary />}
                    label="Inventory Entry"
                    close={closeDrawer}
                  />
                </div>
              )}
            </div>
          )}

          {/* Payment */}
          {v.pay && (
            <div>
              <MenuBtn
                isOpen={open.menu === 'pay'}
                onToggle={() => toggleMenu('pay')}
                icon={<HiOutlineCreditCard />}
                label="Payment"
              />
              {open.menu === 'pay' && (
                <div className="ml-6 mt-2 space-y-1">
                  <Item
                    href={P('/payment')}
                    icon={<HiCurrencyDollar />}
                    label="Payment Form"
                    close={closeDrawer}
                  />
                </div>
              )}
            </div>
          )}

          {/* Production */}
          {v.prod && (
            <div>
              <MenuBtn
                isOpen={open.menu === 'prod'}
                onToggle={() => toggleMenu('prod')}
                icon={<HiPuzzle />}
                label="Production"
              />
              {open.menu === 'prod' && (
                <div className="ml-6 mt-2 space-y-1">
                  <Item
                    href={P('/bom')}
                    icon={<HiOutlineCube />}
                    label="BoM"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/ProductionOrder')}
                    icon={<HiReceiptTax />}
                    label="Production Order"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/bom-view')}
                    icon={<HiOutlineCube />}
                    label="BoM View"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/productionorders-list-view')}
                    icon={<HiReceiptTax />}
                    label="Production Orders View"
                    close={closeDrawer}
                  />
                </div>
              )}
            </div>
          )}

          {/* Project  */}
          {v.project && (
            <div>
              <MenuBtn
                isOpen={open.menu === 'project'}
                onToggle={() => toggleMenu('project')}
                icon={<HiPuzzle />}
                label="Project"
              />
              {open.menu === 'project' && (
                <div className="ml-6 mt-2 space-y-1">
                  <Item
                    href={P('/project/projects')}
                    icon={<HiOutlineCube />}
                    label="Project"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/project/tasks')}
                    icon={<HiReceiptTax />}
                    label="Tasks"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/project/tasks/board')}
                    icon={<HiOutlineCube />}
                    label="Task Board"
                    close={closeDrawer}
                  />

                </div>
              )}
            </div>
          )}


           {/* Empolyee */}
          {v.Employee && (
            <div>
              <MenuBtn
                isOpen={open.menu === 'Tasks'}
                onToggle={() => toggleMenu('Tasks')}
                icon={<HiPuzzle />}
                label="Tasks"
              />
              {open.menu === 'Tasks' && (
                <div className="ml-6 mt-2 space-y-1">
                  <Item
                    href={P('/tasks' )}
                    icon={<HiOutlineCube />}
                    label="Tasks"
                    close={closeDrawer}
                  />
                  <Item
                    href={P('/tasks/board' )}
                    icon={<HiReceiptTax />}
                    label="Task Board"
                    close={closeDrawer}
                  />
                </div>
              )}
            </div>
                    
          )}




          <div className="pt-4">
            <LogoutButton />
          </div>
        </nav>
      </aside>
      {/* Navbar in that i want profile and notification */}
      <header className="fixed top-0  right-0 left-0 md:left-64 bg-white shadow h-14 flex items-center justify-end px-4 z-20">
        <div className="flex items-center gap-4">
          
          <span className="text-sm">Hello, {session?.companyName || session?.email}</span>
          <img
            src="/#"
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover"
          />
          <LogoutButton />
          <NotificationBell />
        </div>
      </header>


      {/* content */}
      <main className="flex-1  md:pt-20 ">{children}</main>
    </div>
  );
}

