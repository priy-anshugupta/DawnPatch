import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Sunrise,
  LayoutList,
  Activity,
  NotebookText,
  CalendarClock,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Search,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code2,
  Download,
  ExternalLink,
  FileCode2,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Trash2,
  X,
  XCircle,
  Zap,
  Menu,
  AlertTriangle,
  Bookmark,
  Monitor,
  Smartphone,
} from "lucide-react";
import { api, download, outcomeLabel, relative } from "./api.ts";
import type {
  Run,
  RunInput,
  RunEvent,
  Schedule,
  Evidence,
  Step,
} from "../shared/types.ts";
type Page =
  "queue" | "investigations" | "brief" | "schedules" | "settings" | "case";
type Health = {
  model: string;
  models: string[];
  ollama: boolean;
  docker: boolean;
  workflowEngine: string;
  sourceRoots: string[];
  connections: {
    id: string;
    name: string;
    status: string;
    detail: string;
    track: boolean;
  }[];
  local: { database: string; browser: string; artifacts: string };
};
const nav = [
  { id: "queue", label: "Review queue", icon: LayoutList },
  { id: "investigations", label: "Investigations", icon: Activity },
  { id: "brief", label: "Morning brief", icon: NotebookText },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
] as const;
const stageNames = [
  "preflight",
  "reproducing",
  "researching",
  "analyzing",
  "patching",
  "verifying",
  "completed",
];
function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return (
    <span className={`badge ${status}`}>
      <i />
      {children || outcomeLabel(status)}
    </span>
  );
}
function OperationsGrid({
  runs,
  onCreate,
  onReview,
  onActive,
}: {
  runs: Run[];
  onCreate: () => void;
  onReview: () => void;
  onActive: () => void;
}) {
  const active = runs.filter((r) =>
    ["running", "queued"].includes(r.status),
  ).length;
  const ready = runs.filter((r) => r.status === "awaiting_review").length;
  const candidates = runs.filter((r) => r.candidate);
  const passing = candidates.filter((r) => r.candidate?.passed).length;
  const percent = candidates.length
    ? Math.round((passing / candidates.length) * 100)
    : 0;
  const evidence = runs.filter((r) => r.baseline).length;
  const repositories = new Set(runs.map((r) => r.repositoryName)).size;
  const latest = runs[0];
  return (
    <section
      className="operations-grid"
      aria-label="Local investigation telemetry"
    >
      <div className="operation-cell operation-state">
        <span className="instrument-label">
          {active ? "INVESTIGATING..." : "SYSTEM / STANDBY"}
        </span>
        <div className="radial-instrument" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            {Array.from({ length: 36 }, (_, i) => {
              const angle = ((150 + i * 8) * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1={60 + Math.cos(angle) * 40}
                  y1={60 + Math.sin(angle) * 40}
                  x2={60 + Math.cos(angle) * (i % 3 === 0 ? 54 : 49)}
                  y2={60 + Math.sin(angle) * (i % 3 === 0 ? 54 : 49)}
                  className={active && i < 12 ? "lit" : ""}
                />
              );
            })}
            <circle cx="60" cy="60" r="9" />
          </svg>
          <div className="radial-number">
            {String(active).padStart(2, "0")}
            <small>ACTIVE</small>
          </div>
        </div>
        <div className="instrument-foot">
          RUN QUEUE{" "}
          <span className={active ? "instrument-live" : ""}>
            {active ? "BUSY" : "IDLE"}
          </span>
        </div>
      </div>
      <div className="operation-cell operation-volume">
        <span className="instrument-label">CANDIDATE VERIFICATION</span>
        <div
          className="segment-meter"
          role="meter"
          aria-label="Candidate checks passing"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {Array.from({ length: 52 }, (_, i) => (
            <i
              key={i}
              className={i < Math.round((percent / 100) * 52) ? "filled" : ""}
            />
          ))}
        </div>
        <div className="meter-scale">
          <span>{String(passing).padStart(2, "0")} PASSING</span>
          <span>OF {String(candidates.length).padStart(2, "0")} TESTED</span>
        </div>
        <div className="instrument-foot">
          SUPPLIED CHECKS{" "}
          <strong>
            {candidates.length ? `${percent}% PASS` : "NO CANDIDATES YET"}
          </strong>
        </div>
      </div>
      <div className="operation-cell operation-time">
        <span className="instrument-label">LAST ACTIVITY</span>
        <strong className="instrument-time">
          {latest
            ? new Date(latest.updatedAt).toLocaleTimeString("en-GB", {
                hour12: false,
              })
            : "--:--:--"}
        </strong>
        <div className="instrument-foot">
          {latest
            ? relative(latest.updatedAt).toUpperCase()
            : "AWAITING FIRST RUN"}
          <span className="tiny-cross">+</span>
        </div>
      </div>
      <div className="operation-cell operation-review">
        <span className="instrument-label">REVIEW QUEUE</span>
        <div className="instrument-value">
          {String(ready).padStart(2, "0")}
          <small> CANDIDATES</small>
        </div>
        <span className="instrument-note">HUMAN APPROVAL REQUIRED</span>
      </div>
      <div className="operation-cell operation-details">
        <span className="instrument-label">WORKLOAD DETAILS</span>
        <div className="workload-total">
          {String(runs.length).padStart(3, "0")} RECORDED INVESTIGATIONS
        </div>
        <div className="workload-columns">
          <div>
            <span>REPOSITORIES</span>
            <strong>{String(repositories).padStart(2, "0")}</strong>
          </div>
          <div>
            <span>EVIDENCE SETS</span>
            <strong>{String(evidence).padStart(2, "0")}</strong>
          </div>
          <div>
            <span>RUNTIME</span>
            <strong>LOCAL</strong>
          </div>
        </div>
      </div>
      <div className="operation-cell operation-actions">
        <span className="instrument-label">ACTIONS</span>
        <button onClick={onCreate}>
          NEW INVESTIGATION <ArrowUpRight size={12} />
        </button>
        <button onClick={onReview}>
          REVIEW CANDIDATES <span>{String(ready).padStart(2, "0")}</span>
        </button>
        <button onClick={onActive}>
          ACTIVE RUNS <span>{String(active).padStart(2, "0")}</span>
        </button>
      </div>
    </section>
  );
}
function Empty({
  icon: Icon = FolderGit2,
  title,
  children,
  action,
}: {
  icon?: typeof FolderGit2;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={25} />
      </div>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.querySelector<HTMLElement>("input,button,select,textarea")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focus = Array.from(
          el?.querySelectorAll<HTMLElement>(
            "button,input,select,textarea,a[href]",
          ) || [],
        ).filter((v) => !v.hasAttribute("disabled"));
        if (e.shiftKey && document.activeElement === focus[0]) {
          e.preventDefault();
          focus.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === focus.at(-1)) {
          e.preventDefault();
          focus[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">DAWNPATCH WORKBENCH</span>
            <h2>{title}</h2>
          </div>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const [page, setPage] = useState<Page>("queue");
  const [selected, setSelected] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  const [connectionErrors, setConnectionErrors] = useState<
    Record<string, string>
  >({});
  const [toast, setToast] = useState("");
  const [creating, setCreating] = useState(false);
  const [template, setTemplate] = useState<RunInput | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const refresh = async () => {
    try {
      setRuns(await api("/runs"));
      setConnectionErrors((previous) => ({ ...previous, runs: "" }));
    } catch (e) {
      setConnectionErrors((previous) => ({
        ...previous,
        runs: (e as Error).message,
      }));
    }
  };
  const check = async () => {
    try {
      setHealth(await api("/health"));
      setConnectionErrors((previous) => ({ ...previous, health: "" }));
    } catch (e) {
      setConnectionErrors((previous) => ({
        ...previous,
        health: (e as Error).message,
      }));
    }
  };
  useEffect(() => {
    void refresh();
    void check();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 2000);
    const healthTimer = setInterval(() => {
      if (!document.hidden) void check();
    }, 30000);
    return () => {
      clearInterval(timer);
      clearInterval(healthTimer);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const navigate = (next: Page, id?: string) => {
    setPage(next);
    if (id) setSelected(id);
    setSidebar(false);
    window.scrollTo(0, 0);
  };
  const run = runs.find((r) => r.id === selected);
  const reviewCount = runs.filter((r) => r.status === "awaiting_review").length;
  const notify = (message: string) => {
    setToast(message);
    void refresh();
  };
  return (
    <div className="app">
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("queue");
          }}
        >
          <span className="brand-mark">
            <Sunrise size={25} strokeWidth={1.7} />
          </span>
          dawnpatch<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <div className="workspace-switch">
          <span className="workspace-avatar">P</span>
          <div>
            <strong>Personal workspace</strong>
            <small>On this computer</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKBENCH</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.id === "queue" && reviewCount > 0 && <b>{reviewCount}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <span className="status-dot" />
            <div>
              <strong>Local by design</strong>
              <small>Your model. Your source.</small>
            </div>
            <ShieldCheck size={17} />
          </div>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings size={18} />
            Settings & connections
          </button>
          <div className="profile">
            <span className="profile-avatar">M</span>
            <div>
              <strong>Maintainer</strong>
              <small>Local workspace · v1.0</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setSidebar(!sidebar)}
            >
              <Menu size={20} />
            </button>
            <FolderGit2 size={16} />
            <span>Personal workspace</span>
            <ChevronRight size={13} />
            <strong>
              {page === "case"
                ? "Investigation"
                : page === "settings"
                  ? "Settings"
                  : nav.find((n) => n.id === page)?.label}
            </strong>
          </div>
          <button className="model-status" onClick={() => navigate("settings")}>
            <span
              className={`status-dot ${health?.connections[0]?.status === "ready" ? "" : "amber"}`}
            />
            {health?.model || "Checking local model"}
            <span className="local-pill">LOCAL</span>
          </button>
        </header>
        <main>
          {Object.values(connectionErrors).some(Boolean) && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={17} />
              <span>
                {Object.values(connectionErrors).find(Boolean)} Reconnecting
                automatically.
              </span>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={17} />
              <span>{error}</span>
              <button
                className="icon-btn"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {page === "case" && run ? (
            <CaseDetail
              run={run}
              onBack={() => navigate("queue")}
              onNavigate={(id) => navigate("case", id)}
              notify={notify}
              onError={setError}
              onRepeat={() => {
                setTemplate(run.input);
                setCreating(true);
              }}
            />
          ) : page === "case" ? (
            <Empty title="Loading investigation">
              Select an investigation from the queue.
            </Empty>
          ) : page === "settings" ? (
            <Connections
              health={health}
              onCheck={check}
              notify={notify}
              onError={setError}
            />
          ) : page === "schedules" ? (
            <Schedules runs={runs} notify={notify} onError={setError} />
          ) : page === "brief" ? (
            <Brief runs={runs} open={(id) => navigate("case", id)} />
          ) : (
            <Queue
              runs={runs}
              all={page === "investigations"}
              onOpen={(id) => navigate("case", id)}
              onCreate={() => {
                setTemplate(null);
                setCreating(true);
              }}
              onTemplate={(input) => {
                setTemplate(input);
                setCreating(true);
              }}
              onError={setError}
              notify={notify}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>
            <Sunrise size={14} /> Slow work. Clear evidence.
          </span>
          <span>Runs locally · No automatic merges</span>
        </footer>
      </div>
      {creating && (
        <NewRun
          initial={template}
          onClose={() => setCreating(false)}
          onCreated={(r) => {
            setCreating(false);
            void refresh();
            navigate("case", r.id);
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function Queue({
  runs,
  all,
  onOpen,
  onCreate,
  onTemplate,
  onError,
  notify,
}: {
  runs: Run[];
  all: boolean;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onTemplate: (input: RunInput) => void;
  onError: (e: string) => void;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [repo, setRepo] = useState("all");
  const [fixtures, setFixtures] = useState<(RunInput & { key: string })[]>([]);
  const [saved, setSaved] = useState<
    { id: string; name: string; query: string; filter: string }[]
  >([]);
  useEffect(() => {
    api("/fixtures")
      .then(setFixtures)
      .catch(() => {});
    api("/views")
      .then(setSaved)
      .catch(() => {});
  }, []);
  const ready = runs.filter((r) => r.status === "awaiting_review");
  const list = runs.filter(
    (r) =>
      (tab === "all" ||
        (tab === "review"
          ? r.status === "awaiting_review"
          : tab === "running"
            ? ["running", "queued"].includes(r.status)
            : ["failed", "blocked"].includes(r.status))) &&
      (repo === "all" || r.repositoryName === repo) &&
      `${r.input.title} ${r.repositoryName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">DAWNPATCH / OPERATIONS CONSOLE</div>
          <h1>{all ? "Investigation archive." : "Maintenance overview."}</h1>
          <p>
            {all
              ? "Every investigation, with its evidence and decisions."
              : "Observe. Reproduce. Repair. Verify."}
          </p>
        </div>
        <button className="btn primary" onClick={onCreate}>
          <Plus size={17} />
          Investigate issue
        </button>
      </div>
      <OperationsGrid
        runs={runs}
        onCreate={onCreate}
        onReview={() => {
          setTab("review");
          document
            .querySelector(".queue-panel")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onActive={() => {
          setTab("running");
          document
            .querySelector(".queue-panel")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
      <section className="panel queue-panel">
        <div className="panel-title">
          <h2>
            {all ? "Investigation history" : "Review queue"}
            <span className="count">{runs.length}</span>
          </h2>
          <span className="subtle">
            <span className="status-dot" />
            Live from your computer
          </span>
        </div>
        <div className="queue-toolbar">
          <div className="tabs">
            {[
              ["all", "All investigations"],
              ["review", "Needs review"],
              ["running", "Running"],
              ["blocked", "Blocked"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={tab === id ? "active" : ""}
              >
                {label}
                {id === "review" && ready.length > 0 && (
                  <span>{ready.length}</span>
                )}
              </button>
            ))}
          </div>
          <div className="filters">
            <div className="searchbox">
              <Search size={15} />
              <input
                aria-label="Search investigations"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find an investigation…"
              />
            </div>
            <select
              aria-label="Filter by repository"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            >
              <option value="all">All repositories</option>
              {[...new Set(runs.map((r) => r.repositoryName))].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button
              className="icon-btn"
              title="Save current view"
              aria-label="Save current view"
              onClick={async () => {
                try {
                  const v = await api("/views", "POST", {
                    name: query || `${tab} investigations`,
                    query,
                    filter: tab,
                  });
                  setSaved([...saved, v]);
                  notify("View saved.");
                } catch (e) {
                  onError((e as Error).message);
                }
              }}
            >
              <Bookmark size={16} />
            </button>
          </div>
        </div>
        {saved.length > 0 && (
          <div className="saved-views">
            <span>Saved views</span>
            {saved.map((s) => (
              <span className="saved-chip" key={s.id}>
                <button
                  onClick={() => {
                    setQuery(s.query);
                    setTab(s.filter);
                  }}
                >
                  {s.name}
                </button>
                <button
                  aria-label={`Delete ${s.name}`}
                  onClick={async () => {
                    await api(`/views/${s.id}`, "DELETE");
                    setSaved(saved.filter((v) => v.id !== s.id));
                  }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        {list.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ISSUE / INVESTIGATION</th>
                  <th>OUTCOME</th>
                  <th>EVIDENCE</th>
                  <th>UPDATED</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} onClick={() => onOpen(r.id)}>
                    <td>
                      <button
                        className="row-title"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(r.id);
                        }}
                      >
                        <span
                          className={`issue-icon ${r.outcome === "patch_verified" ? "resolved" : ""}`}
                        >
                          {r.outcome === "patch_verified" ? (
                            <Check size={16} />
                          ) : (
                            <GitBranch size={16} />
                          )}
                        </span>
                        <span>
                          <strong>{r.input.title}</strong>
                          <small>
                            {r.repositoryName}
                            <span>·</span>
                            {r.id.slice(0, 8)}
                            {r.input.engine === "fixture" && (
                              <em>Reference repair</em>
                            )}
                            {r.repairOrigin === "developer" && (
                              <em>Developer-assisted</em>
                            )}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <Badge
                        status={
                          [
                            "blocked",
                            "failed",
                            "cancelled",
                            "running",
                            "queued",
                          ].includes(r.status)
                            ? r.status
                            : r.outcome
                        }
                      />
                    </td>
                    <td>
                      <span className="evidence-count">
                        {r.baseline ? (
                          <>
                            <Monitor size={14} />
                            {r.candidate
                              ? "Before & after"
                              : "Baseline captured"}
                          </>
                        ) : (
                          <span className="subtle">Awaiting capture</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="subtle nowrap">
                        {relative(r.updatedAt)}
                      </span>
                    </td>
                    <td>
                      <ArrowUpRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              runs.length
                ? "No matching investigations"
                : "Your first evidence packet starts here."
            }
            action={
              <button className="btn secondary" onClick={onCreate}>
                <Plus size={16} />
                Start an investigation
              </button>
            }
          >
            {runs.length
              ? "Try another filter or search term."
              : "Choose a bundled bug below, or connect a local repository. DawnPatch will reproduce the failure before proposing a fix."}
          </Empty>
        )}
        <div className="panel-foot">
          <span>
            {list.length} investigation{list.length !== 1 ? "s" : ""}
          </span>
          <span>
            <ShieldCheck size={13} />
            Your original source stays untouched
          </span>
        </div>
      </section>
      <section className="fixture-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A GOOD PLACE TO START</span>
            <h2>Three bugs. Real browser evidence.</h2>
          </div>
          <span className="subtle">Bundled Fieldnotes test application</span>
        </div>
        <div className="fixture-grid">
          {fixtures.map((f, i) => (
            <button
              className="fixture-card"
              key={f.key}
              onClick={() => onTemplate(f)}
            >
              <div className="fixture-top">
                <span className="fixture-number">0{i + 1}</span>
                <ArrowUpRight size={17} />
              </div>
              <h3>{f.title}</h3>
              <p>
                {i === 0
                  ? "Reproduce a pagination state regression."
                  : i === 1
                    ? "Catch a missing search empty state."
                    : "Verify a form submission without reloads."}
              </p>
              <span className="fixture-link">
                Inspect this case <ArrowRight size={13} />
              </span>
            </button>
          ))}
        </div>
      </section>
      <div className="quiet-note">
        <ShieldCheck size={16} />
        <p>
          <strong>You make the final call.</strong> DawnPatch proposes and
          checks changes. It never merges them automatically.
        </p>
      </div>
    </>
  );
}
function NewRun({
  initial,
  onClose,
  onCreated,
}: {
  initial: RunInput | null;
  onClose: () => void;
  onCreated: (r: Run) => void;
}) {
  const [fixtures, setFixtures] = useState<(RunInput & { key: string })[]>([]);
  const [form, setForm] = useState<RunInput>(
    initial || {
      title: "",
      description: "",
      source: "fixture",
      fixture: "pagination",
      repositoryPath: "",
      recipe: "html",
      steps: [{ type: "text", selector: "body", value: "" }],
      engine: "gemma",
      search: false,
      issueUrl: "",
      viewport: "desktop",
    },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => {
    api("/fixtures")
      .then((fs) => {
        setFixtures(fs);
        if (!initial) setForm(fs[0]);
      })
      .catch((e) => setError(e.message));
  }, []);
  const update = (patch: Partial<RunInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const step = (index: number, patch: any) =>
    update({
      steps: form.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      onCreated(await api("/runs", "POST", form));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title="Start an investigation" onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="modal-body">
          <div className="segmented">
            <button
              type="button"
              className={form.source === "fixture" ? "active" : ""}
              onClick={() => update({ source: "fixture", recipe: "html" })}
            >
              Bundled test case
            </button>
            <button
              type="button"
              className={form.source === "repository" ? "active" : ""}
              onClick={() =>
                update({
                  source: "repository",
                  engine: "gemma",
                  recipe: "vite",
                  title: "",
                  description: "",
                })
              }
            >
              Local repository
            </button>
          </div>
          {form.source === "fixture" ? (
            <label>
              Choose a known bug
              <select
                value={form.fixture}
                onChange={(e) =>
                  setForm({
                    ...fixtures.find((f) => f.fixture === e.target.value)!,
                    engine: form.engine,
                  })
                }
              >
                {fixtures.map((f) => (
                  <option key={f.key} value={f.fixture}>
                    {f.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <div className="inline-fields">
                <label>
                  GitHub issue URL <span className="subtle">(optional)</span>
                  <input
                    placeholder="https://github.com/owner/repo/issues/123"
                    value={form.issueUrl}
                    onChange={(e) => update({ issueUrl: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={async () => {
                    try {
                      update(
                        await api("/issues/import", "POST", {
                          url: form.issueUrl,
                        }),
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Import issue
                </button>
              </div>
              <label>
                Local repository path
                <input
                  required
                  placeholder="C:\Projects\your-repository"
                  value={form.repositoryPath}
                  onChange={(e) => update({ repositoryPath: e.target.value })}
                />
                <small>
                  Add its parent to SOURCE_ROOTS in .env. The working tree must
                  be clean.
                </small>
              </label>
              <label>
                Execution recipe
                <select
                  value={form.recipe}
                  onChange={(e) =>
                    update({ recipe: e.target.value as RunInput["recipe"] })
                  }
                >
                  <option value="vite">React / Vite · Docker</option>
                  <option value="next">Next.js · Docker</option>
                  <option value="html">Static HTML · local preview</option>
                </select>
              </label>
            </>
          )}
          <label>
            Issue title
            <input
              required
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <label>
            What should happen, and what happens instead?
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </label>
          <div className="form-section-title">
            <h3>Reproduction steps</h3>
            <span>Executed identically before & after</span>
          </div>
          <div className="steps-editor">
            {form.steps.map((s, i) => (
              <div className="step-row" key={i}>
                <span>{i + 1}</span>
                <select
                  aria-label={`Step ${i + 1} action`}
                  value={s.type}
                  onChange={(e) =>
                    step(i, {
                      type: e.target.value,
                      ...(["fill", "select", "text"].includes(e.target.value)
                        ? { value: "" }
                        : e.target.value === "count"
                          ? { value: 0 }
                          : {}),
                    })
                  }
                >
                  {[
                    "click",
                    "fill",
                    "select",
                    "text",
                    "visible",
                    "hidden",
                    "count",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <input
                  aria-label={`Step ${i + 1} selector`}
                  required
                  value={s.selector}
                  placeholder="#selector"
                  onChange={(e) => step(i, { selector: e.target.value })}
                />
                {"value" in s && (
                  <input
                    aria-label={`Step ${i + 1} value`}
                    value={s.value}
                    placeholder="Expected value"
                    onChange={(e) =>
                      step(i, {
                        value:
                          s.type === "count"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                )}
                <button
                  type="button"
                  aria-label={`Remove step ${i + 1}`}
                  className="icon-btn"
                  disabled={form.steps.length === 1}
                  onClick={() =>
                    update({ steps: form.steps.filter((_, j) => j !== i) })
                  }
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="text-btn"
            onClick={() =>
              update({
                steps: [
                  ...form.steps,
                  { type: "text", selector: "body", value: "" },
                ],
              })
            }
          >
            <Plus size={14} />
            Add step
          </button>
          <div className="form-section-title">
            <h3>Repair engine</h3>
          </div>
          <label className="radio-card">
            <input
              type="radio"
              name="engine"
              checked={form.engine === "gemma"}
              onChange={() => update({ engine: "gemma" })}
            />
            <span>
              <strong>Local Gemma + Mastra</strong>
              <small>
                Generate a real evidence-grounded patch using your installed
                model.
              </small>
            </span>
            <span className="mini-tag">LOCAL LLM</span>
          </label>
          {form.source === "fixture" && (
            <label className="radio-card">
              <input
                type="radio"
                name="engine"
                checked={form.engine === "fixture"}
                onChange={() => update({ engine: "fixture" })}
              />
              <span>
                <strong>Reference repair · no model</strong>
                <small>
                  Test the browser/evidence pipeline with a known fixture fix.
                  Clearly labeled in results.
                </small>
              </span>
            </label>
          )}
          <button
            type="button"
            className="text-btn advanced-toggle"
            onClick={() => setAdvanced(!advanced)}
          >
            <ChevronDown size={14} />
            Investigation options
          </button>
          {advanced && (
            <div className="advanced-options">
              <label>
                Viewport
                <select
                  value={form.viewport}
                  onChange={(e) =>
                    update({ viewport: e.target.value as "desktop" | "mobile" })
                  }
                >
                  <option value="desktop">Desktop · 1280 × 900</option>
                  <option value="mobile">Mobile · 390 × 844</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.search}
                  onChange={(e) => update({ search: e.target.checked })}
                />
                Research documentation with SerpApi (requires your API key)
              </label>
              <small>
                Bounded to five patch edits and one documentation query.
                Repository startup timeout: five minutes per preview. The local
                model timeout is configurable.
              </small>
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <span>
            <ShieldCheck size={14} />
            Edits stay in an isolated copy
          </span>
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
            Start investigation
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function CaseDetail({
  run: r,
  onBack,
  onNavigate,
  notify,
  onError,
  onRepeat,
}: {
  run: Run;
  onBack: () => void;
  onNavigate: (id: string) => void;
  notify: (s: string) => void;
  onError: (s: string) => void;
  onRepeat: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const [log, setLog] = useState<RunEvent[]>([]);
  const [related, setRelated] = useState<
    { id: string; title: string; reason: string; outcome: string }[]
  >([]);
  const [diff, setDiff] = useState("");
  const [approval, setApproval] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [correction, setCorrection] = useState({
    file: "",
    search: "",
    replace: "",
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api(`/runs/${r.id}/events`)
      .then(setLog)
      .catch(() => {});
  }, [r.id, r.updatedAt]);
  useEffect(() => {
    api(`/runs/${r.id}/related`)
      .then(setRelated)
      .catch(() => {});
  }, [r.id]);
  useEffect(() => {
    if (r.changes.length)
      fetch(`/api/runs/${r.id}/patch`)
        .then((v) => v.text())
        .then(setDiff)
        .catch(() => {});
  }, [r.id, r.candidateHash]);
  const action = async (kind: string) => {
    setBusy(true);
    try {
      await api(`/runs/${r.id}/${kind}`, "POST");
      notify(
        kind === "accept"
          ? "Review completed. Candidate kept locally."
          : kind === "retry"
            ? "Investigation queued to resume."
            : "Investigation cancelled.",
      );
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const active = ["running", "queued"].includes(r.status);
  const last = log.at(-1);
  const stale = last && Date.now() - Date.parse(last.at) > 30000;
  return (
    <>
      {correcting && (
        <Dialog
          title="Developer-assisted correction"
          onClose={() => setCorrecting(false)}
          wide
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api(`/runs/${r.id}/correction`, "POST", correction);
                setCorrecting(false);
                notify(
                  "Developer-assisted correction queued for browser verification.",
                );
              } catch (error) {
                onError((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="modal-body">
              <p>
                This correction will be labeled as developer-assisted. DawnPatch
                will apply it to an isolated copy and replay the original
                browser checks.
              </p>
              <label>
                Source filename
                <input
                  aria-label="Source filename"
                  required
                  value={correction.file}
                  onChange={(e) =>
                    setCorrection({ ...correction, file: e.target.value })
                  }
                />
              </label>
              <label>
                Exact old code
                <textarea
                  aria-label="Exact old code"
                  required
                  rows={4}
                  value={correction.search}
                  onChange={(e) =>
                    setCorrection({ ...correction, search: e.target.value })
                  }
                />
              </label>
              <label>
                Corrected code
                <textarea
                  aria-label="Corrected code"
                  required
                  rows={4}
                  value={correction.replace}
                  onChange={(e) =>
                    setCorrection({ ...correction, replace: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setCorrecting(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={busy}>
                Verify reviewed correction
              </button>
            </div>
          </form>
        </Dialog>
      )}
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={15} />
        Back to workbench
      </button>
      <div className="case-heading">
        <div>
          <div className="case-meta">
            <span className="mono">{r.repositoryName}</span>
            <span>/</span>
            <span className="mono">{r.id.slice(0, 8)}</span>
            <Badge
              status={
                active
                  ? r.status
                  : ["blocked", "failed", "cancelled"].includes(r.status)
                    ? r.status
                    : r.outcome
              }
            />
          </div>
          <h1>{r.input.title}</h1>
          <p>{r.input.description}</p>
        </div>
        <div className="case-actions">
          <a className="btn secondary" href={`/api/runs/${r.id}/export`}>
            <Download size={15} />
            Export report
          </a>
          {active ? (
            <button
              className="btn secondary danger-text"
              disabled={busy}
              onClick={() => void action("cancel")}
            >
              Cancel run
            </button>
          ) : ["blocked", "failed", "cancelled"].includes(r.status) ? (
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => void action("retry")}
            >
              <RefreshCw size={15} />
              Resume run
            </button>
          ) : (
            <button className="btn secondary" onClick={onRepeat}>
              <RefreshCw size={15} />
              Investigate again
            </button>
          )}
        </div>
      </div>
      {r.input.engine === "fixture" && (
        <div className="info-banner">
          <Terminal size={17} />
          <span>
            <strong>Reference repair.</strong> Browser evidence is real; the
            patch is a known fixture fix. No model inference was used.
          </span>
        </div>
      )}
      {r.repairOrigin === "developer" && (
        <div className="info-banner">
          <Code2 size={17} />
          <span>
            <strong>Developer-assisted correction.</strong> Source change
            supplied by a developer; browser verification is independent. This
            is not an autonomous Gemma repair.
          </span>
        </div>
      )}
      {!active &&
        !r.approval &&
        !r.publication &&
        r.baseline &&
        !r.baseline.passed &&
        (r.status === "failed" || r.outcome === "patch_failed") && (
          <button
            className="btn secondary"
            onClick={() => {
              setCorrection(
                r.changes[0] || { file: "", search: "", replace: "" },
              );
              setCorrecting(true);
            }}
          >
            Revise with reviewed correction
          </button>
        )}
      {r.error && (
        <div className="error-banner" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Investigation needs attention</strong>
            <p>{r.error}</p>
          </div>
        </div>
      )}
      {active && (
        <section className="panel progress-panel">
          <div className="progress-title">
            <span>
              <Loader2 size={17} className="spin" />
              <strong>
                {r.stage === "queued"
                  ? "Waiting for the worker"
                  : r.stage.charAt(0).toUpperCase() + r.stage.slice(1)}
              </strong>
            </span>
            <small>Started {relative(r.createdAt)}</small>
          </div>
          <div className="stage-track">
            {stageNames
              .filter((s) => r.input.search || s !== "researching")
              .map((s, i) => {
                const current = stageNames.indexOf(r.stage);
                return (
                  <div
                    key={s}
                    className={
                      current > stageNames.indexOf(s)
                        ? "done"
                        : s === r.stage
                          ? "current"
                          : ""
                    }
                  >
                    <span>
                      {current > stageNames.indexOf(s) ? (
                        <Check size={12} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    {s
                      .replace("preflight", "Prepare")
                      .replace("completed", "Review")}
                  </div>
                );
              })}
          </div>
          <p aria-live="polite">
            {last?.message || "Waiting for the first worker event."}
          </p>
          {r.stage === "analyzing" && r.input.engine === "gemma" && (
            <p className="subtle">
              Gemma is running locally. CPU analysis can take several minutes;
              this page updates automatically. You can cancel at any time.
            </p>
          )}
          {stale && (
            <small className="warning-text">
              No new event for{" "}
              {Math.floor((Date.now() - Date.parse(last!.at)) / 1000)} seconds.
              Last recorded activity: {last?.stage}. Model inference can take
              several minutes.
            </small>
          )}
        </section>
      )}
      <div className="detail-tabs tabs">
        {[
          ["overview", "Overview"],
          ["evidence", "Browser evidence"],
          ["patch", "Patch"],
          ["checks", "Checks"],
          ["activity", "Activity"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
            {id === "checks" && r.checks.length > 0 && (
              <span>{r.checks.length}</span>
            )}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="case-grid">
          <div>
            <section className="panel report-panel">
              <div className="panel-title">
                <h2>
                  <NotebookText size={17} />
                  Investigation report
                </h2>
              </div>
              <div className="report-content">
                <span className="eyebrow">OBSERVED BEHAVIOR</span>
                <h3>
                  {r.baseline
                    ? r.baseline.passed
                      ? "The supplied baseline checks pass."
                      : "The failure was reproduced."
                    : "Waiting for reproduction evidence."}
                </h3>
                <p>
                  {r.baseline?.assertions.find((a) => !a.passed)?.label ||
                    r.input.description}
                </p>
                {r.diagnosis && (
                  <>
                    <hr />
                    <span className="eyebrow">
                      PROPOSED EXPLANATION · HYPOTHESIS
                    </span>
                    <h3>{r.diagnosis.summary}</h3>
                    <p>{r.diagnosis.hypothesis}</p>
                  </>
                )}
                <hr />
                <span className="eyebrow">VERIFICATION</span>
                <div className="verification-callout">
                  {r.candidate?.passed ? (
                    <CheckCircle2 size={22} />
                  ) : r.candidate ? (
                    <XCircle size={22} />
                  ) : (
                    <Clock3 size={22} />
                  )}
                  <div>
                    <strong>
                      {r.candidate
                        ? r.candidate.passed
                          ? "The candidate passes the supplied checks."
                          : "The candidate still fails a check."
                        : "Candidate verification has not completed."}
                    </strong>
                    <p>
                      {r.candidate
                        ? "This result covers the specified assertions. Review the patch and broader regression coverage before merging."
                        : "A candidate is verified only after replaying the same assertions."}
                    </p>
                  </div>
                </div>
                {r.diagnosis?.limitations.length ? (
                  <div className="limitations">
                    <strong>Limitations</strong>
                    <ul>
                      {r.diagnosis.limitations.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {r.sources.length > 0 && (
                  <>
                    <hr />
                    <span className="eyebrow">DOCUMENTATION DISCOVERY</span>
                    <p className="subtle">
                      Search snippets are discovery context; these pages have
                      not been independently fetched and verified.
                    </p>
                    {r.sources.map((s) => (
                      <a
                        className="source-link"
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {s.title}
                        <ExternalLink size={13} />
                      </a>
                    ))}
                  </>
                )}
              </div>
            </section>
            {related.length > 0 && (
              <section className="panel related-panel">
                <div className="panel-title">
                  <h2>Related investigations</h2>
                </div>
                {related.map((v) => (
                  <button key={v.id} onClick={() => onNavigate(v.id)}>
                    <div>
                      <strong>{v.title}</strong>
                      <small>{v.reason}</small>
                    </div>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </section>
            )}
          </div>
          <aside className="case-aside">
            <section className="panel">
              <div className="panel-title">
                <h2>Run details</h2>
              </div>
              <dl>
                <dt>Repository</dt>
                <dd>{r.repositoryName}</dd>
                <dt>Baseline revision</dt>
                <dd className="mono">{r.baseSha.slice(0, 12) || "Pending"}</dd>
                <dt>Repair engine</dt>
                <dd>{r.usage.model}</dd>
                <dt>Source recipe</dt>
                <dd>
                  {r.input.recipe === "html"
                    ? "Static HTML"
                    : r.input.recipe === "next"
                      ? "Next.js / Docker"
                      : "React / Vite / Docker"}
                </dd>
                <dt>Viewport</dt>
                <dd>
                  {r.input.viewport === "desktop" ? "1280 × 900" : "390 × 844"}
                </dd>
                <dt>Model duration</dt>
                <dd>
                  {r.usage.durationMs
                    ? `${(r.usage.durationMs / 1000).toFixed(1)} seconds`
                    : "Not recorded"}
                </dd>
                <dt>Input / output tokens</dt>
                <dd>
                  {r.usage.inputTokens === null
                    ? "Not available"
                    : `${r.usage.inputTokens} / ${r.usage.outputTokens}`}
                </dd>
                <dt>Cost</dt>
                <dd>Not measured · local compute</dd>
              </dl>
            </section>
            {r.baseline && (
              <section className="panel evidence-preview">
                <div className="panel-title">
                  <h2>Captured evidence</h2>
                  <Monitor size={15} />
                </div>
                <button onClick={() => setTab("evidence")}>
                  <img
                    src={r.baseline.screenshot}
                    alt="Baseline screenshot from the actual browser run"
                  />
                  <span>
                    Inspect baseline & candidate <ArrowUpRight size={14} />
                  </span>
                </button>
              </section>
            )}
          </aside>
        </div>
      )}
      {tab === "evidence" && (
        <EvidenceView baseline={r.baseline} candidate={r.candidate} />
      )}
      {tab === "patch" && (
        <section className="panel">
          <div className="panel-title">
            <h2>
              <FileCode2 size={17} />
              {r.changes.length
                ? `${new Set(r.changes.map((c) => c.file)).size} file(s) changed`
                : "No candidate patch yet"}
            </h2>
            {r.changes.length > 0 && (
              <a
                href={`/api/runs/${r.id}/patch`}
                className="btn small secondary"
              >
                <Download size={14} />
                Download patch
              </a>
            )}
          </div>
          {diff ? (
            <div className="diff-view">
              {diff.split("\n").map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("+")
                      ? "addition"
                      : line.startsWith("-")
                        ? "deletion"
                        : line.startsWith("@@")
                          ? "hunk"
                          : ""
                  }
                >
                  <span>{i + 1}</span>
                  <code>{line || " "}</code>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={Code2} title="A patch will appear here">
              The model must produce a valid, bounded change after reproducing a
              failure.
            </Empty>
          )}
        </section>
      )}
      {tab === "checks" && (
        <section className="panel">
          <div className="panel-title">
            <h2>
              <ShieldCheck size={18} />
              Verification checks
            </h2>
          </div>
          {r.checks.length ? (
            r.checks.map((c) => (
              <div className="check-row" key={c.name}>
                {c.passed ? (
                  <CheckCircle2 size={21} className="green-text" />
                ) : (
                  <XCircle size={21} className="danger-text" />
                )}
                <div>
                  <strong>{c.name}</strong>
                  <p>{c.detail}</p>
                </div>
                <Badge status={c.passed ? "ready" : "failed"}>
                  {c.passed ? "Passed" : "Failed"}
                </Badge>
              </div>
            ))
          ) : (
            <Empty icon={ShieldCheck} title="Checks have not completed">
              Results will show the exact verification scope and any failures.
            </Empty>
          )}
        </section>
      )}
      {tab === "activity" && (
        <section className="panel">
          <div className="panel-title">
            <h2>
              <Activity size={18} />
              Recorded activity
            </h2>
            <span className="subtle">{log.length} events</span>
          </div>
          <ol className="event-list">
            {log.map((e) => (
              <li key={e.id}>
                <span
                  className={`event-dot ${e.stage === "error" ? "error" : ""}`}
                />
                <div>
                  <strong>{e.stage.replaceAll("_", " ")}</strong>
                  <p>{e.message}</p>
                </div>
                <time>
                  {new Date(e.at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ol>
        </section>
      )}
      {r.status === "awaiting_review" && (
        <div className="review-bar">
          <div>
            <ShieldCheck size={22} />
            <span>
              <strong>Ready for your review.</strong>
              <small>
                Inspect the evidence and exact patch before deciding.
              </small>
            </span>
          </div>
          <div>
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => void action("accept")}
            >
              <Check size={16} />
              Accept locally
            </button>
            {r.input.source === "repository" && (
              <button className="btn primary" onClick={() => setApproval(true)}>
                <GitPullRequest size={16} />
                Publish draft PR
              </button>
            )}
          </div>
        </div>
      )}
      {r.publication && (
        <div className="success-banner">
          <GitPullRequest size={19} />
          <a href={r.publication.url} target="_blank" rel="noreferrer">
            Open published draft PR <ExternalLink size={14} />
          </a>
        </div>
      )}
      {approval && (
        <Dialog
          title="Publish this candidate as a draft PR?"
          onClose={() => setApproval(false)}
        >
          <div className="modal-body">
            <p>
              This writes a new branch and draft pull request to your
              repository's GitHub origin. No merge will happen.
            </p>
            <dl>
              <dt>Repository</dt>
              <dd>{r.repositoryName}</dd>
              <dt>Base revision</dt>
              <dd className="mono">{r.baseSha}</dd>
              <dt>Candidate fingerprint</dt>
              <dd className="mono break">{r.candidateHash}</dd>
              <dt>Files changed</dt>
              <dd>{new Set(r.changes.map((c) => c.file)).size}</dd>
            </dl>
            <p className="subtle">
              The server rechecks the exact candidate, current GitHub base
              revision, token permissions, and any previous publication before
              writing.
            </p>
          </div>
          <div className="modal-footer">
            <button
              className="btn secondary"
              onClick={() => setApproval(false)}
            >
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/runs/${r.id}/approve`, "POST", {
                    hash: r.candidateHash,
                  });
                  await api(`/runs/${r.id}/publish`, "POST");
                  notify("Draft PR published.");
                  setApproval(false);
                } catch (e) {
                  onError((e as Error).message);
                  setApproval(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <GitPullRequest size={16} />
              )}
              Publish draft PR
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
function EvidenceView({
  baseline,
  candidate,
}: {
  baseline: Evidence | null;
  candidate: Evidence | null;
}) {
  const [side, setSide] = useState<"baseline" | "candidate">("baseline");
  const [compare, setCompare] = useState(false);
  const [slider, setSlider] = useState(50);
  const [detail, setDetail] = useState("assertions");
  const e = side === "baseline" ? baseline : candidate;
  if (!baseline)
    return (
      <section className="panel">
        <Empty icon={Monitor} title="No browser evidence yet">
          Screenshots, assertions, and traces appear after reproduction.
        </Empty>
      </section>
    );
  return (
    <section className="panel">
      <div className="panel-title">
        <div className="segmented compact">
          <button
            className={side === "baseline" ? "active" : ""}
            onClick={() => {
              setSide("baseline");
              setCompare(false);
            }}
          >
            Baseline
          </button>
          <button
            disabled={!candidate}
            className={side === "candidate" ? "active" : ""}
            onClick={() => {
              setSide("candidate");
              setCompare(false);
            }}
          >
            Candidate
          </button>
        </div>
        <div className="evidence-tools">
          {candidate && (
            <button
              className={`btn small ${compare ? "primary" : "secondary"}`}
              onClick={() => setCompare(!compare)}
            >
              Compare
            </button>
          )}
          <a className="btn small secondary" href={e?.trace} download>
            <Download size={13} />
            Browser trace
          </a>
        </div>
      </div>
      <div className="browser-chrome">
        <span />
        <span />
        <span />
        <code>
          {compare ? "Baseline / candidate — matching viewport" : e?.url}
        </code>
      </div>
      {compare && candidate ? (
        <>
          <div className="comparison">
            <img src={candidate.screenshot} alt="Candidate after the patch" />
            <div
              className="comparison-before"
              style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
            >
              <img src={baseline.screenshot} alt="Baseline before the patch" />
            </div>
            <div className="comparison-line" style={{ left: slider + "%" }} />
            <span className="comparison-label before">Before</span>
            <span className="comparison-label after">After</span>
          </div>
          <label className="slider-label">
            Before / after comparison
            <input
              type="range"
              min="0"
              max="100"
              value={slider}
              onChange={(e) => setSlider(Number(e.target.value))}
            />
          </label>
        </>
      ) : e ? (
        <a
          className="screenshot-link"
          href={e.screenshot}
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={e.screenshot}
            alt={`${side} browser screenshot at ${e.viewport.width} by ${e.viewport.height}`}
          />
        </a>
      ) : null}
      <div className="evidence-metadata">
        <span>
          {e?.viewport.width} × {e?.viewport.height} ·{" "}
          {((e?.durationMs || 0) / 1000).toFixed(1)}s
        </span>
        <span>
          Screenshot is supporting evidence; assertions determine the result.
        </span>
      </div>
      <div className="tabs evidence-tabs">
        <button
          className={detail === "assertions" ? "active" : ""}
          onClick={() => setDetail("assertions")}
        >
          Steps & assertions
        </button>
        <button
          className={detail === "console" ? "active" : ""}
          onClick={() => setDetail("console")}
        >
          Console ({e?.console.length || 0})
        </button>
      </div>
      {detail === "assertions" ? (
        <div>
          {e?.assertions.map((a, i) => (
            <div className="assertion-row" key={i}>
              {a.passed ? (
                <CheckCircle2 size={17} className="green-text" />
              ) : (
                <XCircle size={17} className="danger-text" />
              )}
              <div>
                <code>{a.label}</code>
                {a.error && <pre>{a.error}</pre>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <pre className="console-log">
          {e?.console.join("\n") || "No console messages recorded."}
        </pre>
      )}
    </section>
  );
}
function Brief({ runs, open }: { runs: Run[]; open: (id: string) => void }) {
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const list = runs.filter(
    (r) => new Date(r.updatedAt).toLocaleDateString("en-CA") === date,
  );
  const ready = list.filter((r) => r.status === "awaiting_review");
  const exportBrief = () =>
    download(
      `# DawnPatch morning brief · ${date}\n\n${list.map((r) => `## ${r.input.title}\n${r.repositoryName} · ${outcomeLabel(r.outcome)}\n${r.diagnosis?.summary || r.error || r.stage}\nRun: ${r.id}\n`).join("\n")}`,
      `dawnpatch-brief-${date}.md`,
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LESS INVESTIGATION. MORE PERSPECTIVE.</span>
          <h1>Your morning brief.</h1>
          <p>A written handoff from the work your computer did.</p>
        </div>
        <button className="btn secondary" onClick={exportBrief}>
          <Download size={16} />
          Export brief
        </button>
      </div>
      <section className="brief-paper">
        <div className="brief-masthead">
          <Sunrise size={30} />
          <span>THE DAWNPATCH BRIEF</span>
          <input
            aria-label="Brief date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <h2>
          {ready.length
            ? `${ready.length} candidate${ready.length === 1 ? "" : "s"} ready for your attention.`
            : list.length
              ? "Here is where the investigations stand."
              : "A quiet morning. Nothing to review yet."}
        </h2>
        <p className="brief-intro">
          {list.length} investigation{list.length === 1 ? "" : "s"} updated on
          this date. Results reflect the supplied checks, including failures and
          incomplete cases.
        </p>
        {list.length ? (
          list.map((r, i) => (
            <button
              className="brief-item"
              key={r.id}
              onClick={() => open(r.id)}
            >
              <span className="brief-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <Badge
                  status={
                    ["failed", "blocked"].includes(r.status)
                      ? r.status
                      : r.outcome
                  }
                />
                <h3>{r.input.title}</h3>
                <p>
                  {r.diagnosis?.summary ||
                    r.error ||
                    "Investigation is still in progress."}
                </p>
                <small>
                  {r.repositoryName} · {r.usage.model}
                </small>
              </div>
              <ArrowUpRight size={19} />
            </button>
          ))
        ) : (
          <Empty
            icon={NotebookText}
            title="Your brief will grow with your investigations"
          >
            Start a run or create an overnight schedule. Completed work will be
            collected here.
          </Empty>
        )}
        <div className="brief-footer">
          Generated from persisted local investigations. No invented
          productivity scores.
        </div>
      </section>
    </>
  );
}
function Schedules({
  runs,
  notify,
  onError,
}: {
  runs: Run[];
  notify: (s: string) => void;
  onError: (s: string) => void;
}) {
  const [items, setItems] = useState<Schedule[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Overnight maintenance");
  const [time, setTime] = useState("02:00");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [template, setTemplate] = useState("fixture");
  const [next, setNext] = useState<string[]>([]);
  const [fixtures, setFixtures] = useState<RunInput[]>([]);
  const refresh = () => api("/schedules").then(setItems);
  useEffect(() => {
    void refresh();
    api("/fixtures").then(setFixtures);
  }, []);
  const body = () => ({
    name,
    hour: Number(time.split(":")[0]),
    minute: Number(time.split(":")[1]),
    timezone,
    input:
      template === "fixture"
        ? fixtures[0]
        : runs.find((r) => r.id === template)?.input,
  });
  const submit = async () => {
    try {
      await api("/schedules", "POST", body());
      await refresh();
      setOpen(false);
      notify(
        "Schedule created. Keep DawnPatch and the selected worker running.",
      );
    } catch (e) {
      onError((e as Error).message);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SET IT UP. COME BACK TO EVIDENCE.</span>
          <h1>A little work, overnight.</h1>
          <p>Daily investigations at a time that suits you.</p>
        </div>
        <button className="btn primary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          New schedule
        </button>
      </div>
      <div className="info-banner">
        <Clock3 size={18} />
        <span>
          Your computer, local model, and DawnPatch must be running. Missed
          occurrences older than one minute are skipped to prevent a backlog.
        </span>
      </div>
      <section className="panel">
        <div className="panel-title">
          <h2>
            Investigation schedules{" "}
            <span className="count">{items.length}</span>
          </h2>
        </div>
        {items.length ? (
          items.map((s) => (
            <div className="schedule-row" key={s.id}>
              <div className="schedule-symbol">
                <CalendarClock size={22} />
              </div>
              <div className="schedule-name">
                <strong>{s.name}</strong>
                <small>{s.input.title}</small>
              </div>
              <div>
                <strong>
                  {String(s.hour).padStart(2, "0")}:
                  {String(s.minute).padStart(2, "0")} daily
                </strong>
                <small>{s.timezone}</small>
              </div>
              <div>
                <Badge status={s.enabled ? "ready" : "cancelled"}>
                  {s.enabled ? "Active" : "Paused"}
                </Badge>
                <small>
                  Next: {new Date(s.nextRun).toLocaleString("en-IN")}
                </small>
              </div>
              <button
                className="icon-btn"
                aria-label={s.enabled ? "Pause schedule" : "Resume schedule"}
                onClick={async () => {
                  try {
                    await api(`/schedules/${s.id}`, "PATCH", {
                      enabled: !s.enabled,
                    });
                    await refresh();
                  } catch (e) {
                    onError((e as Error).message);
                  }
                }}
              >
                {s.enabled ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <button
                className="icon-btn danger-text"
                aria-label="Delete schedule"
                onClick={async () => {
                  try {
                    await api(`/schedules/${s.id}`, "DELETE");
                    await refresh();
                  } catch (e) {
                    onError((e as Error).message);
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <Empty
            icon={CalendarClock}
            title="Let the next investigation start itself."
            action={
              <button className="btn secondary" onClick={() => setOpen(true)}>
                <Plus size={15} />
                Create a schedule
              </button>
            }
          >
            Choose a case, set the local time and timezone, and keep your worker
            running.
          </Empty>
        )}
      </section>
      {open && (
        <Dialog
          title="Schedule an investigation"
          onClose={() => setOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="modal-body">
              <label>
                Schedule name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Investigation template
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  <option value="fixture">
                    Fieldnotes pagination · local Gemma
                  </option>
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.input.title} · {r.usage.model}
                    </option>
                  ))}
                </select>
              </label>
              <div className="two-columns">
                <label>
                  Daily start time
                  <input
                    required
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
                <label>
                  IANA timezone
                  <input
                    required
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </label>
              </div>
              <button
                className="btn secondary small"
                type="button"
                onClick={async () => {
                  try {
                    setNext(await api("/schedules/preview", "POST", body()));
                  } catch (e) {
                    onError((e as Error).message);
                  }
                }}
              >
                Preview next three runs
              </button>
              {next.length > 0 && (
                <ul className="next-runs">
                  {next.map((n) => (
                    <li key={n}>
                      {new Date(n).toLocaleString("en-IN", {
                        timeZone: timezone,
                      })}{" "}
                      · {timezone}
                    </li>
                  ))}
                </ul>
              )}
              <p className="subtle">
                Each occurrence creates one bounded investigation. Use separate
                schedules for additional issues or repositories.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn primary">
                Save schedule
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
function Connections({
  health: h,
  onCheck,
  notify,
  onError,
}: {
  health: Health | null;
  onCheck: () => Promise<void>;
  notify: (s: string) => void;
  onError: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState("");
  const [guide, setGuide] = useState(false);
  const check = async () => {
    setBusy(true);
    await onCheck();
    setBusy(false);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR COMPUTER IS THE RUNTIME</span>
          <h1>Settings & connections.</h1>
          <p>Local essentials and honest status for every integration.</p>
        </div>
        <button
          className="btn secondary"
          disabled={busy}
          onClick={() => void check()}
        >
          <RefreshCw size={16} className={busy ? "spin" : ""} />
          Check connections
        </button>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-title">
            <h2>
              <Terminal size={17} />
              Local runtime
            </h2>
            <Badge status="ready">Local</Badge>
          </div>
          <dl>
            <dt>Database</dt>
            <dd>{h?.local.database || "Checking"}</dd>
            <dt>Browser</dt>
            <dd>{h?.local.browser || "Checking"}</dd>
            <dt>Artifacts</dt>
            <dd>On your filesystem</dd>
            <dt>Workflow engine</dt>
            <dd>
              {h?.workflowEngine === "temporal"
                ? "Temporal"
                : "Local queue + SQLite checkpoints"}
            </dd>
            <dt>Repository sandbox</dt>
            <dd>
              <Badge status={h?.docker ? "ready" : "setup"}>
                {h?.docker ? "Docker ready" : "Start Docker Desktop"}
              </Badge>
            </dd>
          </dl>
          <div className="settings-note">
            Static HTML fixtures work without Docker. React/Vite and Next.js
            builds require the isolated Docker runner.
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>
              <Zap size={17} />
              Local model
            </h2>
          </div>
          <div className="settings-model">
            <label>
              Gemma model ID
              <input
                value={model || h?.model || ""}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gemma3:1b"
              />
            </label>
            <button
              className="btn secondary small"
              onClick={async () => {
                try {
                  await api("/settings/model", "PUT", {
                    model: model || h?.model,
                  });
                  await onCheck();
                  notify("Local model selection saved.");
                } catch (e) {
                  onError((e as Error).message);
                }
              }}
            >
              Save model
            </button>
            <p className="subtle">
              Installed: {h?.models.join(", ") || "No models detected"}
            </p>
            <code>ollama pull {model || h?.model || "gemma3:1b"}</code>
          </div>
        </section>
      </div>
      <section className="panel connections-panel">
        <div className="panel-title">
          <h2>Track integrations</h2>
          <button className="text-btn" onClick={() => setGuide(true)}>
            Setup guide <ArrowUpRight size={13} />
          </button>
        </div>
        {h?.connections.map((c, i) => (
          <div className="connection-row" key={c.id}>
            <span className="provider-icon">
              {["G", "M", "T", "S", "↗", "E", "C", "GH"][i]}
            </span>
            <div className="connection-name">
              <strong>
                {c.name}
                {!c.track && <span className="mini-tag">SUPPORTING</span>}
              </strong>
              <p>{c.detail}</p>
            </div>
            <Badge status={c.status}>
              {c.status === "ready"
                ? "Ready"
                : c.status === "configured"
                  ? "Configured · unverified"
                  : c.status === "manual"
                    ? "Evidence required"
                    : c.status === "offline"
                      ? "Offline"
                      : "Setup needed"}
            </Badge>
            {["sentry", "serpapi"].includes(c.id) &&
              c.status === "configured" && (
                <button
                  className="btn secondary small"
                  onClick={async () => {
                    try {
                      const result = await api(
                        `/connections/${c.id}/test`,
                        "POST",
                      );
                      notify(
                        c.id === "sentry"
                          ? result.message
                          : `Search returned ${result.length} results.`,
                      );
                    } catch (e) {
                      onError((e as Error).message);
                    }
                  }}
                >
                  Test
                </button>
              )}
          </div>
        ))}
      </section>
      <section className="panel policy-panel">
        <div className="panel-title">
          <h2>
            <ShieldCheck size={17} />
            Repository access
          </h2>
        </div>
        <p>
          Only repositories beneath explicitly authorized SOURCE_ROOTS can be
          copied. DawnPatch rejects dirty Git working trees and never edits the
          original source.
        </p>
        <pre>
          {h?.sourceRoots.length
            ? h.sourceRoots.join("\n")
            : "No repository roots authorized. Bundled fixtures are available."}
        </pre>
        <p className="subtle">
          Configure SOURCE_ROOTS in .env and restart. On Windows, separate paths
          with semicolons. All app/API endpoints bind to loopback.
        </p>
      </section>
      {guide && (
        <Dialog
          title="Connect the real services"
          onClose={() => setGuide(false)}
        >
          <div className="modal-body">
            <p>
              Create a local <code>.env</code> from <code>.env.example</code>.
              Keep keys out of Git and screenshots.
            </p>
            <ol className="setup-list">
              <li>
                <strong>Gemma:</strong> start Ollama and pull the configured
                Gemma model. No API key is needed for local inference.
              </li>
              <li>
                <strong>Temporal:</strong> run a local Temporal service, set
                WORKFLOW_ENGINE=temporal, and run npm run worker.
              </li>
              <li>
                <strong>Sentry:</strong> create a Node project and set
                SENTRY_DSN. Use Test, then inspect the actual event and run
                spans.
              </li>
              <li>
                <strong>SerpApi:</strong> set SERPAPI_API_KEY, then test a
                search. Enable research on an investigation to use it.
              </li>
              <li>
                <strong>Entire:</strong> install a supported CLI/agent pairing
                and capture a real development session. This is separate from
                app runtime.
              </li>
              <li>
                <strong>Copilot / Actions:</strong> retain actual development
                assistance or a qualifying workflow run. Installed code alone is
                not evidence.
              </li>
              <li>
                <strong>GitHub:</strong> set a narrowly scoped GITHUB_TOKEN only
                for draft PR testing against your own repository.
              </li>
            </ol>
            <p className="subtle">
              Restart after changing environment variables. Configured
              credentials are not shown as verified until exercised.
            </p>
          </div>
          <div className="modal-footer">
            <button className="btn primary" onClick={() => setGuide(false)}>
              Got it
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
