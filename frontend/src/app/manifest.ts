import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tenly",
    short_name: "Tenly",
    description: "Report repairs and stay updated with Tenly.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f4ef",
    theme_color: "#22603f",
    icons: [
      { src: "/icons/tenly-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/tenly-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
