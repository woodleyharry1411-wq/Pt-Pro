import Image from "next/image";

// Inverts dark logo for use on dark backgrounds: dark→white, blue stays blue
const darkModeFilter = "invert(1) hue-rotate(190deg)";

export function LogoIcon({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/logo-icon.png"
      alt="PT PRO"
      width={size}
      height={size}
      style={{ objectFit: "contain", filter: darkModeFilter }}
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
      style={{ objectFit: "contain", filter: darkModeFilter }}
      priority
    />
  );
}
