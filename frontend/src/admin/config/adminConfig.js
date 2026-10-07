// Secret obfuscated path for the admin portal
export const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || '/kv-portal-7x9';

export const ADMIN_ROLE_LABELS = {
  super_admin: 'Super Admin / Owner',
  manager: 'Store Manager',
  order_staff: 'Order & Support Staff',
  inventory_staff: 'Inventory Specialist',
  content_editor: 'Content Editor',
  accountant: 'Financial Auditor',
};

export const ADMIN_NAV_SECTIONS = [
  {
    title: 'Core',
    items: [
      {
        label: 'Dashboard',
        path: `${ADMIN_PATH}/dashboard`,
        icon: 'FiGrid',
        permission: null, // all authenticated staff
      },
    ],
  },
  {
    title: 'Store Operations',
    items: [
      {
        label: 'Products Catalog',
        path: `${ADMIN_PATH}/products`,
        icon: 'FiPackage',
        permission: 'products:read',
      },
      {
        label: 'Categories',
        path: `${ADMIN_PATH}/categories`,
        icon: 'FiFolder',
        permission: 'products:read',
      },
      {
        label: 'Live Inventory',
        path: `${ADMIN_PATH}/inventory`,
        icon: 'FiLayers',
        permission: 'products:read',
      },
      {
        label: 'Orders & Fulfillment',
        path: `${ADMIN_PATH}/orders`,
        icon: 'FiShoppingBag',
        permission: 'orders:read',
      },
      {
        label: 'Customers',
        path: `${ADMIN_PATH}/customers`,
        icon: 'FiUsers',
        permission: 'customers:read',
      },
    ],
  },
  {
    title: 'Marketing & Content',
    items: [
      {
        label: 'Coupons & Discounts',
        path: `${ADMIN_PATH}/coupons`,
        icon: 'FiTag',
        permission: 'coupons:read',
      },
      {
        label: 'Content & Banners',
        path: `${ADMIN_PATH}/content`,
        icon: 'FiFileText',
        permission: 'content:read',
      },
    ],
  },
  {
    title: 'Governance & Security',
    items: [
      {
        label: 'Audit Trail',
        path: `${ADMIN_PATH}/audit-logs`,
        icon: 'FiShield',
        roles: ['super_admin'],
      },
      {
        label: 'Staff Management',
        path: `${ADMIN_PATH}/staff`,
        icon: 'FiUserCheck',
        roles: ['super_admin'],
      },
      {
        label: 'Store Settings',
        path: `${ADMIN_PATH}/settings`,
        icon: 'FiSettings',
        roles: ['super_admin'],
      },
    ],
  },
];
