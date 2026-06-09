export const ROLE_LABELS = {
  hr: 'HR Personnel',
  manager: 'Department Manager',
  employee: 'Employee',
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
