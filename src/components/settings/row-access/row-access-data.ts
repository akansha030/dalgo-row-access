/**
 * Mock data for the Row access (row-level security) prototype.
 * Mirrors the 12 Nov spec's ATECF example (district · taluka · dam_id).
 * Design sandbox only — nothing here reaches the API.
 */

export type RowState = 'ok' | 'none' | 'all';
export type PersonStatus = 'access' | 'everything' | 'nothing';

export interface PreviewPerson {
  id: string;
  name: string;
  role: string;
  email: string;
  /** Plain-language summary of this person's scope. */
  view: string;
  rows: string;
  state: RowState;
  status: PersonStatus;
  /** Shown in the expanded row — why they see what they see. */
  reason: string;
}

export type Severity = 'critical' | 'minor';

/** One row revealed when a group issue's "see more" is expanded. */
export interface AffectedItem {
  primary: string;
  secondary?: string;
}

export interface FixIssue {
  id: string;
  severity: Severity;
  title: string;
  desc: string;
  fix?: boolean;
  personId?: string;
  /** Group issues (not tied to one named person) reveal their members on expand. */
  affected?: { cta: string; items: AffectedItem[] };
}

/** The columns Dalgo reads from the uploaded CSV (names must match the data — no mapping). */
export const DETECTED_COLUMNS: { name: string; role: 'who' | 'filter' }[] = [
  { name: 'email', role: 'who' },
  { name: 'district', role: 'filter' },
  { name: 'taluka', role: 'filter' },
  { name: 'dam_id', role: 'filter' },
];

/** Tables the rule touches — shown per person in the expanded row. */
export const TABLES: { name: string; cols: string[] }[] = [
  { name: 'silt_daily', cols: ['district', 'taluka'] },
  { name: 'dam_register', cols: ['district', 'taluka', 'dam_id'] },
  { name: 'farmer_list', cols: [] }, // no scope column — shows in full
];

/** Dashboards Members can open — scoped, or showing full where a table isn't filtered. */
export const DASHBOARDS: { name: string; filtered: boolean }[] = [
  { name: 'District overview', filtered: true },
  { name: 'Dam register', filtered: true },
  { name: 'State summary', filtered: false }, // uses farmer_list — Members see full
];

export const PEOPLE: PreviewPerson[] = [
  { id: 'priya', name: 'Priya Nair', role: 'member', email: 'priya@atecf.org', view: 'Ahilyanagar · Pune', rows: '2,410', state: 'ok', status: 'access', reason: 'Scoped to Ahilyanagar and Pune, all talukas and dams.' },
  { id: 'rahul', name: 'Rahul Deshmukh', role: 'member', email: 'rahul@mh.gov.in', view: 'Solapur · Pandharpur', rows: '1,204', state: 'ok', status: 'access', reason: 'Scoped to Solapur district, Pandharpur taluka.' },
  { id: 'anjali', name: 'Anjali K.', role: 'member', email: 'lead@atecf.org', view: 'all rows', rows: '8,330', state: 'all', status: 'everything', reason: '* on every column, so this member sees all rows.' },
  { id: 'anita', name: 'Anita S.', role: 'member', email: 'anita@atecf.org', view: 'Parner · Ashti', rows: '862', state: 'ok', status: 'access', reason: 'Talukas Parner and Ashti, inside Ahilyanagar and Beed.' },
  { id: 'sunil', name: 'Sunil K.', role: 'member', email: 'sunil@atecf.org', view: 'All Pune + Sinnar (Nashik)', rows: '3,145', state: 'ok', status: 'access', reason: 'Two rows add up: all of Pune, plus only Sinnar in Nashik.' },
  { id: 'sunita', name: 'Sunita P.', role: 'member', email: 'sunita@partner.org', view: 'Dam D-104', rows: '120', state: 'ok', status: 'access', reason: 'One dam: Beed · Ashti · D-104.' },
  { id: 'newuser', name: 'New user', role: 'member', email: 'new.user@atecf.org', view: 'Solapur · (taluka blank)', rows: '0', state: 'none', status: 'nothing', reason: 'Taluka is blank, and a blank cell means no access, so nothing from any table with a taluka column.' },
  { id: 'deepak', name: 'Deepak V.', role: 'member', email: 'deepak@atecf.org', view: '“Ahmednagar” (not found)', rows: '0', state: 'none', status: 'nothing', reason: '“Ahmednagar” isn’t in your data. Did you mean “Ahilyanagar”? Fix the spelling.' },
  { id: 'meena', name: 'Meena R.', role: 'member', email: 'meena@atecf.org', view: 'no row on the list', rows: '0', state: 'none', status: 'nothing', reason: 'Meena is a Dalgo member but has no row on the list, so she sees nothing. Add a row.' },
  { id: 'farida', name: 'Farida K.', role: 'member', email: 'farida@atecf.org', view: 'Beed · Ashti', rows: '540', state: 'ok', status: 'access', reason: 'Scoped to Beed district, Ashti taluka.' },
  { id: 'harish', name: 'Harish P.', role: 'member', email: 'harish@atecf.org', view: 'Nagpur', rows: '430', state: 'ok', status: 'access', reason: 'Scoped to Nagpur district.' },
  { id: 'gita', name: 'Gita M.', role: 'member', email: 'gita@atecf.org', view: 'Nashik · Niphad', rows: '611', state: 'ok', status: 'access', reason: 'Scoped to Nashik district, Niphad taluka.' },
];

/**
 * Needs attention — grouped by severity.
 * Critical = someone is locked out or the rule is broken. Minor = worth a look, no one blocked.
 */
export const ISSUES: FixIssue[] = [
  // ----- Critical -----
  {
    id: 'noemail',
    severity: 'critical',
    title: '3 rows have no email',
    desc: 'Those rows can’t be matched to anyone, so they’re ignored. Add an email to each, or remove them.',
    fix: true,
    affected: {
      cta: 'See the 3 rows',
      items: [
        { primary: 'Row 14', secondary: 'Solapur · Pandharpur · email blank' },
        { primary: 'Row 22', secondary: 'Pune · Haveli · email blank' },
        { primary: 'Row 31', secondary: 'Beed · Ashti · D-104 · email blank' },
      ],
    },
  },
  {
    id: 'newuser',
    severity: 'critical',
    title: 'New user has no taluka',
    desc: 'A blank cell means no access, so they’ll see nothing. Add their taluka, or * for all.',
    fix: true,
    personId: 'newuser',
  },
  {
    id: 'deepak',
    severity: 'critical',
    title: '“Ahmednagar” matches no data',
    desc: 'Your data has “Ahilyanagar”, likely the same place. Fix the spelling so Deepak sees his rows.',
    fix: true,
    personId: 'deepak',
  },
  {
    id: 'meena',
    severity: 'critical',
    title: 'Meena R. has no row on the list',
    desc: 'She’s a Dalgo member with no row, so she sees nothing. Add a row for her.',
    fix: true,
    personId: 'meena',
  },
  // ----- Minor -----
  {
    id: 'partial',
    severity: 'minor',
    title: 'Partial scope on farmer_list',
    desc: 'Some people are scoped to taluka, but farmer_list has only district, so they’ll see the whole district there.',
    affected: {
      cta: 'See the 5 people',
      items: [
        { primary: 'Rahul Deshmukh', secondary: 'Solapur · Pandharpur, so all of Solapur on farmer_list' },
        { primary: 'Anita S.', secondary: 'Parner · Ashti, so all of Ahilyanagar and Beed' },
        { primary: 'Farida K.', secondary: 'Beed · Ashti, so all of Beed' },
        { primary: 'Gita M.', secondary: 'Nashik · Niphad, so all of Nashik' },
        { primary: 'Sunita P.', secondary: 'Dam D-104, so all of Beed' },
      ],
    },
  },
  {
    id: 'samecol',
    severity: 'minor',
    title: '“state” column looks unrelated',
    desc: 'A column named state holds application status, not a place, so its values never match the list. Consider excluding that table.',
    affected: {
      cta: 'See the values',
      items: [
        { primary: 'approved' },
        { primary: 'pending' },
        { primary: 'in_review' },
        { primary: 'rejected' },
      ],
    },
  },
  {
    id: 'trim',
    severity: 'minor',
    title: 'Trimmed extra spaces on 2 emails',
    desc: 'We cleaned these automatically, no action needed.',
    affected: {
      cta: 'See the 2 emails',
      items: [
        { primary: 'anita@atecf.org', secondary: 'had a trailing space' },
        { primary: 'gita@atecf.org', secondary: 'had a leading space' },
      ],
    },
  },
];
