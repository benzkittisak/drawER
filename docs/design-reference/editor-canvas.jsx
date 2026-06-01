/* Editor canvas: tables, relationships, live cursors, comment pins, dock, zoom.
   window.Canvas */
(function () {
  const { useState, useRef, useEffect, useMemo, useCallback } = React;
  const Icon = window.Icon;
  const { Avatar, Btn } = window.UI;

  const NODE_W = 234, STRIP = 7, HEAD = 38, FIELD = 33;
  const fieldCenterY = (table, idx) => table.y + STRIP + HEAD + idx * FIELD + FIELD / 2;
  const fieldIndex = (table, fid) => table.fields.findIndex((f) => f.id === fid);
  const nodeHeight = (t) => STRIP + HEAD + t.fields.length * FIELD;

  /* ---------- relationship paths ---------- */
  function relPath(rel, byId) {
    const a = byId[rel.from[0]], b = byId[rel.to[0]];
    if (!a || !b) return null;
    const ai = fieldIndex(a, rel.from[1]), bi = fieldIndex(b, rel.to[1]);
    if (ai < 0 || bi < 0) return null;
    const ay = fieldCenterY(a, ai), by = fieldCenterY(b, bi);
    const aCenter = a.x + NODE_W / 2, bCenter = b.x + NODE_W / 2;
    const aRight = aCenter < bCenter;
    const sx = aRight ? a.x + NODE_W : a.x;
    const tx = aRight ? b.x : b.x + NODE_W;
    const dx = Math.max(46, Math.abs(tx - sx) / 2);
    const c1 = sx + (aRight ? dx : -dx);
    const c2 = tx + (aRight ? -dx : dx);
    const mx = (sx + tx) / 2, my = (ay + by) / 2;
    return { d: `M ${sx} ${ay} C ${c1} ${ay} ${c2} ${by} ${tx} ${by}`, sx, sy: ay, tx, ty: by, mx, my };
  }

  /* ---------- live cursors (self-animating) ---------- */
  function CursorsLayer({ liveUsers, users, byId, motion }) {
    const [pos, setPos] = useState({});
    const stateRef = useRef({});

    useEffect(() => {
      // build a looping waypoint path per user, anchored around the table they're viewing
      const paths = {};
      liveUsers.forEach((lu, k) => {
        const t = byId[lu.viewing];
        const cx = t ? t.x + NODE_W / 2 : 400 + k * 120;
        const cy = t ? t.y + 60 : 240;
        const r = 90 + k * 26;
        paths[lu.id] = { cx, cy, r, phase: k * 2.1, speed: 0.22 + k * 0.05 };
      });
      stateRef.current = paths;

      // seed positions synchronously so cursors paint on first render (not rAF-dependent)
      const seed = {};
      Object.entries(paths).forEach(([id, p]) => {
        seed[id] = { x: p.cx + Math.cos(p.phase) * p.r, y: p.cy + Math.sin(p.phase * 0.9) * (p.r * 0.55) };
      });
      setPos(seed);

      let raf, t0 = performance.now();
      const tick = (now) => {
        const el = (now - t0) / 1000;
        const next = {};
        Object.entries(stateRef.current).forEach(([id, p]) => {
          const ang = p.phase + el * p.speed;
          // lissajous-ish wander so it feels human, not a perfect circle
          next[id] = {
            x: p.cx + Math.cos(ang) * p.r + Math.sin(ang * 1.7) * 22,
            y: p.cy + Math.sin(ang * 0.9) * (p.r * 0.55) + Math.cos(ang * 2.3) * 16,
          };
        });
        setPos(next);
        raf = requestAnimationFrame(tick);
      };
      if (motion) raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [liveUsers, byId, motion]);

    return liveUsers.map((lu) => {
      const u = users[lu.id]; const p = pos[lu.id];
      if (!p) return null;
      return React.createElement("div", {
        key: lu.id, className: "cursor",
        style: { transform: `translate(${p.x}px, ${p.y}px)` },
      },
        React.createElement("svg", { width: 22, height: 22, viewBox: "0 0 24 24", fill: u.color,
          style: { filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))" } },
          React.createElement("path", { d: "M5 3l15 8-6 1.5L11 19 5 3Z", stroke: "#fff", strokeWidth: 1.4 })),
        React.createElement("div", { className: "cursor__label", style: { background: u.color } },
          u.name.split(" ")[0])
      );
    });
  }

  /* ---------- table node ---------- */
  function Node({ table, selected, lockedBy, users, onSelect, onDragStart, onGrip }) {
    return React.createElement("div", {
      className: "node" + (selected ? " sel" : "") + (lockedBy ? " locked" : ""),
      style: { left: table.x, top: table.y, width: NODE_W,
        ...(lockedBy ? { "--lockc": users[lockedBy].color } : {}) },
      onMouseDown: (e) => { e.stopPropagation(); onSelect(table.id); },
    },
      lockedBy && React.createElement("div", { className: "node__badge-lock",
        style: { background: users[lockedBy].color } },
        React.createElement(Icon, { name: "lock", size: 11 }),
        users[lockedBy].name.split(" ")[0], " editing"),
      React.createElement("div", { className: "node__strip", style: { background: table.color } }),
      React.createElement("div", {
        className: "node__head",
        onMouseDown: (e) => { if (lockedBy) return; e.stopPropagation(); onSelect(table.id); onDragStart(e, table.id); },
      },
        React.createElement(Icon, { name: "table", size: 15, className: "node__icon" }),
        React.createElement("div", { className: "node__name" }, table.name),
        React.createElement("div", { className: "node__tools" },
          React.createElement(Btn, { iconOnly: true, sm: true, variant: "ghost", icon: "edit", title: "Edit" }),
          React.createElement(Btn, { iconOnly: true, sm: true, variant: "ghost", icon: "more", title: "More" })
        )
      ),
      table.fields.map((f, i) => React.createElement("div", { key: f.id, className: "node__field" },
        React.createElement("div", {
          className: "node__grip" + (f.fk ? " fk" : ""),
          title: "Drag to link",
          onMouseDown: (e) => { e.stopPropagation(); onGrip && onGrip(e, table.id, f.id); },
        }),
        f.pk && React.createElement(Icon, { name: "key", size: 13, className: "node__key" }),
        React.createElement("div", { className: "node__fname" + (f.pk ? " pk" : "") }, f.name),
        React.createElement("div", { className: "node__ftype" },
          f.type, !f.notNull && !f.pk ? "?" : "")
      ))
    );
  }

  /* ---------- main canvas ---------- */
  function Canvas(props) {
    const {
      tables, setTables, rels, users, locks, liveUsers, comments,
      selected, setSelected, tool, setTool, motion, grid = true, pins = true,
      onOpenComment, view, setView,
    } = props;

    const wrapRef = useRef(null);
    const [cam, setCam] = useState({ x: 60, y: 30, z: 0.92 });
    const drag = useRef(null);
    const [hotRel, setHotRel] = useState(null);
    const [linking, setLinking] = useState(null); // {fromT, fromF, x, y}

    const byId = useMemo(() => Object.fromEntries(tables.map((t) => [t.id, t])), [tables]);

    const toCanvas = useCallback((clientX, clientY) => {
      const r = wrapRef.current.getBoundingClientRect();
      return { x: (clientX - r.left - cam.x) / cam.z, y: (clientY - r.top - cam.y) / cam.z };
    }, [cam]);

    // ---- dragging tables / panning ----
    const onNodeDragStart = (e, id) => {
      const t = byId[id];
      drag.current = { mode: "node", id, sx: e.clientX, sy: e.clientY, ox: t.x, oy: t.y };
    };
    const onBgDown = (e) => {
      if (tool === "comment") {
        const p = toCanvas(e.clientX, e.clientY);
        onOpenComment({ x: Math.round(p.x), y: Math.round(p.y), isNew: true });
        setTool("select");
        return;
      }
      setSelected(null);
      drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, ox: cam.x, oy: cam.y };
    };
    const onGrip = (e, tId, fId) => {
      const p = toCanvas(e.clientX, e.clientY);
      drag.current = { mode: "link", fromT: tId, fromF: fId };
      setLinking({ fromT: tId, fromF: fId, x: p.x, y: p.y });
    };

    useEffect(() => {
      const move = (e) => {
        const d = drag.current; if (!d) return;
        if (d.mode === "node") {
          const dx = (e.clientX - d.sx) / cam.z, dy = (e.clientY - d.sy) / cam.z;
          setTables((prev) => prev.map((t) => t.id === d.id ? { ...t, x: d.ox + dx, y: d.oy + dy } : t));
        } else if (d.mode === "pan") {
          setCam((c) => ({ ...c, x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) }));
        } else if (d.mode === "link") {
          const p = toCanvas(e.clientX, e.clientY);
          setLinking((l) => l ? { ...l, x: p.x, y: p.y } : l);
        }
      };
      const up = () => { drag.current = null; setLinking(null); };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    }, [cam.z, setTables, toCanvas]);

    // ---- wheel: pan, ctrl+wheel zoom ----
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const r = wrapRef.current.getBoundingClientRect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        setCam((c) => {
          const nz = Math.min(2, Math.max(0.3, c.z * (1 - e.deltaY * 0.0016)));
          const k = nz / c.z;
          return { z: nz, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k };
        });
      } else {
        setCam((c) => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
      }
    };

    const zoomBy = (f) => setCam((c) => {
      const r = wrapRef.current.getBoundingClientRect();
      const mx = r.width / 2, my = r.height / 2;
      const nz = Math.min(2, Math.max(0.3, c.z * f));
      const k = nz / c.z;
      return { z: nz, x: mx - (mx - c.x) * k, y: my - (my - c.y) * k };
    });
    const fitView = () => setCam({ x: 60, y: 30, z: 0.92 });

    // svg bounds
    const SVGW = 2600, SVGH = 1600;

    return React.createElement("div", { className: "canvas-wrap", ref: wrapRef, onWheel,
      style: { cursor: tool === "comment" ? "crosshair" : (drag.current?.mode === "pan" ? "grabbing" : "default") } },
      grid && React.createElement("div", { className: "canvas-grid" }),
      // background catcher for pan
      React.createElement("div", { style: { position: "absolute", inset: 0 }, onMouseDown: onBgDown }),

      React.createElement("div", { className: "canvas",
        style: { transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})` } },

        // relationships svg
        React.createElement("svg", { className: "canvas-layer", width: SVGW, height: SVGH,
          style: { pointerEvents: "none" } },
          rels.map((r) => {
            const g = relPath(r, byId); if (!g) return null;
            const hot = hotRel === r.id;
            return React.createElement("g", { key: r.id, style: { pointerEvents: "stroke" },
              onMouseEnter: () => setHotRel(r.id), onMouseLeave: () => setHotRel(null) },
              React.createElement("path", { d: g.d, className: "rel-path" + (hot ? " hot" : "") }),
              React.createElement("circle", { cx: g.sx, cy: g.sy, r: 3.4, className: "rel-dot" }),
              React.createElement("circle", { cx: g.tx, cy: g.ty, r: 3.4, className: "rel-dot" }),
              React.createElement("rect", { x: g.mx - 15, y: g.my - 9, width: 30, height: 16, rx: 5,
                fill: "var(--surface)", stroke: "var(--line)" }),
              React.createElement("text", { x: g.mx, y: g.my + 3, textAnchor: "middle", className: "rel-card" }, r.card)
            );
          }),
          // live linking line
          linking && (() => {
            const a = byId[linking.fromT]; const ai = fieldIndex(a, linking.fromF);
            const sx = a.x + NODE_W, sy = fieldCenterY(a, ai);
            return React.createElement("path", { d: `M ${sx} ${sy} C ${sx + 60} ${sy} ${linking.x - 60} ${linking.y} ${linking.x} ${linking.y}`,
              fill: "none", stroke: "var(--accent)", strokeWidth: 2, strokeDasharray: "5 4" });
          })()
        ),

        // tables
        tables.map((t) => React.createElement(Node, {
          key: t.id, table: t, users,
          selected: selected === t.id,
          lockedBy: locks[t.id],
          onSelect: setSelected, onDragStart: onNodeDragStart, onGrip,
        })),

        // comment pins
        pins && comments.map((c, i) => React.createElement("div", {
          key: c.id, className: "pin" + (c.resolved ? " resolved" : ""),
          style: { left: c.x, top: c.y },
          onMouseDown: (e) => { e.stopPropagation(); onOpenComment(c); },
        },
          React.createElement("div", { className: "pin__bubble" },
            c.resolved ? React.createElement(Icon, { name: "check", size: 14 }) : (i + 1))
        )),

        // live cursors
        React.createElement(CursorsLayer, { liveUsers, users, byId, motion })
      ),

      // top-left hint
      React.createElement("div", { className: "canvas-hint" },
        React.createElement("span", { className: "chip" },
          React.createElement(Icon, { name: "users", size: 13 }),
          liveUsers.length + 1, " here now")
      ),

      // floating dock
      React.createElement("div", { className: "dock" },
        [["cursor", "select", "Select / move  V"], ["hand", "pan", "Pan  H"]].map(([ic, id, tip]) =>
          React.createElement("button", { key: id, className: "tool" + (tool === id ? " active" : ""),
            "data-tip": tip, onClick: () => setTool(id), title: tip },
            React.createElement(Icon, { name: ic, size: 18 }))),
        React.createElement("div", { className: "dock__sep" }),
        [["table", "table", "Add table  T"], ["link", "rel", "Add relationship  R"], ["comment", "comment", "Comment  C"], ["sql", "note", "Add note"]].map(([ic, id, tip]) =>
          React.createElement("button", { key: id, className: "tool" + (tool === id ? " active" : ""),
            "data-tip": tip, onClick: () => setTool(id === "table" ? "select" : id), title: tip },
            React.createElement(Icon, { name: ic, size: 18 }))),
        React.createElement("div", { className: "dock__sep" }),
        React.createElement("button", { className: "tool", "data-tip": "Generate with AI", title: "AI",
          style: { color: "var(--accent-strong)" } },
          React.createElement(Icon, { name: "sparkle", size: 18 }))
      ),

      // zoom pill
      React.createElement("div", { className: "zoom" },
        React.createElement(Btn, { iconOnly: true, sm: true, variant: "ghost", icon: "minus", onClick: () => zoomBy(0.85) }),
        React.createElement("div", { className: "zoom__val" }, Math.round(cam.z * 100) + "%"),
        React.createElement(Btn, { iconOnly: true, sm: true, variant: "ghost", icon: "plus", onClick: () => zoomBy(1.15) }),
        React.createElement("div", { className: "dock__sep" }),
        React.createElement(Btn, { iconOnly: true, sm: true, variant: "ghost", icon: "fit", title: "Fit", onClick: fitView })
      )
    );
  }

  window.Canvas = Canvas;
})();
