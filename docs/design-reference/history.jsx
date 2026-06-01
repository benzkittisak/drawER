/* Version history / timeline. window.History */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { Avatar, Btn } = window.UI;

  const NODE_W = 234, STRIP = 7, HEAD = 38, FIELD = 33;

  function StaticNode({ t, dim }) {
    return React.createElement("div", {
      className: "node", style: { left: t.x, top: t.y, width: NODE_W, opacity: dim ? .42 : 1,
        boxShadow: "var(--shadow-sm)", transition: "opacity .3s" } },
      React.createElement("div", { className: "node__strip", style: { background: t.color } }),
      React.createElement("div", { className: "node__head", style: { cursor: "default" } },
        React.createElement(Icon, { name: "table", size: 15, className: "node__icon" }),
        React.createElement("div", { className: "node__name" }, t.name)),
      t.fields.map((f) => React.createElement("div", { key: f.id, className: "node__field" },
        React.createElement("div", { className: "node__grip", style: { opacity: f.fk ? .8 : .3, background: f.fk ? "var(--accent)" : "#fff" } }),
        f.pk && React.createElement(Icon, { name: "key", size: 13, className: "node__key" }),
        React.createElement("div", { className: "node__fname" + (f.pk ? " pk" : "") }, f.name),
        React.createElement("div", { className: "node__ftype" }, f.type)))
    );
  }

  function History({ versions, tables, users, onBack }) {
    const [sel, setSel] = useState(versions[0].id);
    const cur = versions.find((v) => v.id === sel);
    // highlight set: which tables are "new" in selected version (mock)
    const highlight = { v6: ["subs", "invoices"], v5: ["users"], v4: ["tasks"], v3: ["projects"], v2: ["orgs", "projects"], v1: ["users"] }[sel] || [];

    return React.createElement("div", { className: "hist" },
      React.createElement("div", { className: "topbar" },
        React.createElement(Btn, { variant: "ghost", icon: "arrowLeft", onClick: onBack }, "Back to editor"),
        React.createElement("div", { style: { width: 1, height: 24, background: "var(--line)" } }),
        React.createElement("div", { style: { fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" } }, "Version history"),
        React.createElement("span", { className: "crumb__sep" }, "·"),
        React.createElement("span", { style: { color: "var(--ink-3)", fontSize: 13 } }, "Core Product DB"),
        React.createElement("div", { className: "spacer" }),
        React.createElement(Btn, { icon: "download" }, "Export this version"),
        React.createElement(Btn, { variant: "primary", icon: "undo", disabled: cur.current },
          cur.current ? "Current version" : "Restore this version")
      ),

      React.createElement("div", { className: "hist__main" },
        React.createElement("div", { className: "hist__list" },
          React.createElement("div", { className: "panel__title", style: { padding: "4px 6px 12px" } }, "Timeline"),
          versions.map((v, i) => React.createElement("div", {
            key: v.id, className: "ver" + (sel === v.id ? " active" : ""), onClick: () => setSel(v.id) },
            React.createElement("div", { className: "ver__rail" },
              React.createElement("div", { className: "ver__node" }),
              i < versions.length - 1 && React.createElement("div", { className: "ver__line" })),
            React.createElement("div", { className: "ver__body" },
              React.createElement("div", { className: "ver__label" }, v.label,
                v.current && React.createElement("span", { className: "chip", style: { height: 17, marginLeft: 8, background: "var(--accent-soft)", color: "var(--accent-strong)", borderColor: "transparent" } }, "current")),
              React.createElement("div", { className: "ver__meta" },
                React.createElement(Avatar, { user: users[v.who], size: 18 }),
                v.who === "you" ? "You" : users[v.who].name.split(" ")[0], " · ", v.time),
              React.createElement("div", { className: "ver__tags" },
                v.diffs.map((d, k) => React.createElement("span", { key: k, className: "difftag " + d.t }, d.l)))))
          )
        ),

        React.createElement("div", { className: "hist__preview" },
          React.createElement("div", { className: "canvas-grid" }),
          React.createElement("div", { style: { position: "absolute", top: 16, left: 16, zIndex: 5, display: "flex", gap: 8, alignItems: "center" } },
            React.createElement("span", { className: "chip", style: { background: "var(--surface)", boxShadow: "var(--shadow-sm)" } },
              React.createElement(Avatar, { user: users[cur.who], size: 16 }), cur.label),
            React.createElement("span", { className: "chip", style: { background: "var(--surface)", boxShadow: "var(--shadow-sm)" } },
              React.createElement("span", { style: { width: 8, height: 8, borderRadius: 9, background: "var(--accent)" } }),
              highlight.length, " changed")),
          React.createElement("div", { className: "canvas", style: { transform: "translate(40px, 30px) scale(0.74)" } },
            tables.map((t) => React.createElement(StaticNode, { key: t.id, t, dim: highlight.length && !highlight.includes(t.id) })))
        )
      )
    );
  }

  window.History = History;
})();
