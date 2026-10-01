import type {
  Microsite,
  MicrositeAnalytics,
  MicrositeBlock,
  MicrositeBlockType,
  MicrositeReview,
  MicrositeTemplate,
} from '@partner-crm/types';

import { createBlock } from '@/features/microsites/domain';

/**
 * Seed data for mock mode. Figures are illustrative; every metric carries the
 * S225/S150 reference it would be read from, and every image an S080 asset ID.
 */

export const SEED_TEMPLATES: MicrositeTemplate[] = [
  {
    id: 'tpl-annual-report',
    name: 'Annual report portal',
    purpose: 'ANNUAL_REPORT',
    description:
      'The full year in one place: headline figures from S225, fund utilisation, student and programme stories, and the downloadable report.',
    blockTypes: ['HERO', 'RICH_TEXT', 'METRICS', 'FUND_UTILISATION', 'STORY', 'QUOTE', 'GALLERY', 'DOWNLOADS', 'CALL_TO_ACTION'],
  },
  {
    id: 'tpl-donor-impact',
    name: 'Donor impact report',
    purpose: 'DONOR_IMPACT',
    description:
      'A focused report for one fund or donor group: what was given, how it was used, and the students and programmes it reached.',
    blockTypes: ['HERO', 'METRICS', 'FUND_UTILISATION', 'STORY', 'QUOTE', 'DOWNLOADS'],
  },
  {
    id: 'tpl-campaign',
    name: 'Fundraising campaign',
    purpose: 'CAMPAIGN',
    description:
      'Make the case for a single goal, show progress towards it and ask visitors to give or pledge.',
    blockTypes: ['HERO', 'RICH_TEXT', 'METRICS', 'STORY', 'CALL_TO_ACTION'],
  },
  {
    id: 'tpl-event-hub',
    name: 'Event hub',
    purpose: 'EVENT_HUB',
    description:
      'Programme, speakers, registration and post-event media for summits, lectures and ceremonies.',
    blockTypes: ['HERO', 'RICH_TEXT', 'GALLERY', 'DOWNLOADS', 'CALL_TO_ACTION'],
  },
  {
    id: 'tpl-thought-leadership',
    name: 'Thought-leadership destination',
    purpose: 'THOUGHT_LEADERSHIP',
    description:
      'Essays, lectures and policy papers from CLET faculty and partners, with a featured voice and a reading list.',
    blockTypes: ['HERO', 'RICH_TEXT', 'QUOTE', 'STORY', 'DOWNLOADS'],
  },
];

let blockCounter = 0;
function block(type: MicrositeBlockType, fields: Partial<Omit<MicrositeBlock, 'id' | 'type'>> = {}): MicrositeBlock {
  blockCounter += 1;
  return { ...createBlock(type, `blk-seed-${String(blockCounter).padStart(3, '0')}`), ...fields };
}

const NO_ANALYTICS: MicrositeAnalytics = {
  views: 0,
  uniqueVisitors: 0,
  averageSeconds: 0,
  downloads: 0,
  lastViewedAt: null,
};

export interface SeedMicrosite {
  site: Microsite;
  /** Plain in memory only — the mock stands in for the backend's hashed store. */
  accessCode: string | null;
}

export function seedMicrosites(): SeedMicrosite[] {
  blockCounter = 0;
  return [
    {
      accessCode: null,
      site: {
        id: 'ms-annual-2026',
        slug: '2026-annual-report',
        title: '2026 Annual Report',
        tagline: 'Training Ghana’s next generation of lawyers — our year in figures and stories.',
        purpose: 'ANNUAL_REPORT',
        templateId: 'tpl-annual-report',
        status: 'PUBLISHED',
        access: 'PUBLIC',
        audienceStakeholderIds: [],
        accentColor: '',
        owner: 'Efua Asante',
        version: 4,
        publishedVersion: 4,
        publishedAt: '2026-08-14T09:30:00.000Z',
        archivedAt: null,
        archiveRef: null,
        createdAt: '2026-06-02T08:15:00.000Z',
        updatedAt: '2026-08-14T09:30:00.000Z',
        analytics: {
          views: 4812,
          uniqueVisitors: 3127,
          averageSeconds: 184,
          downloads: 642,
          lastViewedAt: '2026-09-25T18:42:00.000Z',
        },
        blocks: [
          block('HERO', {
            heading: '2026 Annual Report',
            body: 'A year of wider access, stronger clinical training and record numbers called to the Bar.',
            assetRefs: ['S080-AST-2026-0141'],
          }),
          block('RICH_TEXT', {
            heading: 'From the Director of Legal Education',
            body:
              'This year the Council for Legal Education and Training welcomed its largest professional law cohort, opened a second clinical legal education centre and extended bursaries to students in all sixteen regions.\n\nEvery figure on this page is drawn from the Council’s reporting system, and every cedi entrusted to us is accounted for below. Thank you to the partners, alumni and donors who made it possible.',
          }),
          block('METRICS', {
            heading: 'The year at a glance',
            body: 'Academic year 2025/26. Figures from the S225 reporting warehouse and S150 examinations records.',
            metrics: [
              { label: 'Students in professional law training', value: '3,412', sourceRef: 'S225:gsl-enrolment-2026' },
              { label: 'New lawyers called to the Bar', value: '1,086', sourceRef: 'S225:bar-call-2025' },
              { label: 'Bar examination pass rate', value: '68%', sourceRef: 'S150:bar-exam-pass-rate-2026' },
              { label: 'Students on bursaries', value: '412', sourceRef: 'S225:bursary-recipients-2026' },
            ],
          }),
          block('FUND_UTILISATION', {
            heading: 'How partner and donor funds were used',
            body: 'Restricted and unrestricted gifts received in the 2025/26 financial year.',
            currency: 'GHS',
            allocations: [
              { label: 'Scholarships and bursaries', amount: 4_200_000 },
              { label: 'Campus infrastructure', amount: 2_600_000 },
              { label: 'Library and e-resources', amount: 1_850_000 },
              { label: 'Clinical legal education', amount: 1_300_000 },
              { label: 'Faculty development', amount: 950_000 },
              { label: 'Programme administration', amount: 700_000 },
            ],
          }),
          block('STORY', {
            heading: 'Justice closer to home in Kumasi',
            body:
              'The new Legal Aid clinic run with the Kumasi campus gave 220 final-year students supervised practice, and resolved over 600 tenancy, family and employment matters for residents who could not afford a lawyer.',
            assetRefs: ['S080-AST-2026-0167'],
          }),
          block('STORY', {
            heading: 'The first in her family to be called',
            body:
              'Abena grew up in Tamale and studied on a CLET bursary. In October she was called to the Bar and has joined the Legal Aid Commission in the Northern Region.',
            assetRefs: ['S080-AST-2026-0211'],
          }),
          block('QUOTE', {
            body: 'The bursary did more than pay my fees. It told me that someone believed a girl from Tamale belonged in this profession.',
            attribution: 'Abena M., called to the Bar, October 2025',
          }),
          block('GALLERY', {
            heading: 'Moments from the year',
            assetRefs: ['S080-AST-2026-0141', 'S080-AST-2026-0152', 'S080-AST-2026-0188', 'S080-AST-2026-0192', 'S080-AST-2026-0173', 'S080-AST-2026-0226'],
          }),
          block('DOWNLOADS', {
            heading: 'Reports and statements',
            body: 'Full documents are held in the S003 records archive.',
            links: [
              { label: 'Annual Report 2026 (PDF, 6.2 MB)', url: 'https://clet.gov.gh/reports/annual-report-2026.pdf' },
              { label: 'Audited financial statements 2025/26', url: 'https://clet.gov.gh/reports/financial-statements-2026.pdf' },
              { label: 'Bar examination statistics', url: 'https://clet.gov.gh/reports/bar-exam-statistics-2026.pdf' },
            ],
          }),
          block('CALL_TO_ACTION', {
            heading: 'Partner with us in 2027',
            body: 'Fund a bursary, sponsor a clinic or endow a library collection. Our partnerships team will show you exactly where your gift goes.',
            links: [
              { label: 'Talk to the partnerships team', url: 'mailto:partnerships@clet.gov.gh' },
              { label: 'Read the donor impact report', url: '/sites/scholarship-fund-impact-2026' },
            ],
          }),
        ],
      },
    },
    {
      accessCode: 'donor-2026',
      site: {
        id: 'ms-donor-scholarship',
        slug: 'scholarship-fund-impact-2026',
        title: 'Legal Access Scholarship Fund — Impact 2025/26',
        tagline: 'A private report for the Fund’s donors and trustees.',
        purpose: 'DONOR_IMPACT',
        templateId: 'tpl-donor-impact',
        status: 'PUBLISHED',
        access: 'PASSWORD',
        audienceStakeholderIds: [],
        accentColor: '#0F766E',
        owner: 'Efua Asante',
        version: 3,
        publishedVersion: 3,
        publishedAt: '2026-09-02T10:00:00.000Z',
        archivedAt: null,
        archiveRef: null,
        createdAt: '2026-07-10T11:00:00.000Z',
        updatedAt: '2026-09-02T10:00:00.000Z',
        analytics: {
          views: 318,
          uniqueVisitors: 96,
          averageSeconds: 263,
          downloads: 71,
          lastViewedAt: '2026-09-24T07:55:00.000Z',
        },
        blocks: [
          block('HERO', {
            heading: 'Your gift, their future',
            body: 'How the Legal Access Scholarship Fund opened the profession to 240 students this year.',
            assetRefs: ['S080-AST-2026-0173'],
          }),
          block('METRICS', {
            heading: 'Student outcomes',
            metrics: [
              { label: 'Scholars supported', value: '240', sourceRef: 'S225:lasf-scholars-2026' },
              { label: 'Completed the year', value: '94%', sourceRef: 'S150:lasf-completion-2026' },
              { label: 'Women scholars', value: '58%', sourceRef: 'S225:lasf-gender-2026' },
              { label: 'Regions represented', value: '16', sourceRef: 'S225:lasf-regions-2026' },
            ],
          }),
          block('FUND_UTILISATION', {
            heading: 'Fund utilisation',
            body: 'GHS 3.1 million received from 38 donors; 97% applied directly to students.',
            currency: 'GHS',
            allocations: [
              { label: 'Tuition and examination fees', amount: 1_980_000 },
              { label: 'Accommodation and living stipends', amount: 720_000 },
              { label: 'Books and laptops', amount: 310_000 },
              { label: 'Mentoring and placement', amount: 0 },
              { label: 'Fund administration', amount: 93_000 },
            ],
          }),
          block('STORY', {
            heading: 'Kwesi’s pupillage in Ho',
            body:
              'Kwesi is the first lawyer from his village in the Volta Region. His scholarship covered his fees and a laptop; he now serves his pupillage with a chambers in Ho that takes legal aid briefs.',
            assetRefs: ['S080-AST-2026-0219'],
          }),
          block('QUOTE', {
            body: 'We give because we have seen what one qualified lawyer can do for a whole district.',
            attribution: 'Chair of Trustees, Legal Access Scholarship Fund',
          }),
          block('DOWNLOADS', {
            heading: 'For trustees',
            links: [
              { label: 'Scholar outcomes dataset (CSV)', url: 'https://clet.gov.gh/donors/lasf-outcomes-2026.csv' },
              { label: 'Fund statement 2025/26 (PDF)', url: 'https://clet.gov.gh/donors/lasf-statement-2026.pdf' },
            ],
          }),
        ],
      },
    },
    {
      accessCode: null,
      site: {
        id: 'ms-a2j-lectures',
        slug: 'access-to-justice-lectures-2026',
        title: 'Access to Justice Lecture Series 2026',
        tagline: 'Ideas for a legal profession that serves every Ghanaian.',
        purpose: 'THOUGHT_LEADERSHIP',
        templateId: 'tpl-thought-leadership',
        status: 'IN_REVIEW',
        access: 'PUBLIC',
        audienceStakeholderIds: [],
        accentColor: '#7C2D12',
        owner: 'Akosua Mensah',
        version: 2,
        publishedVersion: null,
        publishedAt: null,
        archivedAt: null,
        archiveRef: null,
        createdAt: '2026-09-08T09:00:00.000Z',
        updatedAt: '2026-09-22T15:10:00.000Z',
        analytics: NO_ANALYTICS,
        blocks: [
          block('HERO', {
            heading: 'Access to Justice Lecture Series',
            body: 'Four evenings with judges, practitioners and scholars on legal aid, technology and the future of legal education.',
            assetRefs: ['S080-AST-2026-0226'],
          }),
          block('RICH_TEXT', {
            heading: 'Why this series',
            body: 'Two in three Ghanaians who need legal help never see a lawyer. The series asks what legal education can do about it — and publishes every lecture here.',
          }),
          block('QUOTE', {
            body: 'A law school is measured not only by the lawyers it produces, but by the people those lawyers serve.',
            attribution: 'Keynote, opening lecture',
          }),
          block('DOWNLOADS', {
            heading: 'Lecture papers',
            links: [{ label: 'Opening lecture paper (PDF)', url: 'https://clet.gov.gh/lectures/a2j-2026-opening.pdf' }],
          }),
        ],
      },
    },
    {
      accessCode: null,
      site: {
        id: 'ms-board-clinics',
        slug: 'board-briefing-clinical-expansion',
        title: 'Board briefing: clinical legal education expansion',
        tagline: 'Programme results and the case for three new regional clinics.',
        purpose: 'DONOR_IMPACT',
        templateId: 'tpl-donor-impact',
        status: 'CHANGES_REQUESTED',
        access: 'NAMED_AUDIENCE',
        audienceStakeholderIds: ['stk-001', 'stk-004'],
        accentColor: '',
        owner: 'Yaw Darko',
        version: 2,
        publishedVersion: null,
        publishedAt: null,
        archivedAt: null,
        archiveRef: null,
        createdAt: '2026-09-01T10:30:00.000Z',
        updatedAt: '2026-09-19T12:05:00.000Z',
        analytics: NO_ANALYTICS,
        blocks: [
          block('HERO', {
            heading: 'Clinical legal education: results and next steps',
            body: 'For members of the Council and invited funders.',
          }),
          block('METRICS', {
            heading: 'Programme results 2025/26',
            metrics: [
              { label: 'Students in supervised practice', value: '220', sourceRef: 'S225:cle-students-2026' },
              { label: 'Community matters resolved', value: '614', sourceRef: 'S225:cle-matters-2026' },
            ],
          }),
          block('FUND_UTILISATION', {
            heading: 'Proposed budget for three new clinics',
            currency: 'GHS',
            allocations: [
              { label: 'Clinic fit-out (Tamale, Ho, Takoradi)', amount: 1_450_000 },
              { label: 'Supervising lawyers, two years', amount: 1_120_000 },
              { label: 'Case management system', amount: 260_000 },
            ],
          }),
        ],
      },
    },
    {
      accessCode: null,
      site: {
        id: 'ms-kumasi-library',
        slug: 'build-the-kumasi-law-library',
        title: 'Build the Kumasi Law Library',
        tagline: 'GHS 12 million to give 1,200 students a library worthy of the profession.',
        purpose: 'CAMPAIGN',
        templateId: 'tpl-campaign',
        status: 'DRAFT',
        access: 'PUBLIC',
        audienceStakeholderIds: [],
        accentColor: '#B45309',
        owner: 'Officer',
        version: 1,
        publishedVersion: null,
        publishedAt: null,
        archivedAt: null,
        archiveRef: null,
        createdAt: '2026-09-23T13:20:00.000Z',
        updatedAt: '2026-09-23T13:20:00.000Z',
        analytics: NO_ANALYTICS,
        blocks: [
          block('HERO', {
            heading: 'Build the Kumasi Law Library',
            body: 'Our Kumasi students share 40 reading seats between 1,200 of them. Help us change that.',
            assetRefs: ['S080-AST-2026-0204'],
          }),
          block('RICH_TEXT', {
            heading: 'The case for a new library',
            body: '',
          }),
          block('METRICS', { heading: 'Progress towards GHS 12 million', metrics: [] }),
          block('STORY'),
          block('CALL_TO_ACTION', {
            heading: 'Pledge a reading seat',
            body: 'GHS 10,000 names a seat for a generation of law students.',
            links: [{ label: 'Pledge now', url: 'mailto:giving@clet.gov.gh' }],
          }),
        ],
      },
    },
    {
      accessCode: null,
      site: {
        id: 'ms-summit-2025',
        slug: 'legal-education-summit-2025',
        title: 'Legal Education Summit 2025',
        tagline: 'Three days on the future of legal training in West Africa.',
        purpose: 'EVENT_HUB',
        templateId: 'tpl-event-hub',
        status: 'ARCHIVED',
        access: 'PUBLIC',
        audienceStakeholderIds: [],
        accentColor: '#1E3A8A',
        owner: 'Yaw Darko',
        version: 3,
        publishedVersion: 3,
        publishedAt: '2025-10-01T08:00:00.000Z',
        archivedAt: '2026-01-15T16:00:00.000Z',
        archiveRef: 'S003/ARC/2026/0412',
        createdAt: '2025-08-20T09:00:00.000Z',
        updatedAt: '2026-01-15T16:00:00.000Z',
        analytics: {
          views: 2210,
          uniqueVisitors: 1544,
          averageSeconds: 97,
          downloads: 388,
          lastViewedAt: '2026-01-14T21:10:00.000Z',
        },
        blocks: [
          block('HERO', {
            heading: 'Legal Education Summit 2025',
            body: 'Accra, 12–14 November 2025.',
            assetRefs: ['S080-AST-2025-0918'],
          }),
          block('RICH_TEXT', {
            heading: 'Programme',
            body: 'Day one: reforming the professional law course. Day two: clinical and practical training. Day three: regional cooperation.',
          }),
          block('GALLERY', {
            heading: 'Summit photos',
            assetRefs: ['S080-AST-2025-0918', 'S080-AST-2025-0921'],
          }),
          block('DOWNLOADS', {
            heading: 'Summit papers',
            links: [{ label: 'Summit communiqué (PDF)', url: 'https://clet.gov.gh/summit-2025/communique.pdf' }],
          }),
        ],
      },
    },
  ];
}

export function seedReviews(): MicrositeReview[] {
  return [
    {
      id: 'rev-001',
      micrositeId: 'ms-annual-2026',
      version: 4,
      decision: 'SUBMITTED',
      comment: 'Final figures reconciled with S225 after the audit.',
      actor: 'Akosua Mensah',
      occurredAt: '2026-08-11T14:00:00.000Z',
    },
    {
      id: 'rev-002',
      micrositeId: 'ms-annual-2026',
      version: 4,
      decision: 'APPROVED',
      comment: 'Figures and fund utilisation match the audited statements.',
      actor: 'Kofi Boateng',
      occurredAt: '2026-08-13T10:20:00.000Z',
    },
    {
      id: 'rev-003',
      micrositeId: 'ms-donor-scholarship',
      version: 3,
      decision: 'SUBMITTED',
      comment: '',
      actor: 'Efua Asante',
      occurredAt: '2026-08-29T09:00:00.000Z',
    },
    {
      id: 'rev-004',
      micrositeId: 'ms-donor-scholarship',
      version: 3,
      decision: 'APPROVED',
      comment: 'Approved for the donor group; keep it password-protected.',
      actor: 'Kofi Boateng',
      occurredAt: '2026-09-01T16:45:00.000Z',
    },
    {
      id: 'rev-005',
      micrositeId: 'ms-a2j-lectures',
      version: 2,
      decision: 'SUBMITTED',
      comment: 'Ready for RMF review ahead of the first lecture on 10 October.',
      actor: 'Akosua Mensah',
      occurredAt: '2026-09-22T15:10:00.000Z',
    },
    {
      id: 'rev-006',
      micrositeId: 'ms-board-clinics',
      version: 2,
      decision: 'SUBMITTED',
      comment: '',
      actor: 'Yaw Darko',
      occurredAt: '2026-09-17T11:00:00.000Z',
    },
    {
      id: 'rev-007',
      micrositeId: 'ms-board-clinics',
      version: 2,
      decision: 'CHANGES_REQUESTED',
      comment: 'Add the student outcome stories and cite the S225 source for the budget lines before this goes to the Board.',
      actor: 'Kofi Boateng',
      occurredAt: '2026-09-19T12:05:00.000Z',
    },
    {
      id: 'rev-008',
      micrositeId: 'ms-summit-2025',
      version: 3,
      decision: 'SUBMITTED',
      comment: '',
      actor: 'Yaw Darko',
      occurredAt: '2025-09-26T09:00:00.000Z',
    },
    {
      id: 'rev-009',
      micrositeId: 'ms-summit-2025',
      version: 3,
      decision: 'APPROVED',
      comment: '',
      actor: 'Kofi Boateng',
      occurredAt: '2025-09-29T12:00:00.000Z',
    },
  ];
}
