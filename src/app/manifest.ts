import type { MetadataRoute } from "next";

// Permite instalar la web en el móvil como una app («Añadir a pantalla de inicio»).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Camis24h · Gestión",
    short_name: "C24H Gestión",
    description: "Inventario, presupuestos y pedidos de Camis24h",
    start_url: "/",
    display: "standalone",
    background_color: "#F3EEE3",
    theme_color: "#C1502E",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
