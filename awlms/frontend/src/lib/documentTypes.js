export const DOCUMENT_FIELDS = [
  { name: 'resume', label: 'Resume / CV', required: true },
  { name: 'government_id', label: 'Government ID', required: true },
  { name: 'photo', label: '2×2 Photo', required: true },
  { name: 'tor', label: 'Transcript of Records (TOR)', required: false },
  { name: 'diploma', label: 'Diploma', required: false },
  { name: 'nbi_clearance', label: 'NBI Clearance', required: false },
  { name: 'certificate', label: 'Certificates', required: false },
  { name: 'portfolio', label: 'Portfolio', required: false },
  { name: 'cover_letter', label: 'Cover Letter', required: false },
  { name: 'other', label: 'Other Supporting Documents', required: false },
];

export const REQUIRED_DOCUMENT_TYPES = DOCUMENT_FIELDS.filter((field) => field.required).map((field) => field.name);

export const DOCUMENT_TYPE_LABELS = Object.fromEntries(
  DOCUMENT_FIELDS.map((field) => [field.name, field.label])
);
