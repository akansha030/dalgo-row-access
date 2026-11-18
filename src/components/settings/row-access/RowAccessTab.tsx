'use client';

import { Fragment, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Lock,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastInfo, toastSuccess } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PEOPLE,
  ISSUES,
  TABLES,
  DASHBOARDS,
  DETECTED_COLUMNS,
  type PreviewPerson,
  type PersonStatus,
  type FixIssue,
} from './row-access-data';

/**
 * Row Level Security — v2 (per the 16 Nov design-feedback meeting).
 * Alerts-first, blocking-gated flow: upload → blocking checks (halt if any) →
 * funnel review (summary + alerts over a searchable member list, Preview-as-User)
 * → Save & Proceed → Saved (live, with an org on/off toggle).
 */

type Stage = 'setup' | 'review' | 'saved';

/** Prototype-only demo flows — each pill jumps to a scenario's starting point. */
type FlowId = 'start' | 'blocked' | 'review' | 'live';
const FLOWS: { id: FlowId; label: string }[] = [
  { id: 'start', label: 'Full' },
  { id: 'blocked', label: 'File has errors' },
  { id: 'review', label: 'Ideal' },
  { id: 'live', label: 'Live' },
];

/** The draft has two views: the raw file (before) and the resolved preview (after). */
type DraftView = 'file' | 'preview';

const RLS_DESCRIPTION =
  'Restrict the data members can see on shared dashboards based on their assigned access rules. Members will have view-only access.';

const DEFAULT_FILE = 'district-officers-row-access.csv';
const BLOCKING_COUNT = ISSUES.filter((i) => i.severity === 'blocking').length;

/**
 * User-facing consequence of each check — what it means for a member's access.
 * Replaces the system "Warning / Info" labels: the severity rides on the row (a dot),
 * and the list is ordered locked-out → sees-more → good-to-know.
 */
type AlertCategory = 'nothing' | 'more' | 'fyi';
const ALERT_CATEGORY: Record<string, AlertCategory> = {
  noemail: 'nothing',
  newuser: 'nothing',
  deepak: 'nothing',
  meena: 'nothing',
  partial: 'more',
  samecol: 'fyi',
  trim: 'fyi',
  admininfile: 'fyi',
};
const CATEGORY_ORDER: Record<AlertCategory, number> = { nothing: 0, more: 1, fyi: 2 };
const CATEGORY_DOT: Record<AlertCategory, string> = {
  nothing: 'bg-red-500', // a member will see nothing (locked out)
  more: 'bg-amber-500', // sees more than you set
  fyi: 'bg-muted-foreground/40', // good to know
};
const categoryOf = (id: string): AlertCategory => ALERT_CATEGORY[id] ?? 'fyi';

export function RowAccessTab() {
  const [stage, setStage] = useState<Stage>('setup');
  const [enabled, setEnabled] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [draftView, setDraftView] = useState<DraftView>('file');
  const [fileName, setFileName] = useState(DEFAULT_FILE);
  const [flow, setFlow] = useState<FlowId>('start');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => fileInputRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setBlocked(false); // clean upload in the prototype — straight to the draft
      setDraftView('file'); // show the file's contents first (the "before")
      setStage('review');
      // Keep the active flow: Full shows alerts, Ideal stays the clean happy path.
    }
    e.target.value = '';
  };

  // Prototype flow pills jump straight to a scenario's starting state.
  const applyFlow = (id: FlowId) => {
    setFlow(id);
    setFileName(DEFAULT_FILE);
    setDraftView('file');
    switch (id) {
      case 'start': // Full — begin at setup, toggle off; upload shows the review with alerts
        setEnabled(false);
        setStage('setup');
        setBlocked(false);
        break;
      case 'review': // Ideal — happy path: toggle on, upload a clean file, review with no alerts
        setEnabled(true);
        setStage('setup');
        setBlocked(false);
        break;
      case 'blocked':
        setEnabled(true);
        setStage('review');
        setBlocked(true);
        break;
      case 'live':
        setEnabled(true);
        setStage('saved');
        setBlocked(false);
        break;
    }
  };

  // In the draft / blocked header, turning the toggle off disables and returns to setup.
  const disableFromDraft = (next: boolean) => {
    if (!next) {
      setEnabled(false);
      setStage('setup');
      setFlow('start');
      setDraftView('file');
    }
  };

  return (
    <div data-testid="row-access-tab">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
        data-testid="row-access-file-input"
      />

      {stage === 'setup' && (
        <UploadStage enabled={enabled} onToggle={setEnabled} onChoose={openFilePicker} />
      )}
      {stage === 'review' &&
        (blocked ? (
          <BlockedGate
            fileName={fileName}
            enabled={enabled}
            onToggle={disableFromDraft}
            onReplace={openFilePicker}
            onReupload={openFilePicker}
          />
        ) : (
          <FunnelReview
            fileName={fileName}
            draftView={draftView}
            enabled={enabled}
            ideal={flow === 'review'}
            onToggle={disableFromDraft}
            onShowFile={() => setDraftView('file')}
            onShowPreview={() => setDraftView('preview')}
            onReplace={openFilePicker}
            onSaveProceed={() => {
              setStage('saved');
              setFlow('live');
            }}
          />
        ))}
      {stage === 'saved' && <SavedState fileName={fileName} onReplace={openFilePicker} />}

      <FlowSwitcher active={flow} onSelect={applyFlow} raised={stage === 'review' && !blocked} />
    </div>
  );
}

/** Prototype-only flow switcher — floats at bottom-centre, jumps between demo scenarios. */
function FlowSwitcher({
  active,
  onSelect,
  raised = false,
}: {
  active: FlowId;
  onSelect: (id: FlowId) => void;
  raised?: boolean;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4',
        raised ? 'bottom-24' : 'bottom-5',
      )}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border bg-background/95 p-1 shadow-lg backdrop-blur">
        <span className="px-2 text-xs font-medium text-muted-foreground">Flow</span>
        {FLOWS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            data-testid={`row-access-flow-${f.id}`}
            className={cn(
              'cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              active === f.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Feature heading + description — shared across stages. */
function RlsHeader() {
  return (
    <>
      <h2 className="text-xl font-semibold">Row Level Security</h2>
      <p className="mt-1 max-w-4xl text-sm text-muted-foreground">{RLS_DESCRIPTION}</p>
    </>
  );
}

/** The uploaded-file row: Replace file always; Download only once saved. */
function FileRow({
  fileName,
  onReplace,
  showDownload = false,
}: {
  fileName: string;
  onReplace: () => void;
  showDownload?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <span className="text-sm font-semibold">{fileName}</span>
        <span className="ml-2 text-sm text-muted-foreground">46 rows</span>
      </div>
      {showDownload && (
        <a
          href={`${import.meta.env.BASE_URL}row-access-template.csv`}
          download
          aria-label="Download the file"
          data-testid="row-access-download-file"
          className="inline-grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Download className="size-4" />
        </a>
      )}
      <Button variant="outline" size="sm" onClick={onReplace} data-testid="row-access-replace">
        Replace file
      </Button>
    </div>
  );
}

/** The "Enable Row Level Security" header, kept across the journey, with the uploaded file below. */
function EnableCard({
  enabled,
  onToggle,
  fileName,
  onReplace,
  showDownload = false,
  children,
}: {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  fileName: string;
  onReplace: () => void;
  showDownload?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-base font-semibold">Enable Row Level Security</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{RLS_DESCRIPTION}</p>
        </div>
        <ToggleSwitch on={enabled} onChange={onToggle} />
      </div>
      <div className="mt-6 border-t pt-6">
        <FileRow fileName={fileName} onReplace={onReplace} showDownload={showDownload} />
        {children}
      </div>
    </div>
  );
}

/** Impact summary — the scope of the rule (members / datasets / dashboards). Shown in review + saved. */
function ImpactSummary({ memberCount }: { memberCount: number }) {
  const datasets = TABLES.filter((t) => t.cols.length).length;
  return (
    <div className="rounded-lg border bg-background p-6" data-testid="row-access-summary">
      <h3 className="text-base font-semibold">Impact summary</h3>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Stat value={memberCount} label="Members scoped" />
        <Stat value={datasets} label="Datasets filtered" />
        <Stat value={DASHBOARDS.length} label="Dashboards affected" />
      </div>
    </div>
  );
}

/** First-time setup: an on/off toggle that, when on, reveals the file upload + CSV template. */
function UploadStage({
  enabled,
  onToggle,
  onChoose,
}: {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  onChoose: () => void;
}) {
  return (
    <div className="rounded-lg border bg-background p-6" data-testid="row-access-upload">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-base font-semibold">Enable Row Level Security</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{RLS_DESCRIPTION}</p>
        </div>
        <ToggleSwitch on={enabled} onChange={onToggle} />
      </div>

      {enabled && (
        <div className="mt-6 border-t pt-6" data-testid="row-access-upload-reveal">
          <Button variant="primary" onClick={onChoose} data-testid="row-access-choose-file">
            <Upload className="mr-2 size-4" />
            Choose file
          </Button>

          <p className="mt-4 text-sm text-muted-foreground">
            The template is a CSV with your members already filled in and the columns Dalgo needs.{' '}
            <a
              href={`${import.meta.env.BASE_URL}row-access-template.csv`}
              download
              className="cursor-pointer font-medium text-primary hover:underline"
              data-testid="row-access-download-template"
            >
              Download template
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

/** Blocking gate: if any blocking checks fail, show only those and halt the flow. */
function BlockedGate({
  fileName,
  enabled,
  onToggle,
  onReplace,
  onReupload,
}: {
  fileName: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  onReplace: () => void;
  onReupload: () => void;
}) {
  const blocking = ISSUES.filter((i) => i.severity === 'blocking');
  const [openId, setOpenId] = useState<string | null>(blocking[0]?.id ?? null);
  const one = blocking.length === 1;

  return (
    <div data-testid="row-access-blocked">
      <EnableCard enabled={enabled} onToggle={onToggle} fileName={fileName} onReplace={onReplace}>
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">
            Fix {one ? 'this' : `these ${blocking.length}`} before you can continue
          </p>
          <div className="divide-y rounded-lg border border-red-200 bg-red-50/50 px-4">
            {blocking.map((issue) => (
              <AlertItem
                key={issue.id}
                issue={issue}
                open={openId === issue.id}
                onToggle={() => setOpenId(openId === issue.id ? null : issue.id)}
              />
            ))}
          </div>
        </div>
      </EnableCard>

      <div className="mt-6">
        <p className="mb-3 text-sm text-muted-foreground">
          You can’t preview access until {one ? 'it’s' : 'these are'} fixed.
        </p>
        <Button variant="primary" onClick={onReupload} data-testid="row-access-blocked-reupload">
          Re-upload fixed file
        </Button>
      </div>
    </div>
  );
}

/**
 * The review (Draft) — two sequential steps:
 *   Step 1 (file): the uploaded list as typed, with a single Preview CTA.
 *   Step 2 (preview): summary + alert summary, then the applied member preview.
 */
function FunnelReview({
  fileName,
  draftView,
  enabled,
  ideal,
  onToggle,
  onShowFile,
  onShowPreview,
  onReplace,
  onSaveProceed,
}: {
  fileName: string;
  draftView: DraftView;
  enabled: boolean;
  ideal: boolean;
  onToggle: (next: boolean) => void;
  onShowFile: () => void;
  onShowPreview: () => void;
  onReplace: () => void;
  onSaveProceed: () => void;
}) {
  // Ideal (happy path) resolves to a tidy file where everyone is properly scoped.
  const people = ideal ? PEOPLE.map((p) => (p.clean ? { ...p, ...p.clean } : p)) : PEOPLE;

  const header = (
    <EnableCard enabled={enabled} onToggle={onToggle} fileName={fileName} onReplace={onReplace} />
  );

  // Step 1 — the uploaded file (before). One CTA: Preview.
  if (draftView === 'file') {
    return (
      <div className="pb-24" data-testid="row-access-review">
        {header}
        <div className="mt-6 rounded-lg border bg-background p-6">
          <h3 className="text-base font-semibold">The list you uploaded</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            What’s in the file, before row access is applied.
          </p>
          <div className="mt-4">
            <FileContentTable people={people} />
          </div>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-start border-t bg-background/95 px-6 py-4 backdrop-blur md:left-56">
          <Button variant="primary" onClick={onShowPreview} data-testid="row-access-preview-cta">
            <Eye className="mr-2 size-4" />
            Preview access
          </Button>
        </div>
      </div>
    );
  }

  // Step 2 — impact summary + alerts, then the applied preview list.
  // Demo set: one locked-out, one sees-more, two good-to-know; full taxonomy lives in dalgo-rls-errors-map.md.
  const DEMO_ALERT_IDS = ['newuser', 'partial', 'samecol', 'trim'];
  const shownAlerts = ISSUES.filter((i) => i.severity !== 'blocking' && DEMO_ALERT_IDS.includes(i.id));

  return (
    <div className="pb-24" data-testid="row-access-review">
      {header}

      <div className="mt-6">
        <ImpactSummary memberCount={people.length} />
      </div>

      {/* Alert summary — shown in Full; hidden on the Ideal happy path */}
      {!ideal && (
        <div className="mt-6 rounded-lg border bg-background p-6" data-testid="row-access-alerts">
          <h3 className="text-base font-semibold">Needs attention</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Review how these rules affect member access before applying the configuration.
          </p>
          <AlertsPanel issues={shownAlerts} />
        </div>
      )}

      {/* The applied preview list */}
      <div className="mt-6 rounded-lg border bg-background p-6">
        <h3 className="text-base font-semibold">Preview</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          What each member sees once row access is on.
        </p>
        <div className="mt-4">
          <PreviewList people={people} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-start gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur md:left-56">
        <Button variant="outline" onClick={onShowFile} data-testid="row-access-back">
          Back
        </Button>
        <Button variant="primary" onClick={onSaveProceed} data-testid="row-access-save-proceed">
          Save &amp; Proceed
        </Button>
      </div>
    </div>
  );
}

/** The raw uploaded list — one row per member, the scope columns exactly as typed (the "before"). */
function FileContentTable({ people = PEOPLE }: { people?: PreviewPerson[] }) {
  const cols = DETECTED_COLUMNS.filter((c) => c.role === 'filter');
  const rows = people.filter((p) => p.inFile);
  return (
    <div className="rounded-lg border" data-testid="row-access-file-table">
      <div className="max-h-[600px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Member</th>
              {cols.map((c) => (
                <th key={c.name} className="px-4 py-2.5 font-mono text-xs font-medium normal-case">
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b last:border-0" data-testid={`row-access-file-row-${p.id}`}>
                <td className="px-4 py-3 align-top">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </td>
                {cols.map((c) => {
                  const v = p.file?.[c.name as 'district' | 'taluka' | 'dam_id'] ?? '';
                  return (
                    <td key={c.name} className="px-4 py-3 align-top font-mono text-xs">
                      {v === '' ? (
                        <span className="italic text-muted-foreground/60">blank</span>
                      ) : v === '*' ? (
                        <span className="text-muted-foreground">* (all)</span>
                      ) : (
                        v
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        Shown as uploaded. <span className="font-mono">*</span> means all, a blank cell means none.
      </p>
    </div>
  );
}

/** Saved (live): the on/off toggle (with confirmation) + the live member list. */
function SavedState({ fileName, onReplace }: { fileName: string; onReplace: () => void }) {
  const [enabled, setEnabled] = useState(true);
  const [confirmOff, setConfirmOff] = useState(false);

  const handleToggle = (next: boolean) => {
    if (next) {
      setEnabled(true);
      toastSuccess.generic('Row level security turned on');
    } else {
      setConfirmOff(true);
    }
  };

  return (
    <div data-testid="row-access-saved">
      <EnableCard
        enabled={enabled}
        onToggle={handleToggle}
        fileName={fileName}
        onReplace={onReplace}
        showDownload
      />

      {enabled && (
        <>
          <div className="mt-6">
            <ImpactSummary memberCount={PEOPLE.length} />
          </div>
          <div className="mt-6 rounded-lg border bg-background p-6">
            <h3 className="mb-3 text-base font-semibold">Preview</h3>
            <PreviewList />
          </div>
        </>
      )}

      {confirmOff && (
        <ConfirmDialog
          title="Turn off row level security?"
          body="Every member will see all rows on shared dashboards again. Your configuration file is kept, so you can turn it back on later."
          confirmLabel="Turn off"
          onCancel={() => setConfirmOff(false)}
          onConfirm={() => {
            setEnabled(false);
            setConfirmOff(false);
            toastInfo.generic('Row level security turned off. Every member can see all rows again.');
          }}
        />
      )}
    </div>
  );
}

/** The applied preview — a table of each member, what they see, and a Preview-as-user action. */
function PreviewList({ people = PEOPLE }: { people?: PreviewPerson[] }) {
  const [q, setQ] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PreviewPerson | null>(null);
  const [view, setView] = useState<{
    person: PreviewPerson;
    dashboard: string;
    filtered: boolean;
  } | null>(null);

  const needle = q.trim().toLowerCase();
  const matches = needle
    ? people.filter(
        (p) => p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle),
      )
    : people;

  const seeTheirRows = people.filter((p) => p.status === 'access').length;
  const seeEverything = people.filter((p) => p.status === 'everything').length;
  const seeNothing = people.filter((p) => p.status === 'nothing').length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{people.length} members</span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-semibold text-foreground">{seeTheirRows}</span> see their rows
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-semibold text-foreground">{seeEverything}</span> sees everything
          </span>
          <span aria-hidden>·</span>
          <span className={cn(seeNothing > 0 && 'text-amber-700')}>
            <span className="font-semibold">{seeNothing}</span> see nothing
          </span>
        </div>
        <SearchBox value={q} onChange={setQ} />
      </div>

      <div
        className="max-h-[600px] overflow-auto rounded-lg border bg-background"
        data-testid="row-access-member-list"
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Member</th>
              <th className="px-4 py-2.5 font-medium">Sees</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Preview</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((p) => (
              <Fragment key={p.id}>
                <tr className="border-b last:border-0" data-testid={`row-access-member-${p.id}`}>
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="flex cursor-pointer items-start gap-2 text-left"
                    >
                      <ChevronRight
                        className={cn(
                          'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                          expandedId === p.id && 'rotate-90',
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">{p.role}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top text-muted-foreground">{p.view}</td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <button
                      type="button"
                      onClick={() => setPicker(p)}
                      aria-label={`Preview as ${p.name}`}
                      data-testid={`row-access-previewas-${p.id}`}
                      className="inline-grid size-8 cursor-pointer place-items-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Eye className="size-4" />
                    </button>
                  </td>
                </tr>
                {expandedId === p.id && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <RowDetail person={p} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {matches.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No members match “{q}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {picker && (
        <PreviewPicker
          person={picker}
          onClose={() => setPicker(null)}
          onPick={(dashboard, filtered) => {
            setView({ person: picker, dashboard, filtered });
            setPicker(null);
          }}
        />
      )}
      {view && <ViewingAsDashboard target={view} onClose={() => setView(null)} />}
    </div>
  );
}

/** The dashboard picker that opens when you click "Preview as user". */
function PreviewPicker({
  person,
  onClose,
  onPick,
}: {
  person: PreviewPerson;
  onClose: () => void;
  onPick: (dashboard: string, filtered: boolean) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
      data-testid="row-access-preview-picker"
    >
      <div
        className="w-full max-w-md rounded-lg bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Open a dashboard as {person.name}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Opens in a new tab, scoped to what they can see.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {DASHBOARDS.map((d) => (
            <button
              key={d.name}
              type="button"
              onClick={() => onPick(d.name, d.filtered)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm hover:bg-muted"
            >
              <span className="flex items-center gap-2">
                {d.name}
                {d.filtered ? (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">scoped</span>
                ) : (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    shows full
                  </span>
                )}
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Per-person detail: the tables they query + the dashboards they can open. */
function RowDetail({ person }: { person: PreviewPerson }) {
  return (
    <div className="border-t bg-muted/20 px-6 py-4" data-testid={`row-access-detail-${person.id}`}>
      <p className="mb-3 text-sm text-muted-foreground">{person.reason}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tables they query
          </div>
          <ul className="space-y-1.5">
            {TABLES.map((t) => (
              <li key={t.name} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-xs">{t.name}</span>
                {t.cols.length ? (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    filtered · {t.cols.join(', ')}
                  </span>
                ) : (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    not filtered · full table
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dashboards they can open
          </div>
          <ul className="space-y-1.5">
            {DASHBOARDS.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{d.name}</span>
                {d.filtered ? (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">scoped</span>
                ) : (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    shows full
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * The draft alerts — one flat, collapsible list, no Warning/Info buckets.
 * Each row carries its own severity (a coloured dot); the list is ordered
 * locked-out → sees-more → good-to-know, with the top item open by default.
 */
function AlertsPanel({ issues }: { issues: FixIssue[] }) {
  const sorted = [...issues].sort(
    (a, b) => CATEGORY_ORDER[categoryOf(a.id)] - CATEGORY_ORDER[categoryOf(b.id)],
  );
  const [openId, setOpenId] = useState<string | null>(sorted[0]?.id ?? null);
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));
  return (
    <div
      className="mt-4 divide-y rounded-lg border bg-background px-4"
      data-testid="row-access-alert-groups"
    >
      {sorted.map((issue) => (
        <AlertItem
          key={issue.id}
          issue={issue}
          open={openId === issue.id}
          onToggle={() => toggle(issue.id)}
        />
      ))}
    </div>
  );
}

/** One alert: a severity dot + title; open reveals the consequence and any affected rows. */
function AlertItem({
  issue,
  open,
  onToggle,
}: {
  issue: FixIssue;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div data-testid={`row-access-alert-${issue.id}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2.5 py-3 text-left"
        data-testid={`row-access-alert-head-${issue.id}`}
      >
        <span className={cn('size-2 shrink-0 rounded-full', CATEGORY_DOT[categoryOf(issue.id)])} />
        <span className="flex-1 text-sm font-medium">{issue.title}</span>
        <ChevronRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-90',
          )}
        />
      </button>

      {open && (
        <div className="pb-3 pl-[18px]">
          <p className="text-sm text-muted-foreground">{issue.desc}</p>

          {issue.affected && (
            <ul
              className="mt-2 space-y-1.5 text-xs text-muted-foreground"
              data-testid={`row-access-affected-${issue.id}`}
            >
              {issue.affected.items.map((it) => (
                <li key={it.primary} className="leading-snug">
                  <span className="font-medium text-foreground">{it.primary}</span>
                  {it.secondary && (
                    <span className="mt-0.5 block text-muted-foreground">{it.secondary}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Simulates opening the dashboard in a new tab, scoped as the chosen member sees it. */
function ViewingAsDashboard({
  target,
  onClose,
}: {
  target: { person: PreviewPerson; dashboard: string; filtered: boolean };
  onClose: () => void;
}) {
  const { person, dashboard, filtered } = target;
  const emptyForThem = filtered && person.state === 'none';
  const scopes = person.state === 'all' ? ['All districts'] : person.view.split(' · ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
      data-testid="row-access-viewing-as"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 bg-foreground px-5 py-4 text-background">
          <Eye className="size-4 shrink-0" />
          <span className="text-sm">
            Viewing <span className="font-semibold">{dashboard}</span> as{' '}
            <span className="font-semibold">{person.name}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto cursor-pointer rounded bg-background/15 px-3 py-1.5 text-xs font-semibold hover:bg-background/25"
          >
            Exit preview
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {emptyForThem ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
                <Eye className="size-6" />
              </div>
              <div className="text-base font-semibold">No data for your access</div>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{person.reason}</p>
            </div>
          ) : (
            <>
              {filtered ? (
                <>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {scopes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        <Lock className="size-3" />
                        {s}
                      </span>
                    ))}
                    <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs text-muted-foreground">
                      Month: All
                    </span>
                  </div>
                  <p className="mb-5 text-xs text-muted-foreground">
                    Filters locked by row access. They can’t widen them.
                  </p>
                </>
              ) : (
                <div className="mb-5 rounded-md border bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Shows full data.</span> {dashboard}{' '}
                  uses a table with no scope column, so {person.name} sees every row here. Scope it in
                  your data models to restrict it.
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <Kpi label="Beneficiaries reached" value={filtered ? person.rows : '8,330'} />
                <Kpi label="Active sessions" value="38" />
                <Kpi label="Villages covered" value="62" />
              </div>

              <div className="mt-4 rounded-lg border p-4">
                <h4 className="mb-4 text-sm font-semibold">
                  Reach by taluka · {filtered ? scopes[0] : 'all districts'}
                </h4>
                <div className="flex h-44 items-end gap-6 px-2">
                  {[72, 54, 88, 40, 63].map((h, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <div
                        className="w-full max-w-[52px] rounded-t bg-primary"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {['Haveli', 'Mulshi', 'Maval', 'Shirur', 'Baramati'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-64">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search members"
        className="pl-8"
        data-testid="row-access-search"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: PersonStatus }) {
  const map: Record<PersonStatus, { label: string; cls: string }> = {
    access: { label: 'Partial', cls: 'bg-primary/10 text-primary' },
    everything: { label: 'Full', cls: 'bg-primary/10 text-primary' },
    nothing: { label: 'None', cls: 'bg-muted text-muted-foreground' },
  };
  const m = map[status];
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', m.cls)}
    >
      {m.label}
    </span>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      data-testid="row-access-toggle"
      className={cn(
        'relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors',
        on ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 size-5 rounded-full bg-background shadow transition-transform',
          on && 'translate-x-5',
        )}
      />
    </button>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onCancel}
      data-testid="row-access-confirm"
    >
      <div
        className="w-full max-w-sm rounded-lg bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} data-testid="row-access-confirm-off">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
