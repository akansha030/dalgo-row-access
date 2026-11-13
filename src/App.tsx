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
                Row access
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
            <PlaceholderTab name="Roles" />
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
