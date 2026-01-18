import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Carioca",
    short_name: "Carioca",
    description: "Juego de Carioca online",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

