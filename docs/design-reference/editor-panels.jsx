/* Editor chrome: TopBar, LeftPanel, RightPanel, ShareModal, CommentCard.
   window.Panels */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { Avatar, Btn, Modal } = window.UI;

  /* ---------------- Top bar ---------------- */
  function TopBar({ users, liveUsers, doc, onDashboard, onShare, onHistory, leftOpen, rightOpen, setLeftOpen, setRightOpen }) {
    const online = [users.you, ...liveUsers.map((l) => users[l.id])];
    return React.createElement("div", { className: "topbar" },
      React.createElement("div", { className: "brand", style: { cursor: "pointer" }, onClick: onDashboard, title: "All diagrams" },
        React.createElement("div", { className: "brand__mark" }, React.createElement(Icon, { name: "table", size: 15 })),
        React.createElement("div", { className: "brand__name" }, "draw", React.createElement("b", null, "DB"), " Live")
      ),
      React.createElement("div", { className: "crumb" },
        React.createElement("span", { className: "crumb__sep" }, "/"),
        React.createElement("div", { className: "crumb__doc" },
          React.createElement("b", null, doc),
          React.createElement(Icon, { name: "chevronDown", size: 14, style: { color: "var(--ink-3)" } })
        ),
        React.createElement("span", { className: "saved" }, React.createElement("span", { className: "dot" }), "Saved · synced")
      ),
      React.createElement("div", { className: "spacer" }),

      React.createElement(Btn, { iconOnly: true, variant: leftOpen ? "ghost" : "ghost", icon: "table",
        title: "Toggle tables panel", onClick: () => setLeftOpen((v) => !v),
        style: leftOpen ? { color: "var(--accent-strong)", background: "var(--accent-soft)" } : null }),
      React.createElement(Btn, { iconOnly: true, variant: "ghost", icon: "code", title: "Export SQL" }),
      React.createElement(Btn, { iconOnly: true, variant: "ghost", icon: "clock", title: "Version history", onClick: onHistory }),
      React.createElement(Btn, { iconOnly: true, variant: "ghost", icon: "users",
        title: "Toggle collaboration panel", onClick: () => setRightOpen((v) => !v),
        style: rightOpen ? { color: "var(--accent-strong)", background: "var(--accent-soft)" } : null }),

      React.createElement("div", { style: { width: 1, height: 24, background: "var(--line)", margin: "0 4px" } }),

      React.createElement("div", { className: "presence" },
        online.slice(0, 4).map((u) => React.createElement(Avatar, { key: u.id, user: u, size: 28, ring: true }))
      ),
      React.createElement(Btn, { variant: "primary", icon: "share", onClick: onShare, style: { marginLeft: 6 } }, "Share")
    );
  }

  /* ---------------- Left panel ---------------- */
  function LeftPanel({ tables, rels, users, locks, selected, setSelected }) {
    const [tab, setTab] = useState("tables");
    const [q, setQ] = useState("");
    const byId = Object.fromEntries(tables.map((t) => [t.id, t]));
    const filtered = tables.filter((t) => t.name.includes(q.toLowerCase()));

    return React.createElement("div", { className: "panel panel--left" },
      React.createElement("div", { className: "panel__tabs" },
        React.createElement("button", { className: "ptab" + (tab === "tables" ? " active" : ""), onClick: () => setTab("tables") },
          React.createElement(Icon, { name: "table", size: 15 }), "Tables",
          React.createElement("span", { className: "badge" }, tables.length)),
        React.createElement("button", { className: "ptab" + (tab === "rels" ? " active" : ""), onClick: () => setTab("rels") },
          React.createElement(Icon, { name: "link", size: 15 }), "Relations",
          React.createElement("span", { className: "badge" }, rels.length))
      ),
      tab === "tables" && React.createElement(React.Fragment, null,
        React.createElement("div", { className: "search" },
          React.createElement(Icon, { name: "search", size: 15 }),
          React.createElement("input", { placeholder: "Search tables…", value: q, onChange: (e) => setQ(e.target.value) })),
        React.createElement("div", { className: "panel__body" },
          filtered.map((t) => React.createElement("div", {
            key: t.id, className: "tl" + (selected === t.id ? " active" : ""),
            onClick: () => setSelected(t.id),
          },
            React.createElement("div", { className: "tl__swatch", style: { background: t.color } }),
            React.createElement("div", { className: "tl__main" },
              React.createElement("div", { className: "tl__name" }, t.name,
                locks[t.id] && React.createElement("span", { className: "tl__lock", title: users[locks[t.id]].name + " editing" },
                  React.createElement(Icon, { name: "lock", size: 12 }))),
              React.createElement("div", { className: "tl__meta" }, t.fields.length + " fields")),
            React.createElement(Icon, { name: "chevronRight", size: 15, style: { color: "var(--ink-4)" } })
          )),
          React.createElement("button", { className: "btn btn--ghost", style: { width: "100%", justifyContent: "flex-start", marginTop: 6, color: "var(--ink-3)" } },
            React.createElement(Icon, { name: "plus", size: 15 }), "New table")
        )
      ),
      tab === "rels" && React.createElement("div", { className: "panel__body" },
        rels.map((r) => {
          const a = byId[r.from[0]], b = byId[r.to[0]];
          const af = a.fields.find((f) => f.id === r.from[1]), bf = b.fields.find((f) => f.id === r.to[1]);
          return React.createElement("div", { key: r.id, className: "rl" },
            React.createElement("div", { className: "rl__top" },
              React.createElement("span", { className: "chip", style: { height: 18, padding: "0 6px" } }, r.card),
              React.createElement("span", { className: "rl__card" }, a.name, " → ", b.name)),
            React.createElement("div", { className: "rl__bot" }, af.name, " references ", b.name, "(", bf.name, ")")
          );
        })
      )
    );
  }

  /* ---------------- Right (collab) panel ---------------- */
  function RightPanel({ users, liveUsers, locks, comments, activity, onOpenComment, onShare }) {
    const [tab, setTab] = useState("people");
    const open = comments.filter((c) => !c.resolved);

    return React.createElement("div", { className: "panel panel--right" },
      React.createElement("div", { className: "panel__tabs" },
        React.createElement("button", { className: "ptab" + (tab === "people" ? " active" : ""), onClick: () => setTab("people") },
          React.createElement(Icon, { name: "users", size: 15 }), "People",
          React.createElement("span", { className: "badge" }, liveUsers.length + 1)),
        React.createElement("button", { className: "ptab" + (tab === "comments" ? " active" : ""), onClick: () => setTab("comments") },
          React.createElement(Icon, { name: "comment", size: 15 }), "Comments",
          React.createElement("span", { className: "badge" }, open.length)),
        React.createElement("button", { className: "ptab" + (tab === "activity" ? " active" : ""), onClick: () => setTab("activity") },
          React.createElement(Icon, { name: "activity", size: 15 }), "Activity")
      ),

      tab === "people" && React.createElement("div", { className: "panel__body" },
        React.createElement("div", { className: "panel__head", style: { padding: "6px 4px 8px" } },
          React.createElement("span", { className: "panel__title" }, "In this diagram"),
          React.createElement(Btn, { sm: true, variant: "ghost", icon: "plus", onClick: onShare }, "Invite")),
        // current user
        React.createElement("div", { className: "person" },
          React.createElement(Avatar, { user: users.you, size: 32, ring: true }),
          React.createElement("div", { className: "person__main" },
            React.createElement("div", { className: "person__name" }, "You ",
              React.createElement("span", { className: "chip", style: { height: 16, padding: "0 6px", fontSize: 10 } }, "Owner")),
            React.createElement("div", { className: "person__status" }, "Editing now")),
          React.createElement("span", { className: "dot-live" })
        ),
        liveUsers.map((l) => {
          const u = users[l.id];
          const editing = Object.entries(locks).find(([, uid]) => uid === l.id);
          return React.createElement("div", { key: l.id, className: "person" },
            React.createElement(Avatar, { user: u, size: 32, ring: true }),
            React.createElement("div", { className: "person__main" },
              React.createElement("div", { className: "person__name" }, u.name),
              React.createElement("div", { className: "person__status" },
                editing ? "Editing " + editing[0] : "Viewing " + l.viewing)),
            React.createElement("span", { className: "dot-live", style: { background: u.color, boxShadow: "0 0 0 3px color-mix(in srgb, " + u.color + " 22%, transparent)" } })
          );
        }),
        React.createElement("div", { style: { borderTop: "1px solid var(--line)", margin: "10px 4px" } }),
        React.createElement("div", { className: "person", style: { opacity: .6 } },
          React.createElement(Avatar, { user: users.leo, size: 32 }),
          React.createElement("div", { className: "person__main" },
            React.createElement("div", { className: "person__name" }, users.leo.name),
            React.createElement("div", { className: "person__status" }, "Last seen 2h ago")))
      ),

      tab === "comments" && React.createElement("div", { className: "panel__body" },
        comments.map((c, i) => {
          const u = users[c.author];
          return React.createElement("div", { key: c.id, className: "thread", onClick: () => onOpenComment(c) },
            React.createElement("div", { className: "thread__head" },
              React.createElement(Avatar, { user: u, size: 24 }),
              React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700 } }, u.name.split(" ")[0]),
              React.createElement("span", { className: "thread__where" }, "#" + c.table),
              c.resolved && React.createElement("span", { style: { marginLeft: "auto", color: "var(--u-you)" } },
                React.createElement(Icon, { name: "checkCircle", size: 16 }))),
            React.createElement("div", { className: "thread__msg" }, c.msg),
            React.createElement("div", { className: "thread__meta" },
              React.createElement(Icon, { name: "comment", size: 13 }), c.replies, " replies · ", c.time)
          );
        })
      ),

      tab === "activity" && React.createElement("div", { className: "panel__body" },
        activity.map((a, i) => {
          const u = users[a.who];
          return React.createElement("div", { key: a.id, className: "act" },
            React.createElement("div", { className: "act__rail" },
              React.createElement(Avatar, { user: u, size: 26 }),
              i < activity.length - 1 && React.createElement("div", { className: "act__line" })),
            React.createElement("div", { className: "act__body" },
              React.createElement("div", { className: "act__txt" },
                React.createElement("b", null, a.who === "you" ? "You" : u.name.split(" ")[0]), " ", a.action, " ",
                React.createElement("b", null, a.target)),
              React.createElement("div", { className: "act__time" },
                a.live ? React.createElement("span", { style: { color: "var(--u-you)", fontWeight: 700 } }, "● live now") : a.time))
          );
        })
      )
    );
  }

  /* ---------------- Comment card overlay ---------------- */
  function CommentCard({ comment, users, onClose, onResolve }) {
    const [val, setVal] = useState("");
    const isNew = comment.isNew;
    const u = isNew ? users.you : users[comment.author];
    return React.createElement("div", {
      className: "modal pop", style: {
        position: "absolute", top: 70, right: 24, width: 320, zIndex: 130,
        boxShadow: "var(--shadow-lg)",
      },
    },
      React.createElement("div", { className: "modal__head", style: { padding: "12px 14px" } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          React.createElement(Icon, { name: "comment", size: 16, style: { color: "var(--accent)" } }),
          React.createElement("div", { className: "modal__title", style: { fontSize: 14 } },
            isNew ? "New comment" : "Thread"),
          !isNew && React.createElement("span", { className: "thread__where" }, "#" + comment.table)),
        React.createElement(Btn, { iconOnly: true, sm: true, variant: "ghost", icon: "x", onClick: onClose })
      ),
      React.createElement("div", { style: { padding: "12px 14px", maxHeight: 280, overflowY: "auto" } },
        !isNew && React.createElement(React.Fragment, null,
          React.createElement("div", { style: { display: "flex", gap: 9, marginBottom: 12 } },
            React.createElement(Avatar, { user: u, size: 28 }),
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 12.5, fontWeight: 700 } }, u.name,
                React.createElement("span", { style: { color: "var(--ink-3)", fontWeight: 500, marginLeft: 6 } }, comment.time)),
              React.createElement("div", { style: { fontSize: 13, marginTop: 3, lineHeight: 1.5 } }, comment.msg))),
          comment.replies > 0 && React.createElement("div", { style: { display: "flex", gap: 9, marginBottom: 10 } },
            React.createElement(Avatar, { user: users.kenji, size: 28 }),
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 12.5, fontWeight: 700 } }, "Kenji",
                React.createElement("span", { style: { color: "var(--ink-3)", fontWeight: 500, marginLeft: 6 } }, "8m")),
              React.createElement("div", { style: { fontSize: 13, marginTop: 3, lineHeight: 1.5 } }, "Good call — let me adjust the type and push it.")))
        ),
        isNew && React.createElement("div", { style: { fontSize: 12.5, color: "var(--ink-3)", marginBottom: 10 } },
          "Pinned at ", React.createElement("span", { style: { fontFamily: "var(--mono)" } }, comment.x + ", " + comment.y))
      ),
      React.createElement("div", { style: { padding: "10px 14px", borderTop: "1px solid var(--line)", display: "flex", gap: 8, alignItems: "center" } },
        React.createElement(Avatar, { user: users.you, size: 26 }),
        React.createElement("input", { className: "input", style: { height: 34 }, autoFocus: true,
          placeholder: isNew ? "Write a comment…" : "Reply…", value: val, onChange: (e) => setVal(e.target.value),
          onKeyDown: (e) => { if (e.key === "Enter") onClose(); } }),
        React.createElement(Btn, { iconOnly: true, variant: "primary", icon: "arrowLeft",
          style: { transform: "rotate(90deg)" }, onClick: onClose })
      ),
      !isNew && React.createElement("div", { style: { padding: "0 14px 12px" } },
        React.createElement(Btn, { sm: true, variant: "ghost", icon: "checkCircle", onClick: onResolve,
          style: { color: "var(--u-you)" } }, comment.resolved ? "Resolved" : "Mark resolved"))
    );
  }

  /* ---------------- Share modal ---------------- */
  function ShareModal({ users, onClose }) {
    const [role, setRole] = useState("Can edit");
    const members = [
      { u: users.you, role: "Owner" },
      { u: users.maya, role: "Can edit" },
      { u: users.kenji, role: "Can edit" },
      { u: users.aisha, role: "Can comment" },
      { u: users.leo, role: "Can view" },
    ];
    return React.createElement(Modal, { title: "Share “Core Product DB”", onClose,
      foot: React.createElement(React.Fragment, null,
        React.createElement("div", { className: "link-box", style: { flex: 1 } },
          React.createElement(Icon, { name: "link", size: 15, style: { color: "var(--ink-3)" } }),
          React.createElement("code", null, "drawdb.live/d/core-product-db"),
          React.createElement(Btn, { sm: true, icon: "copy" }, "Copy")),
        React.createElement(Btn, { variant: "primary", onClick: onClose }, "Done")
      ) },
      React.createElement("div", { style: { display: "flex", gap: 8 } },
        React.createElement("input", { className: "input", placeholder: "Invite by email…", autoFocus: true }),
        React.createElement("button", { className: "select" }, role, React.createElement(Icon, { name: "chevronDown", size: 14 })),
        React.createElement(Btn, { variant: "primary" }, "Invite")),
      React.createElement("div", { style: { marginTop: 14, display: "flex", flexDirection: "column", gap: 2 } },
        members.map((m) => React.createElement("div", { key: m.u.id, className: "person", style: { padding: "7px 4px" } },
          React.createElement(Avatar, { user: m.u, size: 32 }),
          React.createElement("div", { className: "person__main" },
            React.createElement("div", { className: "person__name" }, m.u.name === "You" ? "You" : m.u.name),
            React.createElement("div", { className: "person__status" }, m.u.role)),
          React.createElement("button", { className: "select", disabled: m.role === "Owner",
            style: m.role === "Owner" ? { opacity: .6 } : null },
            m.role, m.role !== "Owner" && React.createElement(Icon, { name: "chevronDown", size: 14 }))
        )))
    );
  }

  window.Panels = { TopBar, LeftPanel, RightPanel, CommentCard, ShareModal };
})();
