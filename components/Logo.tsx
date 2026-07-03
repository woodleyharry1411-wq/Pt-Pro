import Image from "next/image";

// .logo-adaptive applies var(--logo-filter): inverted on dark theme, untouched on light

export function LogoIcon({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/logo-icon.png"
      alt="PT PRO"
      width={size}
      height={size}
      className="logo-adaptive"
      style={{ objectFit: "contain" }}
      priority
    />
  );
}

export function LogoFull({ height = 44 }: { height?: number }) {
  // logo-full.png is 1304×369, so width = height * 3.53
  const w = Math.round(height * 3.53);
  return (
    <Image
      src="/logo-full.png"
      alt="PT PRO"
      width={w}
      height={height}
      className="logo-adaptive"
      style={{ objectFit: "contain" }}
      priority
    />
  );
}
