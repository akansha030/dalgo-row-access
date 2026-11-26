import { useState } from 'react';
import {
  Home,
  Target,
  BarChart3,
  LayoutGrid,
  Database,
  Bell,
  Sparkles,
  Settings,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RowAccessTab } from '@/components/settings/row-access/RowAccessTab';
import { cn } from '@/lib/utils';

const TAB_TRIGGER_CLASS =
  'relative bg-transparent border-0 shadow-none rounded-none px-1 py-2.5 text-sm font-medium uppercase tracking-wide text-gray-500 cursor-pointer data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-primary';

const NAV = [
  { label: 'Impact', icon: Home },
  { label: 'KPIs', icon: Target },
  { label: 'Charts', icon: BarChart3 },
  { label: 'Dashboards', icon: LayoutGrid },
  { label: 'Data', icon: Database, chevron: true },
  { label: 'Alerts', icon: Bell },
  { label: 'Copilot', icon: Sparkles },
  { label: 'Settings', icon: Settings, chevron: true },
] as const;

/** Static replica of the product chrome — context only, not interactive. */
function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-background md:flex">
      <div className="flex h-15 items-center px-5">
        <span
          className="text-2xl font-bold tracking-tight text-[#0f2440]"
          style={{ fontFamily: 'var(--font-logo)' }}
        >
          Dalgo
        </span>
      </div>
      <nav className="flex flex-col gap-0.5 px-3 py-2">
        {NAV.map(({ label, icon: Icon, chevron }) => (
          <div
            key={label}
            className="flex cursor-default items-center gap-3 rounded-md px-3 py-2 text-[15px] text-muted-foreground hover:bg-muted/60"
          >
            <Icon className="size-5 shrink-0" />
            <span className="flex-1">{label}</span>
            {chevron && <ChevronDown className="size-4 opacity-60" />}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function Header() {
  return (
    <header className="flex h-15 shrink-0 items-center gap-3 border-b bg-background px-5">
      <Menu className="size-5 text-muted-foreground md:hidden" />
      <div className="ml-auto flex items-center gap-4">
        <Bell className="size-5 text-muted-foreground" />
        <span className="text-sm font-medium">Dalgo Demo</span>
        <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          A
        </span>
      </div>
    </header>
  );
}

/** A tab that isn't the focus of this prototype. */
function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-muted/20 p-12 text-center">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Not part of this prototype — it focuses on the Row access flow. In the product this tab
          works as it does today.
        </p>
      </div>
    </div>
  );
}

/** Roles summary — shows that row access makes members view-only (feedback from the team). */
function RolesView() {
  const roles = [
    {
      role: 'Admin',
      rows: 'All rows',
      can: 'Everything: manage access, create and edit',
      viewOnly: false,
    },
    {
      role: 'Analyst',
      rows: 'All rows',
      can: 'Create and edit; always sees every row',
      viewOnly: false,
    },
    {
      role: 'Member',
      rows: 'Only their own rows (set by row access)',
      can: 'Open dashboards, charts, KPIs and reports',
      viewOnly: true,
    },
  ];

  return (
    <div>
      <div className="overflow-hidden rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Rows they see</th>
              <th className="px-4 py-2.5 font-medium">What they can do</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr
                key={r.role}
                className={cn('border-b last:border-0', r.viewOnly && 'bg-primary/5')}
                data-testid={`role-row-${r.role.toLowerCase()}`}
              >
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.role}</span>
                    {r.viewOnly && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        View only
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">{r.rows}</td>
                <td className="px-4 py-3 align-top text-muted-foreground">{r.can}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Row Level Security makes members <span className="font-medium text-foreground">view-only</span>:
        they can’t create or edit. Admins and Analysts always see every row.
      </p>
    </div>
  );
}

type AccessTab = 'people' | 'groups' | 'roles' | 'rowaccess';

/** The Access page: four tabs, Row access is the live prototype. */
function AccessPage() {
  const [tab, setTab] = useState<AccessTab>('rowaccess');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as AccessTab)}
        className="flex w-full flex-1 flex-col min-h-0"
      >
        <div className="flex-shrink-0 border-b bg-background">
          <div className="mb-6 flex items-start justify-between p-6 pb-0">
            <div>
              <h1 className="text-3xl font-bold">Access</h1>
              <p className="mt-1 text-muted-foreground">
                Manage users and set organization level permission defaults
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 pb-0">
            <TabsList className="h-auto gap-4 bg-transparent p-0">
              <TabsTrigger value="people" className={TAB_TRIGGER_CLASS}>
                People
              </TabsTrigger>
              <TabsTrigger value="groups" className={TAB_TRIGGER_CLASS}>
                Groups
              </TabsTrigger>
              <TabsTrigger value="roles" className={TAB_TRIGGER_CLASS}>
                Roles
              </TabsTrigger>
              <TabsTrigger value="rowaccess" className={TAB_TRIGGER_CLASS}>
                RLS
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="min-h-0 w-full flex-1 overflow-y-auto px-6 py-6">
          <TabsContent value="people" className="mt-0 h-full">
            <PlaceholderTab name="People" />
          </TabsContent>
          <TabsContent value="groups" className="mt-0 h-full">
            <PlaceholderTab name="Groups" />
          </TabsContent>
          <TabsContent value="roles" className="mt-0 h-full">
            <RolesView />
          </TabsContent>
          <TabsContent value="rowaccess" className="mt-0 h-full">
            <RowAccessTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="min-h-0 flex-1 overflow-hidden">
          <AccessPage />
        </main>
      </div>
    </div>
  );
}
