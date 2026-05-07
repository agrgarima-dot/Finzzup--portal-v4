import React from "react";

const Logo = ({ size = 32, darkText = false, showTagline = false, dark = false, collapsed = false }) => {
  const iconSize = size * 1.35;

  if (collapsed) {
    return (
      <div style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontWeight: 900,
        fontSize: size * 0.72,
        lineHeight: 1,
        letterSpacing: "-0.03em",
        color: dark ? "white" : "#111827"
      }}>
        Finz<span style={{ background: "linear-gradient(90deg,#2563EB,#7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>zup</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.35 }}>
      {/* Modern Icon */}
      <div style={{
        width: iconSize,
        height: iconSize,
        background: "linear-gradient(135deg, #2563EB, #7C3AED)",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: iconSize * 0.55,
        fontWeight: 900,
        boxShadow: "0 2px 8px rgba(37,99,235,0.3)"
      }}>
        F
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 900,
          fontSize: size * 0.72,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          display: "flex",
          alignItems: "baseline"
        }}>
          <span style={{ color: dark ? "white" : "#111827" }}>Finz</span>
          <span style={{ background: "linear-gradient(90deg,#2563EB,#7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>zup</span>
          <span style={{ fontSize: size * 0.35, color: dark ? "rgba(255,255,255,0.5)" : "#9CA3AF", marginLeft: 1 }}>™</span>
        </div>

        {showTagline && (
          <div style={{
            fontSize: Math.max(8, size * 0.22),
            fontWeight: 600,
            color: dark ? "rgba(255,255,255,0.4)" : "#9CA3AF",
            letterSpacing: "0.12em",
            textTransform: "uppercase"
          }}>
            Build · Value · Scale
          </div>
        )}
      </div>
    </div>
  );
};

export default Logo;
