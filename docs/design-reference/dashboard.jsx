/* Dashboard — team diagram library. window.Dashboard */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { Avatar, Btn } = window.UI;

  function Thumb({ colors }) {
    // deterministic mini-table layout
    const layout = [
      { x: 16, y: 20, w: 64, rows: 3 },
      { x: 104, y: 38, w: 70, rows: 4 },
      { x: 196, y: 16, w: 60, rows: 2 },
      { x: 60, y: 92, w: 66, rows: 3 },
    ];
    return React.createElement("div", { className: "card__thumb" },
      React.createElement("svg", { width: "100%", height: "100%", style: { position: "absolute", inset: 0 } },
        React.createElement("path", { d: "M80 40 C 130 40, 90 70, 137 70", fill: "none", stroke: "var(--line-2)", strokeWidth: 1.4 }),
        React.createElement("path", { d: "M174 56 C 210 56, 200 36, 226 36", fill: "none", stroke: "var(--line-2)", strokeWidth: 1.4 }),
        React.createElement("path", { d: "M93 108 C 60 108, 110 80, 104 70", fill: "none", stroke: "var(--line-2)", strokeWidth: 1.4 })
      ),
      layout.map((m, i) => React.createElement("div", {
        key: i, className: "mini", style: { left: m.x, top: m.y, width: m.w } },
        React.createElement("div", { className: "mini__strip", style: { background: colors[i % colors.length] } }),
        Array.from({ length: m.rows }).map((_, r) => React.createElement("div", { key: r, className: "mini__row" }))
      ))
    );
  }

  function Card({ d, users, onOpen }) {
    return React.createElement("div", { className: "card", onClick: onOpen },
      React.createElement(Thumb, { colors: d.colors }),
      React.createElement("div", { className: "card__body" },
        React.createElement("div", { className: "card__name" }, d.name),
        React.createElement("div", { className: "card__meta" },
          React.createElement("span", { className: "chip", style: { height: 18, padding: "0 7px", fontFamily: "var(--mono)", fontSize: 10.5 } }, d.db),
          React.createElement("span", null, d.tables, " tables")),
        React.createElement("div", { className: "card__foot" },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, color: "var(--ink-3)", fontSize: 11.5, whiteSpace: "nowrap" } },
            React.createElement(Icon, { name: "clock", size: 13 }), d.edited),
          d.live.length > 0
            ? React.createElement("div", { className: "card__live" },
                React.createElement("div", { className: "presence" }, d.live.map((id) => React.createElement(Avatar, { key: id, user: users[id], size: 22 }))),
                "live")
            : React.createElement("div", { className: "presence" }, React.createElement(Avatar, { user: users.you, size: 22 }))
        )
      )
    );
  }

  function Dashboard({ diagrams, users, onOpen }) {
    const [filter, setFilter] = useState("all");
    const shown = filter === "live" ? diagrams.filter((d) => d.live.length) : diagrams;

    return React.createElement("div", { className: "dash" },
      React.createElement("div", { className: "dash__bar" },
        React.createElement("div", { className: "brand" },
          React.createElement("div", { className: "brand__mark" }, React.createElement(Icon, { name: "table", size: 15 })),
          React.createElement("div", { className: "brand__name" }, "draw", React.createElement("b", null, "DB"), " Live")),
        React.createElement("div", { className: "search", style: { flex: 1, maxWidth: 380, margin: 0 } },
          React.createElement(Icon, { name: "search", size: 15 }),
          React.createElement("input", { placeholder: "Search diagrams, tables, people…" })),
        React.createElement("div", { className: "spacer" }),
        React.createElement(Btn, { variant: "ghost", iconOnly: true, icon: "bell", title: "Notifications" }),
        React.createElement(Btn, { variant: "ghost", iconOnly: true, icon: "settings", title: "Settings" }),
        React.createElement(Avatar, { user: users.you, size: 30, ring: true })
      ),

      React.createElement("div", { className: "dash__wrap" },
        React.createElement("div", { className: "dash__hero" },
          React.createElement("div", null,
            React.createElement("div", { className: "dash__h1" }, "Product Team workspace"),
            React.createElement("div", { className: "dash__sub" }, "5 diagrams · 5 members · 3 collaborating right now")),
          React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } },
            React.createElement("div", { className: "seg" },
              React.createElement("button", { className: filter === "all" ? "active" : "", onClick: () => setFilter("all") }, "All"),
              React.createElement("button", { className: filter === "live" ? "active" : "", onClick: () => setFilter("live") }, "Live now"),
              React.createElement("button", { onClick: () => setFilter("all") }, "Mine")),
            React.createElement(Btn, { variant: "primary", icon: "plus" }, "New diagram"))
        ),

        React.createElement("div", { className: "grid" },
          shown.map((d) => React.createElement(Card, { key: d.id, d, users, onOpen: () => onOpen(d.id) })),
          React.createElement("div", { className: "card card--new", onClick: () => onOpen("d1") },
            React.createElement("div", { style: { textAlign: "center" } },
              React.createElement(Icon, { name: "plus", size: 26 }),
              React.createElement("div", { style: { fontWeight: 700, marginTop: 8, fontSize: 14 } }, "New diagram"),
              React.createElement("div", { style: { fontSize: 12, color: "var(--ink-3)", marginTop: 2 } }, "Start blank or from SQL")))
        )
      )
    );
  }

  window.Dashboard = Dashboard;
})();
