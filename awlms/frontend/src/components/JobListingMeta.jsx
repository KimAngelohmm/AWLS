import {
  employmentTypeLabel,
  locationLabel,
  openingsLabel,
} from '../lib/jobLabels.js';

/** Shared meta line for public job cards and apply header */
export default function JobListingMeta({ job, className = 'careers-card-meta' }) {
  if (!job) return null;
  const parts = [
    job.department_name,
    employmentTypeLabel(job.employment_type),
    locationLabel(job.location),
    openingsLabel(job.number_of_openings),
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    <p className={className}>
      {parts.map((part, i) => (
        <span key={`${part}-${i}`}>
          {i > 0 ? <span className="careers-card-meta-sep"> · </span> : null}
          {part}
        </span>
      ))}
    </p>
  );
}
