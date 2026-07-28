const base = {
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.8-3.8" />
  </svg>
);

export const HeartIcon = ({ filled }) => (
  <svg {...base} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.5S3.5 15.6 3.5 9.8a4.8 4.8 0 0 1 8.5-3 4.8 4.8 0 0 1 8.5 3c0 5.8-8.5 10.7-8.5 10.7Z" />
  </svg>
);

export const BagIcon = () => (
  <svg {...base}>
    <path d="M6 8h12l1 12.5H5L6 8Z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
  </svg>
);

export const UserIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20c1.4-3.2 4.2-5 7.5-5s6.1 1.8 7.5 5" />
  </svg>
);

export const MenuIcon = () => (
  <svg {...base}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...base}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const ShieldIcon = () => (
  <svg {...base} width="14" height="14">
    <path d="M12 3 5 6v5c0 4.5 3 8.2 7 9.5 4-1.3 7-5 7-9.5V6l-7-3Z" />
    <path d="m9 12 2 2 4-4.5" />
  </svg>
);

export const WhatsAppIcon = () => (
  <svg {...base} width="16" height="16">
    <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3Z" />
    <path d="M9 9.5c.5 2.5 3 5 5.5 5.5l1-1.5-2-1-1 .5c-.8-.5-1.5-1.2-2-2l.5-1-1-2L9 9.5Z" />
  </svg>
);
