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

export const PinIcon = () => (
  <svg {...base}>
    <path d="M12 21s-6.5-5.5-6.5-10.4A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.6C18.5 15.5 12 21 12 21Z" />
    <circle cx="12" cy="10.4" r="2.3" />
  </svg>
);

export const CardIcon = () => (
  <svg {...base}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3 10h18M6.5 14.5h4" />
  </svg>
);

export const HomeIcon = () => (
  <svg {...base}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" />
  </svg>
);

export const GemIcon = () => (
  <svg {...base}>
    <path d="M7 4h10l4 5.5L12 21 3 9.5 7 4Z" />
    <path d="M3 9.5h18M9.5 4 12 9.5 14.5 4M12 21 9.5 9.5M12 21l2.5-11.5" />
  </svg>
);

export const MoonIcon = () => (
  <svg {...base}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

export const SunIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" />
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
