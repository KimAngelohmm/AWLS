export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
];

export const LOCATION_OPTIONS = [
  { value: 'on_site', label: 'On-site' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
];

export function employmentTypeLabel(value) {
  return EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === value)?.label || null;
}

export function locationLabel(value) {
  return LOCATION_OPTIONS.find((o) => o.value === value)?.label || null;
}

export function openingsLabel(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 1) return null;
  return n === 1 ? '1 opening' : `${n} openings`;
}
