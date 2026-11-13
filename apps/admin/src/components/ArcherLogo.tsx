export function ArcherLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Silver Chrome Outer Shield Gradient */}
        <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C0C7D0" />
          <stop offset="25%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#7E8794" />
          <stop offset="75%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#4A5568" />
        </linearGradient>

        {/* Silver Rings Gradient */}
        <linearGradient id="orbitRings" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#A0AEC0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.85" />
        </linearGradient>

        {/* Archer Flame Goddess Gold/Amber Gradient */}
        <linearGradient id="archerGold" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FF9F43" />
          <stop offset="35%" stopColor="#FF7A00" />
          <stop offset="70%" stopColor="#E86100" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      {/* Orbit Silver Rings behind & through shield */}
      <ellipse
        cx="50"
        cy="45"
        rx="46"
        ry="22"
        stroke="url(#orbitRings)"
        strokeWidth="3.2"
        transform="rotate(-20 50 45)"
      />
      <ellipse
        cx="50"
        cy="45"
        rx="46"
        ry="22"
        stroke="url(#orbitRings)"
        strokeWidth="2.8"
        transform="rotate(22 50 45)"
      />

      {/* Outer Shield with Chrome Bevel */}
      <path
        d="M50 4 L86 16 V52 C86 76 50 96 50 96 C50 96 14 76 14 52 V16 L50 4 Z"
        fill="#080A0E"
        stroke="url(#shieldBorder)"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Inner Shield Inset */}
      <path
        d="M50 11 L79 21 V49 C79 69 50 87 50 87 C50 87 21 69 21 49 V21 L50 11 Z"
        fill="#0D1117"
        stroke="url(#shieldBorder)"
        strokeWidth="1.2"
        opacity="0.65"
      />

      {/* Archer Emblem: Stylized Hunter with Bow & Arrow */}
      {/* Bow */}
      <path
        d="M34 23 C30 35 30 55 42 66"
        stroke="url(#archerGold)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Bow String */}
      <path d="M34 23 L42 66" stroke="#FFB020" strokeWidth="1" opacity="0.6" />

      {/* Arrow / Lightning Bolt */}
      <path
        d="M26 69 L33 63 L36 67 L57 38"
        stroke="url(#archerGold)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dynamic Golden Silhouette */}
      {/* Head & Hair */}
      <circle cx="53" cy="22" r="5" fill="url(#archerGold)" />
      <path
        d="M49 20 C44 21 41 27 43 32 C46 30 47 26 49 25"
        fill="url(#archerGold)"
      />
      {/* Torso & Aiming Arm */}
      <path
        d="M51 27 C53 30 56 32 58 36 C54 44 47 48 44 54 C40 45 44 38 48 30 Z"
        fill="url(#archerGold)"
      />
      <path
        d="M54 26 L64 21 L65 24 L56 30 Z"
        fill="url(#archerGold)"
      />
      {/* Forward Stepping Stance Legs */}
      <path
        d="M47 48 L35 73 L38 75 L52 53 Z"
        fill="url(#archerGold)"
      />
      <path
        d="M51 47 L63 36 L66 38 L54 53 Z"
        fill="url(#archerGold)"
      />
    </svg>
  );
}
