/* Shared UI atoms — window.UI */
(function () {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;

  function Avatar({ user, size = 28, ring = false, title }) {
    const style = { "--sz": size + "px", background: user.color };
    if (ring) { style["--_c"] = user.color; }
    return React.createElement("div", {
      className: "avatar" + (ring ? " avatar--ring" : ""),
      style, title: title || user.name, "data-uid": user.id,
    }, user.short);
  }

  function Btn({ icon, children, variant, sm, iconOnly, ...rest }) {
    let cls = "btn";
    if (variant === "primary") cls += " btn--primary";
    if (variant === "ghost") cls += " btn--ghost";
    if (sm) cls += " btn--sm";
    if (iconOnly) cls += " btn--icon";
    return React.createElement("button", { className: cls, ...rest },
      icon && React.createElement(Icon, { name: icon, size: sm ? 15 : 16 }),
      children
    );
  }

  // dropdown / popover anchored
  function Pop({ open, onClose, children, style, className = "" }) {
    const ref = useRef(null);
    useEffect(() => {
      if (!open) return;
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
      const k = (e) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("mousedown", h);
      document.addEventListener("keydown", k);
      return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
    }, [open]);
    if (!open) return null;
    return React.createElement("div", {
      ref, className: "pop " + className,
      style: { position: "absolute", background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "11px", boxShadow: "var(--shadow-pop)", zIndex: 120, padding: "6px", ...style },
    }, children);
  }

  function Modal({ title, onClose, children, foot, width }) {
    useEffect(() => {
      const k = (e) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", k);
      return () => document.removeEventListener("keydown", k);
    }, []);
    return React.createElement("div", { className: "scrim", onMouseDown: onClose },
      React.createElement("div", { className: "modal pop", style: width ? { width } : null, onMouseDown: (e) => e.stopPropagation() },
        React.createElement("div", { className: "modal__head" },
          React.createElement("div", { className: "modal__title" }, title),
          React.createElement(Btn, { iconOnly: true, sm: true, variant: "ghost", icon: "x", onClick: onClose })
        ),
        React.createElement("div", { className: "modal__body" }, children),
        foot && React.createElement("div", { className: "modal__foot" }, foot)
      )
    );
  }

  window.UI = { Avatar, Btn, Pop, Modal };
})();
