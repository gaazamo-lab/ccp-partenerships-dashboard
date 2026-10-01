import type {
  Consultation,
  ConsultationAnswer,
  ConsultationInvitation,
  ConsultationResponse,
  Segment,
} from '@partner-crm/types';

/* ------------------------------------------------------------------ */
/* Deterministic generator — same seed, same data, every reload/test.  */
/* ------------------------------------------------------------------ */

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length) % items.length] as T;
}

function weighted<T>(rand: () => number, entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rand() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1]?.[0] as T;
}

function timestamp(start: string, days: number, rand: () => number) {
  const base = new Date(start).getTime();
  const offset = Math.floor(rand() * days) * 86_400_000 + (8 + Math.floor(rand() * 12)) * 3_600_000 + Math.floor(rand() * 60) * 60_000;
  return new Date(base + offset).toISOString();
}

/* ------------------------------------------------------------------ */
/* S081 segments (mock mode stand-in for GET /segments)                */
/* ------------------------------------------------------------------ */

export const initialSegments: Segment[] = [
  { id: 'SEG-UNI', name: 'Accredited universities — deans and faculty', description: 'Law faculty leadership at accredited universities.', members: 142, consented: 128, usedBy: ['S075', 'S088_consult'], updated: '2026-09-12' },
  { id: 'SEG-BAR', name: 'Ghana Bar Association regional branches', description: 'Branch executives and CPD coordinators.', members: 96, consented: 81, usedBy: ['S088_consult'], updated: '2026-09-03' },
  { id: 'SEG-EMP', name: 'Law firm and employer partners', description: 'Firms and organisations hosting pupillage and graduates.', members: 210, consented: 174, usedBy: ['S075', 'S088_consult'], updated: '2026-08-28' },
  { id: 'SEG-JUD', name: 'Judicial Service training contacts', description: 'Judicial Training Institute focal persons.', members: 48, consented: 48, usedBy: ['S088_consult'], updated: '2026-07-19' },
  { id: 'SEG-ALU', name: 'Alumni (S034) — 2020–2025 cohorts', description: 'Called-to-the-Bar alumni with confirmed contact consent.', members: 1240, consented: 962, usedBy: ['S075', 'S088_consult'], updated: '2026-09-18' },
  { id: 'SEG-STU', name: 'NLEMS students (S027) — consent confirmed', description: 'Current Ghana School of Law students who opted in to surveys.', members: 2310, consented: 1875, usedBy: ['S088_consult'], updated: '2026-09-20' },
  { id: 'SEG-DON', name: 'Donors and development partners', description: 'Programme funders and development partners.', members: 37, consented: 33, usedBy: ['S091_donor'], updated: '2026-06-30' },
];

/* ------------------------------------------------------------------ */
/* Consultations                                                       */
/* ------------------------------------------------------------------ */

const ROLES = ['Student', 'Educator', 'Legal practitioner', 'Employer', 'Member of the public'];
const FACULTIES = [
  'University of Ghana School of Law',
  'KNUST Faculty of Law',
  'UCC Faculty of Law',
  'GIMPA Law School',
  'Other',
];
const PRIORITIES = ['Clinical practice', 'Legal technology', 'Ethics', 'Research and writing', 'Alternative dispute resolution'];

const curriculumReview: Consultation = {
  id: 'CON-2026-001',
  slug: 'legal-education-curriculum-review-2026',
  title: 'Legal Education Curriculum Review 2026',
  summary: 'Help shape the knowledge and practical skills expected from future legal professionals.',
  description:
    'CLET is reviewing the legal education curriculum. We invite students, educators, employers, legal practitioners, and members of the public to share evidence and priorities for reform.',
  category: 'Legal education',
  status: 'OPEN',
  languages: ['en', 'fr', 'ar'],
  opensAt: '2026-09-01T08:00:00.000Z',
  closesAt: '2026-10-18T23:59:00.000Z',
  estimatedMinutes: 6,
  anonymousAllowed: true,
  collectIdentity: true,
  audienceSource: 'MIXED',
  audienceSegmentIds: ['SEG-UNI', 'SEG-BAR'],
  invitedCount: 209,
  responseCount: 132,
  questions: [
    { id: 'sec-about', type: 'SECTION', prompt: 'About you', description: 'Tell us which group you belong to.', required: false, translations: { fr: { prompt: 'À propos de vous', description: 'Indiquez-nous à quel groupe vous appartenez.' }, ar: { prompt: 'نبذة عنك', description: 'أخبرنا إلى أي فئة تنتمي.' } } },
    {
      id: 'role', type: 'SINGLE_CHOICE', prompt: 'Which group best describes you?', required: true, options: ROLES,
      translations: {
        fr: { prompt: 'Quel groupe vous décrit le mieux ?', options: ['Étudiant', 'Enseignant', 'Praticien du droit', 'Employeur', 'Membre du public'] },
        ar: { prompt: 'أي فئة تصفك بشكل أفضل؟', options: ['طالب', 'معلم', 'ممارس قانوني', 'صاحب عمل', 'فرد من الجمهور'] },
      },
    },
    {
      id: 'institution', type: 'DROPDOWN', prompt: 'Which law faculty are you enrolled in?', required: true, options: FACULTIES,
      visibleIf: [{ questionId: 'role', operator: 'EQUALS', value: 'Student' }],
      translations: {
        fr: { prompt: 'Dans quelle faculté de droit êtes-vous inscrit ?', options: ['Université du Ghana – Faculté de droit', 'KNUST – Faculté de droit', 'Université de Cape Coast – Faculté de droit', 'GIMPA – Faculté de droit', 'Autre'] },
        ar: { prompt: 'في أي كلية حقوق أنت مسجل؟', options: ['جامعة غانا – كلية الحقوق', 'جامعة كوامي نكروما – كلية الحقوق', 'جامعة كيب كوست – كلية الحقوق', 'معهد GIMPA – كلية الحقوق', 'أخرى'] },
      },
    },
    { id: 'sec-curriculum', type: 'SECTION', prompt: 'Curriculum', required: false, translations: { fr: { prompt: 'Programme' }, ar: { prompt: 'المنهج' } } },
    {
      id: 'preparedness', type: 'RATING', prompt: 'How well does the current curriculum prepare graduates for practice?', required: true, min: 1, max: 5,
      minLabel: 'Not at all prepared', maxLabel: 'Very well prepared',
      translations: {
        fr: { prompt: 'Dans quelle mesure le programme actuel prépare-t-il les diplômés à la pratique ?' },
        ar: { prompt: 'إلى أي مدى يُعِدّ المنهج الحالي الخريجين للممارسة المهنية؟' },
      },
    },
    {
      id: 'priorities', type: 'MULTI_CHOICE', prompt: 'Which areas should receive greater emphasis?', required: true, options: PRIORITIES,
      translations: {
        fr: { prompt: 'Quels domaines devraient recevoir davantage d’attention ?', options: ['Pratique clinique', 'Technologies juridiques', 'Déontologie', 'Recherche et rédaction', 'Modes alternatifs de règlement des différends'] },
        ar: { prompt: 'ما المجالات التي ينبغي التركيز عليها أكثر؟', options: ['الممارسة العيادية', 'التكنولوجيا القانونية', 'الأخلاقيات المهنية', 'البحث والكتابة', 'الوسائل البديلة لتسوية النزاعات'] },
      },
    },
    {
      id: 'gap', type: 'LONG_TEXT', prompt: 'What single gap most affects graduate preparedness?', required: false,
      description: 'Shown because you rated preparedness below 3.',
      visibleIf: [{ questionId: 'preparedness', operator: 'LESS_THAN', value: 3 }],
      translations: {
        fr: { prompt: 'Quelle lacune affecte le plus la préparation des diplômés ?' },
        ar: { prompt: 'ما أبرز فجوة تؤثر في جاهزية الخريجين؟' },
      },
    },
    { id: 'sec-overall', type: 'SECTION', prompt: 'Overall', required: false, translations: { fr: { prompt: 'Dans l’ensemble' }, ar: { prompt: 'بشكل عام' } } },
    {
      id: 'nps', type: 'NPS', prompt: "How likely are you to recommend CLET's legal education programmes to a colleague?", required: false, min: 0, max: 10,
      minLabel: 'Not at all likely', maxLabel: 'Extremely likely',
      translations: {
        fr: { prompt: 'Quelle est la probabilité que vous recommandiez les programmes de formation juridique du CLET à un collègue ?' },
        ar: { prompt: 'ما مدى احتمال أن توصي زميلاً ببرامج التعليم القانوني التي يقدمها CLET؟' },
      },
    },
    {
      id: 'comments', type: 'LONG_TEXT', prompt: 'What is the most important change CLET should consider?', required: false,
      translations: {
        fr: { prompt: 'Quel est le changement le plus important que le CLET devrait envisager ?' },
        ar: { prompt: 'ما أهم تغيير ينبغي أن ينظر فيه CLET؟' },
      },
    },
  ],
  triggers: [],
  themes: [
    { id: 'th-practical', label: 'Practical skills', description: 'Clinical work, pupillage, advocacy and drafting practice.' },
    { id: 'th-assessment', label: 'Assessment', description: 'Examination format, feedback and marking.' },
    { id: 'th-technology', label: 'Legal technology', description: 'Research databases, e-filing and digital practice.' },
    { id: 'th-access', label: 'Access and cost', description: 'Fees, admissions capacity and regional access.' },
  ],
  outcomeSummary: null,
  approvedBy: 'Esi Ofori (AQAI)',
  createdAt: '2026-08-12T10:00:00.000Z',
  updatedAt: '2026-09-18T14:30:00.000Z',
};

const professionalDevelopment: Consultation = {
  id: 'CON-2026-002',
  slug: 'professional-development-priorities-2027',
  title: 'Professional Development Priorities 2027',
  summary: 'Tell us which continuing professional development topics matter most for 2027.',
  description: 'This targeted consultation will inform the 2027 professional development programme for members of the Bar.',
  category: 'Professional development',
  status: 'SCHEDULED',
  languages: ['en'],
  opensAt: '2026-10-05T08:00:00.000Z',
  closesAt: '2026-11-02T23:59:00.000Z',
  estimatedMinutes: 4,
  anonymousAllowed: false,
  collectIdentity: true,
  audienceSource: 'CRM',
  audienceSegmentIds: ['SEG-BAR', 'SEG-EMP'],
  invitedCount: 255,
  responseCount: 0,
  questions: [
    { id: 'cpd-topics', type: 'MULTI_CHOICE', prompt: 'Which CPD topics would you attend in 2027?', required: true, options: ['Commercial arbitration', 'Data protection (Act 843)', 'Courtroom technology', 'Practice management', 'Legal ethics refresher'] },
    { id: 'cpd-format', type: 'SINGLE_CHOICE', prompt: 'Which format suits you best?', required: true, options: ['In person (Accra)', 'In person (regional)', 'Live webinar', 'Recorded modules'] },
    { id: 'cpd-hours', type: 'NUMBER', prompt: 'How many CPD hours do you expect to complete in 2027?', required: false, min: 0, max: 200 },
  ],
  triggers: [],
  themes: [],
  outcomeSummary: null,
  approvedBy: 'Kwabena Asante (CDT)',
  createdAt: '2026-09-10T09:00:00.000Z',
  updatedAt: '2026-09-15T11:15:00.000Z',
};

const legalLiteracy: Consultation = {
  id: 'CON-2026-003',
  slug: 'public-legal-literacy-needs',
  title: 'Public Legal Literacy Needs',
  summary: 'A completed consultation on priority topics for public legal education.',
  description: 'This consultation gathered community priorities for accessible legal information.',
  category: 'Public engagement',
  status: 'CLOSED',
  languages: ['en'],
  opensAt: '2026-06-01T08:00:00.000Z',
  closesAt: '2026-06-30T23:59:00.000Z',
  estimatedMinutes: 5,
  anonymousAllowed: true,
  collectIdentity: false,
  audienceSource: 'PUBLIC',
  audienceSegmentIds: [],
  invitedCount: null,
  responseCount: 40,
  questions: [
    { id: 'topics', type: 'MULTI_CHOICE', prompt: 'Which legal topics would you most like plain-language information on?', required: true, options: ['Land and property', 'Family and inheritance', 'Employment rights', 'Consumer protection', 'Criminal procedure'] },
    { id: 'channel', type: 'SINGLE_CHOICE', prompt: 'How do you prefer to receive legal information?', required: true, options: ['Radio', 'Social media', 'Community meetings', 'Printed leaflets', 'Website'] },
    { id: 'usefulness', type: 'RATING', prompt: 'How useful is the legal information currently available to you?', required: true, min: 1, max: 5, minLabel: 'Not useful', maxLabel: 'Very useful' },
    { id: 'suggestion', type: 'LONG_TEXT', prompt: 'What would make legal information easier to understand?', required: false },
  ],
  triggers: [],
  themes: [
    { id: 'th-language', label: 'Local languages', description: 'Requests for Twi, Ewe, Ga, Dagbani and other languages.' },
    { id: 'th-radio', label: 'Radio and community', description: 'Radio programmes and community forums.' },
  ],
  outcomeSummary:
    'Thank you to the 40 people who took part. Land and property and family and inheritance were the most requested topics, and radio and community meetings were the preferred channels — particularly outside Greater Accra.\n\nMany of you asked for information in local languages. In response, CLET will pilot a series of plain-language radio segments in Twi and Ewe from January 2027, publish summary leaflets on land registration and inheritance, and review the public legal information pages on the CLET website with community organisations.',
  approvedBy: 'Esi Ofori (AQAI)',
  createdAt: '2026-05-12T10:00:00.000Z',
  updatedAt: '2026-07-03T08:20:00.000Z',
};

const conferenceFeedback: Consultation = {
  id: 'CON-2026-004',
  slug: 'annual-legal-education-conference-feedback-2026',
  title: 'Annual Legal Education Conference 2026 — Feedback',
  summary: 'Tell us how the 2026 conference went and what to change next year.',
  description: 'Sent automatically to confirmed attendees the day after the conference (S078 event).',
  category: 'Event feedback',
  status: 'DRAFT',
  languages: ['en'],
  opensAt: '2026-11-13T08:00:00.000Z',
  closesAt: '2026-11-27T23:59:00.000Z',
  estimatedMinutes: 3,
  anonymousAllowed: true,
  collectIdentity: true,
  audienceSource: 'CRM',
  audienceSegmentIds: ['SEG-UNI', 'SEG-JUD'],
  invitedCount: 0,
  responseCount: 0,
  questions: [
    { id: 'overall', type: 'RATING', prompt: 'Overall, how would you rate the conference?', required: true, min: 1, max: 5, minLabel: 'Poor', maxLabel: 'Excellent' },
    { id: 'sessions', type: 'LONG_TEXT', prompt: 'Which session was most valuable, and why?', required: false },
  ],
  triggers: [{ id: 'TRG-001', type: 'POST_EVENT', sourceRef: 'S078-EVT-2026-014', delayDays: 1, active: true }],
  themes: [],
  outcomeSummary: null,
  approvedBy: null,
  createdAt: '2026-09-20T09:00:00.000Z',
  updatedAt: '2026-09-22T16:40:00.000Z',
};

const accreditationStandards: Consultation = {
  id: 'CON-2026-005',
  slug: 'accreditation-standards-law-faculties',
  title: 'Accreditation Standards for Law Faculties — Consultation Draft',
  summary: 'Comment on proposed minimum standards for accredited law faculties.',
  description: 'AQAI is consulting on revised minimum standards for staffing, libraries and clinical legal education at accredited law faculties.',
  category: 'Accreditation',
  status: 'REVIEW',
  languages: ['en', 'fr'],
  opensAt: '2026-10-12T08:00:00.000Z',
  closesAt: '2026-12-11T23:59:00.000Z',
  estimatedMinutes: 10,
  anonymousAllowed: true,
  collectIdentity: true,
  audienceSource: 'MIXED',
  audienceSegmentIds: ['SEG-UNI', 'SEG-ALU'],
  invitedCount: 0,
  responseCount: 0,
  questions: [
    { id: 'support', type: 'SINGLE_CHOICE', prompt: 'Do you support the proposed staffing ratio of one full-time lecturer per 25 students?', required: true, options: ['Support', 'Support with changes', 'Oppose', 'No view'], translations: { fr: { prompt: 'Soutenez-vous le ratio proposé d’un enseignant à temps plein pour 25 étudiants ?', options: ['Je soutiens', 'Je soutiens avec modifications', 'Je m’oppose', 'Sans avis'] } } },
    { id: 'changes', type: 'LONG_TEXT', prompt: 'What changes would you make?', required: true, visibleIf: [{ questionId: 'support', operator: 'EQUALS', value: 'Support with changes' }], translations: { fr: { prompt: 'Quelles modifications proposeriez-vous ?' } } },
    { id: 'clinic-hours', type: 'NUMBER', prompt: 'Minimum supervised clinical hours you would require per student', required: false, min: 0, max: 500 },
  ],
  triggers: [{ id: 'TRG-002', type: 'CALENDAR', sourceRef: 'Accreditation cycle — Q4 2026', delayDays: 0, active: false }],
  themes: [],
  outcomeSummary: null,
  approvedBy: null,
  createdAt: '2026-09-05T09:00:00.000Z',
  updatedAt: '2026-09-24T10:05:00.000Z',
};

export const initialConsultations: Consultation[] = [
  curriculumReview,
  professionalDevelopment,
  legalLiteracy,
  conferenceFeedback,
  accreditationStandards,
];

/* ------------------------------------------------------------------ */
/* Responses                                                           */
/* ------------------------------------------------------------------ */

const COMMENT_POOL: Array<[string, string[]]> = [
  ['More supervised practical work would improve confidence.', ['th-practical']],
  ['Moot courts should be assessed, not optional.', ['th-practical', 'th-assessment']],
  ['Examination results take too long and give no feedback.', ['th-assessment']],
  ['Students need access to online law reports and research databases.', ['th-technology']],
  ['Introduce training on e-filing before the courts go fully digital.', ['th-technology']],
  ['Fees are a barrier for students from the northern regions.', ['th-access']],
  ['Admission numbers are too limited for the demand.', ['th-access']],
  ['Pupillage placements should be coordinated by CLET.', ['th-practical']],
  ['Drafting of contracts and pleadings needs much more time.', ['th-practical']],
  ['Ethics should be taught through real case studies.', []],
  ['Regional campuses would help working students.', ['th-access']],
  ['Legal research skills are weak among new entrants.', []],
];

const NAMES = ['Kofi Boateng', 'Abena Owusu', 'Yaw Darko', 'Akosua Frimpong', 'Kwame Mensah', 'Efua Quansah', 'Selorm Agbeko', 'Fatima Iddrisu'];

function curriculumResponses(): ConsultationResponse[] {
  const rand = random(88);
  return Array.from({ length: 130 }, (_, index) => {
    const role = weighted(rand, [['Student', 38], ['Educator', 14], ['Legal practitioner', 26], ['Employer', 12], ['Member of the public', 10]] as const);
    const preparedness = weighted(rand, [[1, 8], [2, 22], [3, 34], [4, 26], [5, 10]] as const);
    const priorities = PRIORITIES.filter(() => rand() < 0.38);
    if (!priorities.length) priorities.push(pick(rand, PRIORITIES));
    const answers: Record<string, ConsultationAnswer> = { role, preparedness, priorities };
    if (role === 'Student') answers.institution = weighted(rand, [[FACULTIES[0] as string, 5], [FACULTIES[1] as string, 3], [FACULTIES[2] as string, 2], [FACULTIES[3] as string, 2], ['Other', 1]] as const);
    const themes: Record<string, string[]> = {};
    if (preparedness < 3 && rand() < 0.7) {
      const [text, themeIds] = pick(rand, COMMENT_POOL);
      answers.gap = text;
      if (index % 2 === 0 && themeIds.length) themes.gap = themeIds;
    }
    if (rand() < 0.8) answers.nps = Math.min(10, Math.max(0, Math.round(preparedness * 1.6 + rand() * 3)));
    if (rand() < 0.55) {
      const [text, themeIds] = pick(rand, COMMENT_POOL);
      answers.comments = text;
      if (index % 3 !== 0 && themeIds.length) themes.comments = themeIds;
    }
    const consent = rand() < 0.18;
    const name = pick(rand, NAMES);
    return {
      id: `RES-1${String(index + 3).padStart(3, '0')}`,
      consultationId: 'CON-2026-001',
      submittedAt: timestamp('2026-09-02T00:00:00.000Z', 24, rand),
      language: weighted(rand, [['en', 86], ['fr', 9], ['ar', 5]] as const),
      answers,
      consentToIdentityLink: consent,
      respondent: consent ? { name, email: `${name.toLowerCase().replace(' ', '.')}@example.com`, stakeholderGroup: role } : null,
      themes,
    };
  });
}

function literacyResponses(): ConsultationResponse[] {
  const rand = random(303);
  const suggestions: Array<[string, string[]]> = [
    ['Explain the law in Twi on local radio.', ['th-language', 'th-radio']],
    ['Short videos in Ewe and Ga would reach more people.', ['th-language']],
    ['Hold community durbars with lawyers answering questions.', ['th-radio']],
    ['Avoid legal jargon and give examples.', []],
  ];
  return Array.from({ length: 40 }, (_, index) => {
    const topics = ['Land and property', 'Family and inheritance', 'Employment rights', 'Consumer protection', 'Criminal procedure'].filter((_, position) => rand() < ([0.7, 0.6, 0.35, 0.25, 0.2][position] ?? 0));
    const answers: Record<string, ConsultationAnswer> = {
      topics: topics.length ? topics : ['Land and property'],
      channel: weighted(rand, [['Radio', 14], ['Social media', 9], ['Community meetings', 8], ['Printed leaflets', 4], ['Website', 5]] as const),
      usefulness: weighted(rand, [[1, 6], [2, 12], [3, 12], [4, 7], [5, 3]] as const),
    };
    const themes: Record<string, string[]> = {};
    if (rand() < 0.6) {
      const [text, themeIds] = pick(rand, suggestions);
      answers.suggestion = text;
      if (themeIds.length) themes.suggestion = themeIds;
    }
    return {
      id: `RES-3${String(index + 1).padStart(3, '0')}`,
      consultationId: 'CON-2026-003',
      submittedAt: timestamp('2026-06-01T00:00:00.000Z', 30, rand),
      language: 'en',
      answers,
      consentToIdentityLink: false,
      respondent: null,
      themes,
    };
  });
}

export const initialResponses: ConsultationResponse[] = [
  {
    id: 'RES-001', consultationId: 'CON-2026-001', submittedAt: '2026-09-18T10:20:00.000Z', language: 'en',
    answers: { role: 'Student', institution: 'KNUST Faculty of Law', preparedness: 3, priorities: ['Clinical practice', 'Legal technology'], nps: 7, comments: 'More supervised practical work would improve confidence.' },
    consentToIdentityLink: false, respondent: null, themes: { comments: ['th-practical'] },
  },
  {
    id: 'RES-002', consultationId: 'CON-2026-001', submittedAt: '2026-09-18T12:45:00.000Z', language: 'en',
    answers: { role: 'Employer', preparedness: 2, priorities: ['Research and writing', 'Ethics'], gap: 'Drafting of opinions and pleadings.', nps: 5, comments: 'Writing and professional judgement need stronger assessment.' },
    consentToIdentityLink: true, respondent: { name: 'Ama Mensah', email: 'ama@example.com', stakeholderGroup: 'Employer' }, themes: { comments: ['th-assessment'] },
  },
  ...curriculumResponses(),
  ...literacyResponses(),
];

/* ------------------------------------------------------------------ */
/* Invitations (S074 sends)                                            */
/* ------------------------------------------------------------------ */

export const initialInvitations: ConsultationInvitation[] = [
  {
    id: 'INV-001', consultationId: 'CON-2026-001', kind: 'INVITATION', segmentIds: ['SEG-UNI', 'SEG-BAR'],
    recipientCount: 209, excludedCount: 29, communicationRef: 'S074-CON-2026-001-001', sentBy: 'Nana Adjei', sentAt: '2026-09-01T09:00:00.000Z',
  },
  {
    id: 'INV-002', consultationId: 'CON-2026-001', kind: 'REMINDER', segmentIds: ['SEG-UNI', 'SEG-BAR'],
    recipientCount: 131, excludedCount: 107, communicationRef: 'S074-CON-2026-001-002', sentBy: 'Nana Adjei', sentAt: '2026-09-15T09:00:00.000Z',
  },
];
