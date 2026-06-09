/**
 * psfService.js
 *
 * Provides PSF (Philippine Skills Framework) competency data to the AI interview system.
 * The knowledge base is built from official PSF PDFs covering 11 industry domains.
 *
 * Usage:
 *   const { getPsfContext } = require('./psfService');
 *   const context = getPsfContext('Software Developer');
 *   // → { domain, description, functional_skills, enabling_skills, interviewGuidance }
 */

const path = require('path');
const fs = require('fs');

// Load the pre-built knowledge base once at startup
let _kb = null;
function getKb() {
  if (!_kb) {
    const kbPath = path.join(__dirname, 'psfKnowledgeBase.json');
    if (!fs.existsSync(kbPath)) {
      console.warn('[psfService] psfKnowledgeBase.json not found — PSF context will be unavailable');
      _kb = {};
    } else {
      _kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
    }
  }
  return _kb;
}

/**
 * Find the best-matching PSF domain for a given job title.
 * Matching is done by checking if any known role name appears in the job title,
 * or if any domain keyword appears in the job title.
 *
 * @param {string} jobTitle
 * @returns {{ domain: string, entry: object } | null}
 */
function findDomain(jobTitle) {
  const kb = getKb();
  if (!kb || Object.keys(kb).length === 0) return null;

  const title = jobTitle.toLowerCase();

  // 1. Exact role match — check if the job title contains a known role name
  for (const [domain, entry] of Object.entries(kb)) {
    for (const role of entry.roles) {
      if (title.includes(role.toLowerCase())) {
        return { domain, entry };
      }
    }
  }

  // 2. Domain keyword match — check if the job title contains a domain keyword
  const domainKeywords = {
    'Analytics and AI': ['data', 'analytics', 'analyst', 'ai ', 'artificial intelligence', 'machine learning', 'ml ', 'bi ', 'intelligence'],
    'Software Development and Security': ['software', 'developer', 'engineer', 'devops', 'backend', 'frontend', 'fullstack', 'full stack', 'security', 'cyber', 'qa ', 'tester', 'database', 'infrastructure'],
    'Contact Center and BPM': ['customer service', 'contact center', 'bpo', 'call center', 'support representative', 'quality analyst', 'workforce'],
    'Global In-House Center': ['shared services', 'in-house', 'gic', 'service center', 'offshore'],
    'Business Development': ['sales', 'marketing', 'business development', 'account manager', 'partnership', 'brand'],
    'Digital Art and Animation': ['animator', 'animation', 'concept artist', 'ui designer', 'motion graphics', 'visual'],
    'Electronics': ['electronics', 'semiconductor', 'technician', 'automation engineer', 'manufacturing'],
    'Game Development': ['game', 'unity', 'unreal', 'level design', 'game design'],
    'Health Information Management': ['health', 'medical', 'clinical', 'healthcare', 'coder', 'hims'],
    'Human Capital Development': ['hr ', 'human resource', 'recruiter', 'talent', 'learning and development', 'compensation', 'payroll', 'people'],
    'Supply Chain and Logistics': ['supply chain', 'logistics', 'warehouse', 'freight', 'procurement', 'transportation'],
  };

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    for (const kw of keywords) {
      if (title.includes(kw)) {
        return { domain, entry: kb[domain] };
      }
    }
  }

  return null;
}

/**
 * Get PSF-based interview context for a given job title.
 * Returns competency areas and interview guidance the AI should use.
 *
 * @param {string} jobTitle
 * @returns {{
 *   found: boolean,
 *   domain: string|null,
 *   description: string|null,
 *   functional_skills: string[],
 *   enabling_skills: string[],
 *   interviewGuidance: string
 * }}
 */
function getPsfContext(jobTitle) {
  const match = findDomain(jobTitle);

  if (!match) {
    return {
      found: false,
      domain: null,
      description: null,
      functional_skills: [],
      enabling_skills: [],
      interviewGuidance: '',
    };
  }

  const { domain, entry } = match;
  const fsc = entry.functional_skills.slice(0, 15);
  const esc = entry.enabling_skills.slice(0, 8);

  const guidance = buildInterviewGuidance(domain, jobTitle, fsc, esc, entry.description);

  return {
    found: true,
    domain,
    description: entry.description,
    functional_skills: fsc,
    enabling_skills: esc,
    interviewGuidance: guidance,
  };
}

/**
 * Build a concise interview guidance string for the AI system prompt.
 * This is injected into the AI interviewer's context so it knows what to assess.
 */
function buildInterviewGuidance(domain, jobTitle, fsc, esc, description) {
  const fscList = fsc.slice(0, 10).join(', ');
  const escList = esc.slice(0, 6).join(', ');

  return [
    `This interview is for a "${jobTitle}" role in the ${domain} domain.`,
    description ? `Domain context: ${description}` : '',
    '',
    `Based on the Philippine Skills Framework (PSF) for ${domain}, assess the applicant on:`,
    '',
    `FUNCTIONAL COMPETENCIES (technical skills to probe):`,
    fscList ? `  ${fscList}` : '  (general role competencies)',
    '',
    `ENABLING COMPETENCIES (behavioral skills to probe):`,
    escList ? `  ${escList}` : '  (communication, collaboration, problem solving)',
    '',
    `INTERVIEW APPROACH:`,
    `- Ask 4-6 targeted questions based on the competencies above`,
    `- Start with a broad question about the applicant's background in ${domain}`,
    `- Probe specific functional skills relevant to the job title`,
    `- Include at least one behavioral/situational question on enabling competencies`,
    `- Assess depth of knowledge, not just surface familiarity`,
    `- Conclude by asking about the applicant's career goals in this field`,
  ].filter(l => l !== null).join('\n');
}

/**
 * List all available PSF domains.
 * @returns {string[]}
 */
function listDomains() {
  return Object.keys(getKb());
}

/**
 * List all known roles across all domains.
 * @returns {{ role: string, domain: string }[]}
 */
function listAllRoles() {
  const kb = getKb();
  const result = [];
  for (const [domain, entry] of Object.entries(kb)) {
    for (const role of entry.roles) {
      result.push({ role, domain });
    }
  }
  return result;
}

module.exports = { getPsfContext, findDomain, listDomains, listAllRoles };
