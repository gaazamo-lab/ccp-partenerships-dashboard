/**
 * A browsable slice of the S080 DAM for the media selector. There is no DAM
 * endpoint in the S091 contract, so this list is reference data only; editors
 * can always paste any S080 asset ID or an https:// image address directly.
 */
export interface DamAsset {
  id: string;
  title: string;
  collection: string;
}

export const S080_ASSETS: readonly DamAsset[] = [
  { id: 'S080-AST-2026-0141', title: 'Call to the Bar ceremony, Accra International Conference Centre', collection: 'Ceremonies' },
  { id: 'S080-AST-2026-0152', title: 'Makola campus library reading room', collection: 'Campuses' },
  { id: 'S080-AST-2026-0167', title: 'Clinical legal education — Legal Aid clinic, Kumasi', collection: 'Programmes' },
  { id: 'S080-AST-2026-0173', title: 'Scholarship recipients with the Director of Legal Education', collection: 'Scholarships' },
  { id: 'S080-AST-2026-0188', title: 'Moot court finals, Ghana School of Law', collection: 'Programmes' },
  { id: 'S080-AST-2026-0192', title: 'Faculty development workshop, Cape Coast', collection: 'Programmes' },
  { id: 'S080-AST-2026-0204', title: 'Kumasi campus library site — architect render', collection: 'Campaigns' },
  { id: 'S080-AST-2026-0211', title: 'Student portrait — Abena, Tamale', collection: 'Scholarships' },
  { id: 'S080-AST-2026-0219', title: 'Student portrait — Kwesi, Ho', collection: 'Scholarships' },
  { id: 'S080-AST-2026-0226', title: 'Access to Justice lecture — keynote panel', collection: 'Events' },
  { id: 'S080-AST-2025-0918', title: 'Legal Education Summit 2025 — plenary hall', collection: 'Events' },
  { id: 'S080-AST-2025-0921', title: 'Legal Education Summit 2025 — partner exhibition', collection: 'Events' },
  { id: 'S080-LOGO-CLET-PRIMARY', title: 'CLET primary logo lock-up', collection: 'Brand' },
];
