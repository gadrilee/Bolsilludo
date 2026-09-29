export const BUDGET_ROLES = ['owner', 'admin', 'editor', 'viewer'] as const;

export type BudgetRole = (typeof BUDGET_ROLES)[number];

const ROLE_WEIGHT: Record<BudgetRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export function isBudgetRole(role: string): role is BudgetRole {
  return BUDGET_ROLES.some((validRole) => validRole === role);
}

export function roleMeetsMinimum(role: string, minimumRole: string): boolean {
  if (!isBudgetRole(role) || !isBudgetRole(minimumRole)) return false;
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[minimumRole];
}