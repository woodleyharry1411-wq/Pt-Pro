import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PT Pro",
    short_name: "PT Pro",
    description: "Plan. Train. Progress.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0C14",
    theme_color: "#0A0C14",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
