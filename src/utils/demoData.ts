// Demo data functionality has been removed
// This file is kept for reference but all demo data creation is disabled

export interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'shop_admin' | 'staff';
  shopId?: string;
  permissions: string[];
}

// Demo data arrays are commented out to prevent accidental usage
/*
export const demoUsers: DemoUser[] = [
  // Demo users removed - registration flow will be used instead
];

export const demoShops = [
  // Demo shops removed - registration flow will be used instead
];

export const demoProducts = [
  // Demo products removed - users will add their own products
];
*/

export const createDemoAccounts = async () => {
  console.log('Demo data creation is disabled. Please use the registration flow.');
  return false;
};