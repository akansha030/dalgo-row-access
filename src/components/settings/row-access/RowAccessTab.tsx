'use client';

import { Fragment, useRef, useState } from 'react';
import {
  ArrowUpDown,
  ArrowUpRight,
  ChevronRight,
  Eye,
  FileText,
  ListFilter,
  Lock,
  Search,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastInfo, toastError } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/notifications/TablePagination';
import { PAGE_SIZE_OPTIONS } from '@/constants/notifications';
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

type Stage = 'setup' | 'preview' | 'saved';

const STAGES: { id: Stage; label: string }[] = [
  { id: 'setup', label: 'Set up' },
  { id: 'preview', label: 'Preview' },
  { id: 'saved', label: 'Saved' },
];

const RLS_DESCRIPTION =
  'Let each member see only their own rows on shared dashboards a district officer opens the org dashboard and sees only their district.';

const DEFAULT_FILE = 'district-officers-row-access.csv';
const CRITICAL_COUNT = ISSUES.filter((i) => i.severity === 'critical').length;

export function RowAccessTab() {
  const [stage, setStage] = useState<Stage>('setup');
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState(DEFAULT_FILE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => fileInputRef.current?.click();
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setUploaded(true);
      setStage('setup');
    }
    e.target.value = '';
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

      {/* Prototype-only stage switcher */}
      <div className="mb-4 flex items-center justify-end gap-1 text-xs text-muted-foreground">
        <span className="mr-1">Stage</span>
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStage(s.id)}
            data-testid={`row-access-stage-${s.id}`}
            className={cn(
              'cursor-pointer rounded border px-2 py-1',
              stage === s.id ? 'border-primary text-primary' : 'hover:bg-muted',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {stage === 'setup' &&
        (uploaded ? (
          <ColumnsStage
            fileName={fileName}
            onReplace={openFilePicker}
            onPreview={() => setStage('preview')}
          />
        ) : (
          <UploadStage onChoose={openFilePicker} />
        ))}
      {stage === 'preview' && (
        <PreviewStage
          fileName={fileName}
          onReplace={openFilePicker}
          onBack={() => setStage('setup')}
          onSave={() => setStage('saved')}
        />
      )}
      {stage === 'saved' && <SavedStage fileName={fileName} onReplace={openFilePicker} />}
    </div>
  );
}

/** Row access heading + description — shared across stages. */
function RlsHeader() {
  return (
    <>
      <h2 className="text-xl font-semibold">Row access</h2>
      <p className="mt-1 max-w-4xl text-sm text-muted-foreground">{RLS_DESCRIPTION}</p>
    </>
  );
}

/** The uploaded-file row with a Replace file action (opens the file picker). */
function FileRow({ fileName, onReplace }: { fileName: string; onReplace: () => void }) {
  return (
    <div className="mt-5 flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <FileText className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <span className="text-sm font-semibold">{fileName}</span>
        <span className="ml-2 text-sm text-muted-foreground">46 rows</span>
      </div>
      <Button variant="outline" size="sm" onClick={onReplace} data-testid="row-access-replace">
        Replace file
      </Button>
    </div>
  );
}

/** First-time setup: a Choose file button (opens picker) + a CSV template to start from. */
function UploadStage({ onChoose }: { onChoose: () => void }) {
  return (
    <div className="rounded-lg border bg-background p-6" data-testid="row-access-upload">
      <RlsHeader />

      <div className="mt-5">
        <Button variant="primary" onClick={onChoose} data-testid="row-access-choose-file">
          <Upload className="mr-2 size-4" />
          Choose file
        </Button>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        The template is a CSV with your members already filled in and the columns Dalgo needs.{' '}
        <button
          type="button"
          className="cursor-pointer font-medium text-primary hover:underline"
          data-testid="row-access-download-template"
        >
          Download template
        </button>
      </p>
    </div>
  );
}

/** After upload: show the columns Dalgo will use (read-only), then preview. No mapping (spec §2/§8). */
function ColumnsStage({
  fileName,
  onReplace,
  onPreview,
}: {
  fileName: string;
  onReplace: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="rounded-lg border bg-background p-6" data-testid="row-access-columns">
      <RlsHeader />
      <FileRow fileName={fileName} onReplace={onReplace} />

      <div className="mt-6">
        <h3 className="text-base font-semibold">Columns Dalgo will use</h3>
        <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
          Dalgo reads these straight from your file, so the names must match your data. People are
          matched by their email; the rest filter the rows they see.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {DETECTED_COLUMNS.map((c) => (
            <span
              key={c.name}
              className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-sm"
              data-testid={`row-access-col-${c.name}`}
            >
              <span className="font-mono text-xs">{c.name}</span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  c.role === 'who' ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground',
                )}
              >
                {c.role}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Button variant="outline" onClick={onPreview} data-testid="row-access-preview-btn">
          Preview
        </Button>
      </div>
    </div>
  );
}

// Keeps the Preview list and the Needs attention panel the same height (bottoms aligned).
const PREVIEW_PANE_HEIGHT = 'lg:h-[520px]';

function PreviewStage({
  fileName,
  onReplace,
  onBack,
  onSave,
}: {
  fileName: string;
  onReplace: () => void;
  onBack: () => void;
  onSave: () => void;
}) {
  return (
    <div data-testid="row-access-preview">
      <div className="rounded-lg border bg-background p-6">
        <RlsHeader />
        <FileRow fileName={fileName} onReplace={onReplace} />
      </div>

      <div
        className={cn(
          'mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-stretch',
          PREVIEW_PANE_HEIGHT,
        )}
      >
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold">Preview list</h3>
            <SearchBox />
          </div>
          <div className="min-h-0 flex-1">
            <PreviewTable />
          </div>
        </div>

        {/* Needs attention — tiered Critical / Minor */}
        <aside
          className="flex min-h-0 flex-col rounded-lg border bg-background p-5"
          data-testid="row-access-needs-attention"
        >
          <h3 className="text-base font-semibold">Needs attention</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            3 people will see nothing. Fix the critical items in your sheet and re-upload.
          </p>
          <div className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            <IssueGroup
              label="Critical"
              dotClass="bg-red-500"
              issues={ISSUES.filter((i) => i.severity === 'critical')}
            />
            <IssueGroup
              label="Minor"
              dotClass="bg-amber-500"
              issues={ISSUES.filter((i) => i.severity === 'minor')}
            />
            <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Not shown here:</span> problems that
              appear after you save (a member who joins later and isn’t in the list, or data that
              changes) reach you as a notification, not a flag on this screen.
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="outline" onClick={onBack} data-testid="row-access-back">
          Back
        </Button>
        <Button
          variant="primary"
          className={cn('uppercase', CRITICAL_COUNT > 0 && 'opacity-50')}
          onClick={() =>
            CRITICAL_COUNT > 0
              ? toastError.api(null, `Fix the ${CRITICAL_COUNT} critical issues before you can save`)
              : onSave()
          }
          data-testid="row-access-save"
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function SavedStage({ fileName, onReplace }: { fileName: string; onReplace: () => void }) {
  return (
    <div data-testid="row-access-saved">
      <div className="rounded-lg border bg-background p-6">
        <RlsHeader />
        <FileRow fileName={fileName} onReplace={onReplace} />
      </div>

      <div className="mt-6 mb-3 flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold">Preview list</h3>
        <SearchBox />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          On
        </span>
        <span>·</span>
        <span className="font-medium text-foreground">12 people</span>
        <span>·</span>
        <span>8 see their rows</span>
        <span>·</span>
        <span>1 sees everything</span>
        <span>·</span>
        <span className="text-amber-700">3 see nothing</span>
      </div>
      <PreviewTable />

      <div className="mt-6 flex items-center gap-3">
        <Button variant="primary" className="uppercase" disabled data-testid="row-access-save-disabled">
          Save
        </Button>
        <Button
          variant="outline"
          onClick={() => toastInfo.generic('Row access turned off. Every member can see all rows again.')}
          data-testid="row-access-turn-off"
        >
          Turn off row access
        </Button>
      </div>
    </div>
  );
}

function SearchBox() {
  return (
    <div className="relative w-64">
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder="search users" className="pl-8" data-testid="row-access-search" />
    </div>
  );
}

function StatusBadge({ status }: { status: PersonStatus }) {
  const map: Record<PersonStatus, { label: string; cls: string }> = {
    access: { label: 'Has access', cls: 'bg-primary/10 text-primary' },
    everything: { label: 'Sees everything', cls: 'bg-primary/10 text-primary' },
    nothing: { label: 'Sees nothing', cls: 'bg-muted text-muted-foreground' },
  };
  const m = map[status];
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', m.cls)}>
      {m.label}
    </span>
  );
}

/** The per-person detail revealed when a row is expanded — tables + dashboards, each previewable. */
function RowDetail({
  person,
  onPreview,
}: {
  person: PreviewPerson;
  onPreview: (dashboard: string, filtered: boolean) => void;
}) {
  return (
    <div className="border-t bg-muted/20 px-6 py-4" data-testid={`row-access-detail-${person.id}`}>
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
            {DASHBOARDS.map((d, i) => (
              <li key={d.name} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{d.name}</span>
                {d.filtered ? (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">scoped</span>
                ) : (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    shows full
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onPreview(d.name, d.filtered)}
                  aria-label={`Preview ${d.name} as ${person.name}`}
                  data-testid={`row-access-preview-${person.id}-${i}`}
                  className="shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <ArrowUpRight className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** The shared "who sees what" table — paginated; rows expand to per-dashboard detail + preview. */
function PreviewTable() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [view, setView] = useState<{
    person: PreviewPerson;
    dashboard: string;
    filtered: boolean;
  } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const start = (page - 1) * pageSize;
  const rows = PEOPLE.slice(start, start + pageSize);

  return (
    <div
      className="flex h-full min-h-0 flex-col rounded-lg border bg-background"
      data-testid="row-access-preview-table"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8 pl-4" />
              <TableHead>
                <div className="flex items-center gap-2">
                  Member
                  <ArrowUpDown className="size-3.5 text-muted-foreground" />
                  <ListFilter className="size-3.5 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead>Sees</TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  Rows
                  <ListFilter className="size-3.5 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <Fragment key={p.id}>
                <TableRow
                  className="cursor-pointer"
                  data-testid={`row-access-row-${p.id}`}
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <TableCell className="pl-4">
                    <ChevronRight
                      className={cn(
                        'size-4 text-muted-foreground transition-transform',
                        expandedId === p.id && 'rotate-90',
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.role}</div>
                  </TableCell>
                  <TableCell>
                    {p.state === 'all' ? (
                      <span className="underline decoration-dotted underline-offset-2">{p.view}</span>
                    ) : (
                      <span className={cn(p.state === 'none' && 'text-muted-foreground')}>
                        {p.view}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{p.rows}</TableCell>
                  <TableCell className="pr-6">
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
                {expandedId === p.id && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="p-0">
                      <RowDetail
                        person={p}
                        onPreview={(dashboard, filtered) => setView({ person: p, dashboard, filtered })}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        count={PEOPLE.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {view && <ViewingAsDashboard target={view} onClose={() => setView(null)} />}
    </div>
  );
}

/** A severity group in the Needs attention panel (Critical / Minor). */
function IssueGroup({
  label,
  issues,
  dotClass,
}: {
  label: string;
  issues: FixIssue[];
  dotClass: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!issues.length) return null;
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="divide-y">
        {issues.map((issue) => {
          const open = openId === issue.id;
          return (
            <div key={issue.id} className="flex items-start gap-2.5 py-3 first:pt-0">
              <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', dotClass)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{issue.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{issue.desc}</p>

                {issue.affected && (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : issue.id)}
                      aria-expanded={open}
                      className="mt-2 flex cursor-pointer items-center gap-1 text-xs font-medium text-foreground/80 hover:text-foreground"
                      data-testid={`row-access-seemore-${issue.id}`}
                    >
                      {open ? 'Hide' : issue.affected.cta}
                      <ChevronRight
                        className={cn('size-3 transition-transform', open && 'rotate-90')}
                      />
                    </button>
                    {open && (
                      <ul
                        className="mt-2 space-y-2 rounded-md border bg-muted/30 p-2.5"
                        data-testid={`row-access-affected-${issue.id}`}
                      >
                        {issue.affected.items.map((it) => (
                          <li key={it.primary} className="text-xs leading-snug">
                            <span className="font-medium">{it.primary}</span>
                            {it.secondary && (
                              <span className="mt-0.5 block text-muted-foreground">
                                {it.secondary}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}

                {issue.fix && (
                  <button
                    type="button"
                    className="mt-2 cursor-pointer rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    data-testid={`row-access-fix-${issue.id}`}
                  >
                    Fix in sheet
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Previews one dashboard exactly as the chosen member sees it. */
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
