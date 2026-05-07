import React from "react";

const I = ({ n, s = 14, c = "currentColor" }) => {
  const p = { strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", stroke: c, fill: "none" };

  const paths = {
    home:       <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" {...p}/><polyline points="9 22 9 12 15 12 15 22" {...p}/></>,
    dashboard:  <><rect x="3" y="3" width="7" height="7" {...p}/><rect x="14" y="3" width="7" height="7" {...p}/><rect x="14" y="14" width="7" height="7" {...p}/><rect x="3" y="14" width="7" height="7" {...p}/></>,
    cashflow:   <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" {...p}/></>,
    treasury:   <><rect x="2" y="5" width="20" height="14" rx="2" {...p}/><line x1="2" y1="10" x2="22" y2="10" {...p}/></>,
    actions:    <><polyline points="9 11 12 14 22 4" {...p}/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" {...p}/></>,
    report:     <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...p}/><polyline points="14 2 14 8 20 8" {...p}/></>,
    tax:        <><path d="M12 2L2 7l10 5 10-5-10-5z" {...p}/><path d="M2 17l10 5 10-5" {...p}/></>,
    compliance: <><rect x="3" y="4" width="18" height="18" rx="2" {...p}/><line x1="16" y1="2" x2="16" y2="6" {...p}/><line x1="8" y1="2" x2="8" y2="6" {...p}/></>,
    audit:      <><path d="M9 11l3 3L22 4" {...p}/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" {...p}/></>,
    market:     <><circle cx="12" cy="12" r="10" {...p}/><line x1="2" y1="12" x2="22" y2="12" {...p}/></>,
    calendar:   <><rect x="3" y="4" width="18" height="18" rx="2" {...p}/><line x1="16" y1="2" x2="16" y2="6" {...p}/><line x1="8" y1="2" x2="8" y2="6" {...p}/></>,
    request:    <><circle cx="12" cy="12" r="10" {...p}/><line x1="12" y1="8" x2="12" y2="16" {...p}/></>,
    logout:     <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" {...p}/><polyline points="16 17 21 12 16 7" {...p}/></>,
    bell:       <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" {...p}/><path d="M13.73 21a2 2 0 01-3.46 0" {...p}/></>,
  };

  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}>
      {paths[n] || paths.home}
    </svg>
  );
};

export default I;
