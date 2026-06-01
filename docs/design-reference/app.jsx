/* Editor composition + router + mount. */
(function () {
  const { useState, useEffect } = React;
  const { TopBar, LeftPanel, RightPanel, CommentCard, ShareModal } = window.Panels;
  const Canvas = window.Canvas;

  function Editor({ settings, onDashboard, onHistory }) {
    const DB = window.DB;
    const [tables, setTables] = useState(DB.tables.map((t) => ({ ...t })));
    const [selected, setSelected] = useState("users");
    const [tool, setTool] = useState("select");
    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(true);
    const [shareOpen, setShareOpen] = useState(false);
    const [comments, setComments] = useState(DB.comments.map((c) => ({ ...c })));
    const [activeComment, setActiveComment] = useState(null);

    const openComment = (c) => {
      if (c.isNew) {
        const nc = { id: "c" + Date.now(), x: c.x, y: c.y, table: "canvas", resolved: false,
          author: "you", msg: "", time: "now", replies: 0, isNew: true };
        setComments((p) => [...p, nc]);
        setActiveComment(nc);
      } else {
        setActiveComment(c);
      }
    };
    const resolveComment = () => {
      setComments((p) => p.map((c) => c.id === activeComment.id ? { ...c, resolved: !c.resolved } : c));
      setActiveComment((c) => ({ ...c, resolved: !c.resolved }));
    };

    return React.createElement("div", { className: "app" },
      React.createElement(TopBar, {
        users: DB.users, liveUsers: DB.liveUsers, doc: "Core Product DB",
        onDashboard, onShare: () => setShareOpen(true), onHistory,
        leftOpen, rightOpen, setLeftOpen, setRightOpen,
      }),
      React.createElement("div", { className: "work" },
        leftOpen && React.createElement(LeftPanel, {
          tables, rels: DB.rels, users: DB.users, locks: DB.locks, selected, setSelected }),
        React.createElement(Canvas, {
          tables, setTables, rels: DB.rels, users: DB.users, locks: DB.locks,
          liveUsers: DB.liveUsers, comments, selected, setSelected, tool, setTool,
          motion: settings.motion, grid: settings.grid, pins: settings.pins, onOpenComment: openComment,
        }),
        rightOpen && React.createElement(RightPanel, {
          users: DB.users, liveUsers: DB.liveUsers, locks: DB.locks, comments,
          activity: DB.activity, onOpenComment: openComment, onShare: () => setShareOpen(true) }),
        activeComment && React.createElement(CommentCard, {
          comment: activeComment, users: DB.users,
          onClose: () => setActiveComment(null), onResolve: resolveComment }),
        shareOpen && React.createElement(ShareModal, { users: DB.users, onClose: () => setShareOpen(false) })
      )
    );
  }

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "#f97316",
    "motion": true,
    "grid": true,
    "pins": true
  }/*EDITMODE-END*/;

  function App() {
    const DB = window.DB;
    const [route, setRoute] = useState("dashboard");
    const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
    const settings = t;

    // apply accent to CSS var
    useEffect(() => {
      const root = document.documentElement;
      root.style.setProperty("--accent", settings.accent);
      root.style.setProperty("--accent-strong", shade(settings.accent, -16));
      root.style.setProperty("--accent-soft", tint(settings.accent, 0.90));
      root.style.setProperty("--accent-ring", hexA(settings.accent, 0.30));
    }, [settings.accent]);

    let page;
    if (route === "dashboard")
      page = React.createElement(window.Dashboard, { diagrams: DB.diagrams, users: DB.users, onOpen: () => setRoute("editor") });
    else if (route === "history")
      page = React.createElement(window.History, { versions: DB.versions, tables: DB.tables, users: DB.users, onBack: () => setRoute("editor") });
    else
      page = React.createElement(Editor, { settings, onDashboard: () => setRoute("dashboard"), onHistory: () => setRoute("history") });

    const { TweaksPanel, TweakSection, TweakColor, TweakToggle } = window;
    return React.createElement(React.Fragment, null,
      page,
      React.createElement(TweaksPanel, null,
        React.createElement(TweakSection, { label: "Brand" }),
        React.createElement(TweakColor, { label: "Accent", value: settings.accent,
          options: ["#f97316", "#2f73e0", "#7c3aed", "#0f9d6b", "#e11d48"],
          onChange: (v) => setTweak("accent", v) }),
        React.createElement(TweakSection, { label: "Canvas" }),
        React.createElement(TweakToggle, { label: "Dot grid", value: settings.grid, onChange: (v) => setTweak("grid", v) }),
        React.createElement(TweakSection, { label: "Collaboration" }),
        React.createElement(TweakToggle, { label: "Live cursors motion", value: settings.motion, onChange: (v) => setTweak("motion", v) }),
        React.createElement(TweakToggle, { label: "Comment pins", value: settings.pins, onChange: (v) => setTweak("pins", v) })
      )
    );
  }

  // color helpers
  function hx(c) { return Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"); }
  function parse(h) { h = h.replace("#", ""); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
  function shade(h, p) { const [r,g,b] = parse(h); const f = 1 + p/100; return "#" + hx(r*f) + hx(g*f) + hx(b*f); }
  function tint(h, p) { const [r,g,b] = parse(h); return "#" + hx(r+(255-r)*p) + hx(g+(255-g)*p) + hx(b+(255-b)*p); }
  function hexA(h, a) { const [r,g,b] = parse(h); return `rgba(${r},${g},${b},${a})`; }

  ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
})();
