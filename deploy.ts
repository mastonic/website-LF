
/**
 * LF PARFAIT - Script de déploiement
 * Ce script utilise Deno pour servir les fichiers statiques de l'application.
 */

import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

console.log("Démarrage du serveur de déploiement sur http://localhost:8000");

// @ts-ignore - Deno is a global available in the Deno runtime
Deno.serve((req) => {
  return serveDir(req, {
    fsRoot: ".",
    showIndex: true,
    quiet: false,
  });
});
