'use client';

import { Fragment, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
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
  type PreviewPerson,
  type PersonStatus,
  type FixIssue,
} from './row-access-data';

/**
 * Row Level Security — v3 (per the 18 Nov product sync).
 * No uploaded-file step: upload → loader → review (impact summary + Needs
 * attention + Member access list in one scroll). Preview-as-member is a required
 * step — Save & apply stays disabled until the admin previews a member and clicks
 * Done. Blocking checks still gate the flow. v2 kept as RowAccessTab.v2.bak.
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

const RLS_DESCRIPTION =
  'Restrict the data members can see on shared dashboards based on their assigned access rules. Members will have view-only access.';
/** Platform docs for the feature (F1 — "Learn how it works"). */
const DOCS_URL = 'https://docs.dalgo.org/row-level-security';

const DEFAULT_FILE = 'district-officers-row-access.csv';
const BLOCKING_COUNT = ISSUES.filter((i) => i.severity === 'blocking').length;
/** Prototype: simulated time to read the file + resolve every member's scope. */
const UPLOAD_PROCESSING_MS = 1200;
/** Saved-state condensed list: the "+N more" items behind the new-members headline. */
const SAVED_ALERT_IDS = ['partial', 'samecol', 'trim'];

/** Download the CSV template (setup page). */
function downloadTemplate() {
  const a = document.createElement('a');
  a.href = `${import.meta.env.BASE_URL}row-access-template.csv`;
  a.download = 'row-access-template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

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
  nothing: 'bg-amber-500', // sees nothing — a fix to make, not a lock-out (no red, per Akansha)
  more: 'bg-amber-500', // sees more than you set
  fyi: 'bg-muted-foreground/40', // good to know
};
const categoryOf = (id: string): AlertCategory => ALERT_CATEGORY[id] ?? 'fyi';

export function RowAccessTab() {
  const [stage, setStage] = useState<Stage>('setup');
  const [enabled, setEnabled] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(DEFAULT_FILE);
  const [flow, setFlow] = useState<FlowId>('start');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => fileInputRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setBlocked(false); // clean upload in the prototype — straight to the review
      setStage('review');
      setLoading(true); // read + resolve the file, then reveal the review below
      window.setTimeout(() => setLoading(false), UPLOAD_PROCESSING_MS);
      // Keep the active flow: Full shows alerts, Ideal stays the clean happy path.
    }
    e.target.value = '';
  };

  // Prototype flow pills jump straight to a scenario's starting state.
  const applyFlow = (id: FlowId) => {
    setFlow(id);
    setFileName(DEFAULT_FILE);
    setLoading(false);
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
      setLoading(false);
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
            enabled={enabled}
            ideal={flow === 'review'}
            loading={loading}
            onToggle={disableFromDraft}
            onReplace={openFilePicker}
            onSaveProceed={() => {
              setStage('saved');
              setFlow('live');
            }}
          />
        ))}
      {stage === 'saved' && <SavedState fileName={fileName} onReplace={openFilePicker} />}

      <FlowSwitcher active={flow} onSelect={applyFlow} raised={stage === 'review' && !blocked && !loading} />
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

/** The RLS description + a docs link (F1 — more articulate copy, "Learn how it works"). */
function RlsDescription({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="max-w-4xl text-sm text-muted-foreground">{RLS_DESCRIPTION}</p>
      <a
        href={DOCS_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
        data-testid="row-access-learn-more"
      >
        Learn how it works
      </a>
    </div>
  );
}

/** The uploaded-file row: filename + Update file; Download only once saved. */
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
      </div>
      {showDownload && (
        <a
          href={`${import.meta.env.BASE_URL}row-access-template.csv`}
          download
          aria-label="Download the current sheet"
          data-testid="row-access-download-file"
          className="inline-grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Download className="size-4" />
        </a>
      )}
      <Button variant="outline" size="sm" onClick={onReplace} data-testid="row-access-update-file">
        Update file
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
          <RlsDescription className="mt-1" />
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

/**
 * Impact summary — the scope of the rule (members / datasets / dashboards).
 * D1 (18 Nov): each stat's label is a click target that opens the granular list
 * behind that count, so you can see which members / datasets / dashboards without
 * scrolling the member table. Shown in review + saved.
 */
type ImpactKind = 'members' | 'datasets' | 'dashboards';

function ImpactSummary({ people }: { people: PreviewPerson[] }) {
  const filteredTables = TABLES.filter((t) => t.cols.length);
  const [detail, setDetail] = useState<ImpactKind | null>(null);
  return (
    <div className="rounded-lg border bg-background p-6" data-testid="row-access-summary">
      <h3 className="text-base font-semibold">Summary</h3>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Stat
          value={people.length}
          label="Members scoped"
          onOpen={() => setDetail('members')}
          testId="row-access-summary-members"
        />
        <Stat
          value={filteredTables.length}
          label="Datasets filtered"
          onOpen={() => setDetail('datasets')}
          testId="row-access-summary-datasets"
        />
        <Stat
          value={DASHBOARDS.length}
          label="Dashboards affected"
          onOpen={() => setDetail('dashboards')}
          testId="row-access-summary-dashboards"
        />
      </div>

      {detail && (
        <ImpactDetailModal kind={detail} people={people} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

const IMPACT_TITLE: Record<ImpactKind, string> = {
  members: 'Members scoped',
  datasets: 'Datasets filtered',
  dashboards: 'Dashboards affected',
};

/** The granular list behind one impact stat, in a modal with a close icon top-right. */
function ImpactDetailModal({
  kind,
  people,
  onClose,
}: {
  kind: ImpactKind;
  people: PreviewPerson[];
  onClose: () => void;
}) {
  const scopedDashboards = DASHBOARDS.filter((d) => d.filtered).length;
  const filteredTables = TABLES.filter((t) => t.cols.length).length;

  const subtitle =
    kind === 'members'
      ? `${people.length} members are scoped by row access.`
      : kind === 'datasets'
        ? `${filteredTables} of ${TABLES.length} datasets are filtered — the rest show full data.`
        : `${DASHBOARDS.length} dashboards affected — ${scopedDashboards} scoped, ${DASHBOARDS.length - scopedDashboards} shows full data.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
      data-testid="row-access-impact-modal"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">{IMPACT_TITLE[kind]}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="row-access-impact-modal-close"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {kind === 'members' && (
            <ul className="divide-y rounded-lg border" data-testid="row-access-impact-members">
              {people.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.view}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}

          {kind === 'datasets' && (
            <ul className="space-y-2" data-testid="row-access-impact-datasets">
              {TABLES.map((t) => (
                <li
                  key={t.name}
                  className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2.5 text-sm"
                >
                  <span className="font-mono text-xs">{t.name}</span>
                  {t.cols.length ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      filtered · {t.cols.join(', ')}
                    </span>
                  ) : (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      not filtered · shows full
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {kind === 'dashboards' && (
            <ul className="space-y-2" data-testid="row-access-impact-dashboards">
              {DASHBOARDS.map((d) => (
                <li
                  key={d.name}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm"
                >
                  <span>{d.name}</span>
                  {d.filtered ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      scoped
                    </span>
                  ) : (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      shows full
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
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
          <RlsDescription className="mt-1" />
        </div>
        <ToggleSwitch on={enabled} onChange={onToggle} />
      </div>

      {enabled && (
        <div className="mt-6 border-t pt-6" data-testid="row-access-upload-reveal">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={onChoose} data-testid="row-access-choose-file">
              <Upload className="mr-2 size-4" />
              Upload CSV
            </Button>
            <Button
              variant="outline"
              onClick={downloadTemplate}
              data-testid="row-access-download-template"
            >
              Download template
            </Button>
          </div>

          <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
            The template already lists your organisation’s members. Set what each member can see,
            then upload the completed CSV to review the access rules before they go live.
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
                dotClass="bg-red-500"
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
 * The review (Draft) — v3: no uploaded-file step.
 * Upload shows a loader, then reveals the impact summary, Needs attention,
 * and the applied member preview in one scroll. Save & Proceed when ready.
 */
function FunnelReview({
  fileName,
  enabled,
  ideal,
  loading,
  onToggle,
  onReplace,
  onSaveProceed,
}: {
  fileName: string;
  enabled: boolean;
  ideal: boolean;
  loading: boolean;
  onToggle: (next: boolean) => void;
  onReplace: () => void;
  onSaveProceed: () => void;
}) {
  // Ideal (happy path) resolves to a tidy file where everyone is properly scoped.
  const people = ideal ? PEOPLE.map((p) => (p.clean ? { ...p, ...p.clean } : p)) : PEOPLE;

  // Preview-as-member is a required step: Save & apply stays disabled until the admin
  // opens the preview and closes it with Done (18 Nov sync: forced preview).
  const [previewed, setPreviewed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const header = (
    <EnableCard enabled={enabled} onToggle={onToggle} fileName={fileName} onReplace={onReplace} />
  );

  // While the file is read + resolved, hold on a loader — then reveal the review below.
  if (loading) {
    return (
      <div data-testid="row-access-review">
        {header}
        <ReviewLoader />
      </div>
    );
  }

  // Demo set: one locked-out, one sees-more, two good-to-know; full taxonomy lives in dalgo-rls-errors-map.md.
  const DEMO_ALERT_IDS = ['newuser', 'partial', 'samecol', 'trim'];
  const shownAlerts = ISSUES.filter((i) => i.severity !== 'blocking' && DEMO_ALERT_IDS.includes(i.id));

  return (
    <div className="pb-24" data-testid="row-access-review">
      {header}

      <div className="mt-6">
        <ImpactSummary people={people} />
      </div>

      {/* Needs attention — shown in Full; hidden on the Ideal happy path (nothing to fix) */}
      {!ideal && (
        <div className="mt-6 rounded-lg border bg-background p-6" data-testid="row-access-alerts">
          <h3 className="text-base font-semibold">Needs attention</h3>
          <div className="mt-0.5 flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
            <p className="max-w-3xl text-sm text-muted-foreground">
              Review how these rules affect member access before applying the configuration. To fix
              any of these, edit your sheet and upload again.
            </p>
            <button
              type="button"
              onClick={onReplace}
              data-testid="row-access-reupload-sheet"
              className="shrink-0 cursor-pointer text-sm font-medium text-primary hover:underline"
            >
              Re-upload sheet
            </button>
          </div>
          <AlertsPanel issues={shownAlerts} />
        </div>
      )}

      {/* The applied member list */}
      <div className="mt-6 rounded-lg border bg-background p-6">
        <h3 className="text-base font-semibold">Preview</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          What each member sees once row access is on.
        </p>
        <div className="mt-4">
          <PreviewList people={people} onPreviewed={() => setPreviewed(true)} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col items-start gap-2 border-t bg-background/95 px-6 py-4 backdrop-blur md:left-56">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            data-testid="row-access-preview-as-member"
          >
            <Eye className="mr-2 size-4" />
            Preview as member
          </Button>
          <Button
            variant="primary"
            onClick={onSaveProceed}
            disabled={!previewed}
            data-testid="row-access-save-apply"
          >
            Save and apply
          </Button>
        </div>
        {!previewed && (
          <span className="text-xs text-muted-foreground" data-testid="row-access-save-hint">
            Preview as a member first to apply.
          </span>
        )}
      </div>

      {showPreview && (
        <PreviewAsMemberModal
          people={people}
          onClose={() => setShowPreview(false)}
          onDone={() => {
            setPreviewed(true);
            setShowPreview(false);
          }}
        />
      )}
    </div>
  );
}

/** Shown right after upload while the file is read + each member's scope is resolved. */
function ReviewLoader() {
  return (
    <div
      className="mt-6 grid place-items-center rounded-lg border bg-background py-16"
      data-testid="row-access-loading"
    >
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">Applying row access to your members…</p>
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
            <ImpactSummary people={PEOPLE} />
          </div>
          <SavedAlerts />
          <div className="mt-6 rounded-lg border bg-background p-6">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-base font-semibold">Preview</h3>
              <span
                className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
                data-testid="row-access-live-badge"
              >
                Live
              </span>
            </div>
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

/**
 * Saved/live state — condensed Needs attention (E1/E3). A single collapsed bar
 * leads with the recurring issue (new members needing access) + a rolled-up
 * count; "View more" expands the full list.
 */
function SavedAlerts() {
  const [open, setOpen] = useState(false);
  const alerts = ISSUES.filter(
    (i) => i.severity !== 'blocking' && SAVED_ALERT_IDS.includes(i.id),
  );
  return (
    <div className="mt-6 rounded-lg border bg-background p-4" data-testid="row-access-saved-alerts">
      <div className="flex items-center gap-2.5">
        <span className="size-2 shrink-0 rounded-full bg-amber-500" />
        <span className="flex-1 text-sm font-semibold">
          3 new members need access
          <span className="font-normal text-muted-foreground"> · 3 more to review</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          data-testid="row-access-saved-viewmore"
          className="shrink-0 cursor-pointer text-sm font-medium text-primary hover:underline"
        >
          {open ? 'View less' : 'View more'}
        </button>
      </div>
      {open && (
        <div className="mt-2">
          <AlertsPanel issues={alerts} />
        </div>
      )}
    </div>
  );
}

/** The applied member list — each member, what they see, their status, and a per-row Preview. */
function PreviewList({
  people = PEOPLE,
  onPreviewed,
}: {
  people?: PreviewPerson[];
  onPreviewed?: () => void;
}) {
  const [q, setQ] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

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
            <span className="font-semibold text-foreground">{seeTheirRows}</span> see limited rows
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
                      onClick={() => setPreviewId(p.id)}
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

      {previewId && (
        <PreviewAsMemberModal
          people={people}
          initialMemberId={previewId}
          onClose={() => setPreviewId(null)}
          onDone={() => {
            onPreviewed?.();
            setPreviewId(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Preview as a member — the required step before Save & apply.
 * Search a member, pick them, then open one of their dashboards scoped as they'll
 * see it (reuses ViewingAsDashboard). Closing with Done marks the preview complete.
 */
function PreviewAsMemberModal({
  people,
  initialMemberId = null,
  onClose,
  onDone,
}: {
  people: PreviewPerson[];
  initialMemberId?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const locked = initialMemberId != null; // opened from a member's row — no search, just their dashboards
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialMemberId);
  const [view, setView] = useState<{
    person: PreviewPerson;
    dashboard: string;
    filtered: boolean;
  } | null>(null);

  const selected = people.find((p) => p.id === selectedId) ?? null;
  const needle = q.trim().toLowerCase();
  // Suggestions show only while the admin is actively typing (not once a member is picked).
  const showSuggestions = !locked && needle.length > 0 && q !== (selected?.name ?? '');
  const matches = showSuggestions
    ? people.filter(
        (p) => p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle),
      )
    : [];

  const pickMember = (p: PreviewPerson) => {
    setSelectedId(p.id);
    setQ(p.name);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
        onClick={onClose}
        data-testid="row-access-preview-modal"
      >
        <div
          className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-background shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Preview as a member</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {locked
                  ? `The dashboards ${selected?.name ?? 'this member'} can open, scoped to their rows.`
                  : 'Search a member, then open a dashboard the way they’ll see it — scoped to their rows.'}
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

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!locked && (
              <div className="relative">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Member
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      if (selectedId) setSelectedId(null); // editing again clears the current pick
                    }}
                    placeholder="Search members"
                    className="pl-8"
                    data-testid="row-access-preview-modal-search"
                  />
                </div>

                {showSuggestions && (
                  <div
                    className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-lg border bg-background shadow-md"
                    data-testid="row-access-preview-modal-suggestions"
                  >
                    {matches.length > 0 ? (
                      matches.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => pickMember(p)}
                          data-testid={`row-access-preview-modal-member-${p.id}`}
                          className="flex w-full cursor-pointer items-center justify-between gap-2 border-b px-3 py-2.5 text-left last:border-0 hover:bg-muted"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{p.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{p.email}</span>
                          </span>
                          <StatusBadge status={p.status} />
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        No members match “{q}”.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className={locked ? undefined : 'mt-5'}>
              {selected ? (
                <div data-testid="row-access-preview-modal-dashboards">
                  {!locked && (
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Dashboards {selected.name} can open
                    </div>
                  )}
                  <div className="space-y-2">
                    {DASHBOARDS.map((d) => (
                      <button
                        key={d.name}
                        type="button"
                        onClick={() =>
                          setView({ person: selected, dashboard: d.name, filtered: d.filtered })
                        }
                        data-testid={`row-access-preview-modal-dash-${d.name
                          .replace(/\s+/g, '-')
                          .toLowerCase()}`}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        <span className="flex items-center gap-2">
                          {d.name}
                          {d.filtered ? (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                              scoped
                            </span>
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
              ) : (
                <div
                  className="grid place-items-center rounded-lg border border-dashed py-12 text-center"
                  data-testid="row-access-preview-modal-empty"
                >
                  <Eye className="size-5 text-muted-foreground/60" />
                  <p className="mt-2 text-sm font-medium text-foreground">No dashboard available</p>
                  <p className="mt-0.5 max-w-xs text-sm text-muted-foreground">
                    Search a member above to see the dashboards they can open.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
            <Button variant="primary" onClick={onDone} data-testid="row-access-preview-done">
              Done
            </Button>
          </div>
        </div>
      </div>

      {view && <ViewingAsDashboard target={view} onClose={() => setView(null)} />}
    </>
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
  dotClass,
}: {
  issue: FixIssue;
  open: boolean;
  onToggle: () => void;
  dotClass?: string;
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
        <span
          className={cn('size-2 shrink-0 rounded-full', dotClass ?? CATEGORY_DOT[categoryOf(issue.id)])}
        />
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

function Stat({
  value,
  label,
  onOpen,
  testId,
}: {
  value: number;
  label: string;
  onOpen: () => void;
  testId: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="text-2xl font-bold">{value}</div>
      <button
        type="button"
        onClick={onOpen}
        data-testid={testId}
        className="group mt-0.5 flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-primary"
      >
        <span className="underline-offset-2 group-hover:underline">{label}</span>
        <ChevronRight className="size-3.5" />
      </button>
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
