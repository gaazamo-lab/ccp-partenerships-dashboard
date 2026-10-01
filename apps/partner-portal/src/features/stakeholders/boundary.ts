/**
 * SRS-S081-A-02 / CON-D1: S081 holds external organisations only. Student,
 * staff and alumni records belong to NLEMS (S027), HRMS (S140) and the Alumni
 * CRM (S034). This guard catches the common ways such a record slips in — a
 * CLET or Ghana School of Law mailbox pasted as the "website", a personal
 * title in the organisation name, or a category that names a population.
 */

export const BOUNDARY_MESSAGE =
  'S081 only holds external organisations. Student, staff and alumni records belong to NLEMS (S027), HRMS (S140) and the Alumni CRM (S034).';

/** Domains issued to CLET staff and Ghana School of Law students/alumni. */
const INTERNAL_DOMAINS = ['clet.gov.gh', 'gsl.edu.gh'];

const POPULATION_WORDS =
  /\b(students?|staff(?:\s+member)?|employees?|alumn(?:us|a|i|ae)|graduates?|pupils?|trainees?|lecturers?)\b/i;
const PERSONAL_TITLE = /^(mr|mrs|ms|miss|dr|prof|professor|hon|rev|sir|madam)\.?\s+\S/i;
/**
 * Words that make a population term part of an organisation's name, e.g.
 * "National Union of Ghana Students" or "Law Students' Association".
 */
const ORGANISATION_NOUN =
  /\b(association|union|council|society|network|federation|foundation|trust|board|committee|chapter|body|institute|office|forum|league|college|school|university|faculty|academy|ministry|department|agency|commission|service|centre|center)\b/i;
const RECORD_NUMBER = /\b(index|student|staff|matric(?:ulation)?|employee)\s*(no|number|id)\b/i;

export interface BoundaryCandidate {
  name: string;
  website?: string;
  /** The category as typed — imports carry free text before it is validated. */
  category?: string;
  description?: string;
}

function hostOf(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed.split('@').pop() ?? '';
  return trimmed
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#:]/)[0]!;
}

function isInternalDomain(host: string): boolean {
  return INTERNAL_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export interface BoundaryViolation {
  /** The field that gave the record away, so a form can put the message there. */
  field: 'name' | 'website' | 'category' | 'description';
  message: string;
}

/**
 * Why the record looks like an individual student, staff or alumni record,
 * or `null` when it reads as an organisation.
 */
export function detectIndividualRecord(candidate: BoundaryCandidate): BoundaryViolation | null {
  const website = candidate.website?.trim() ?? '';
  if (website) {
    const host = hostOf(website);
    if (isInternalDomain(host)) {
      return {
        field: 'website',
        message: `${host} is a CLET / Ghana School of Law domain used by staff, students and alumni. ${BOUNDARY_MESSAGE}`,
      };
    }
    if (website.includes('@')) {
      return {
        field: 'website',
        message: `"${website}" is a personal email address, not an organisation website. ${BOUNDARY_MESSAGE}`,
      };
    }
  }

  const category = candidate.category?.trim() ?? '';
  if (category && POPULATION_WORDS.test(category)) {
    return {
      field: 'category',
      message: `"${category}" describes individuals, not an external organisation. ${BOUNDARY_MESSAGE}`,
    };
  }

  const name = candidate.name.trim();
  if (PERSONAL_TITLE.test(name)) {
    return {
      field: 'name',
      message: `"${name}" looks like a person. Add people as contacts of their organisation. ${BOUNDARY_MESSAGE}`,
    };
  }
  if (RECORD_NUMBER.test(name)) {
    return { field: 'name', message: `This looks like an individual student or staff record. ${BOUNDARY_MESSAGE}` };
  }
  if (RECORD_NUMBER.test(candidate.description ?? '')) {
    return {
      field: 'description',
      message: `The summary quotes a student or staff number. ${BOUNDARY_MESSAGE}`,
    };
  }
  // "Student" alone, "Kwame Mensah (alumnus)" — a population word with no
  // organisational noun around it.
  if (POPULATION_WORDS.test(name) && !ORGANISATION_NOUN.test(name)) {
    return {
      field: 'name',
      message: `"${name}" reads as an individual student, staff or alumni record. ${BOUNDARY_MESSAGE}`,
    };
  }
  return null;
}

