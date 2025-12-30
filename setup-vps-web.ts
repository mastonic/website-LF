
/**
 * LF PARFAIT - VPS Setup Script
 * Ce script génère les fichiers Docker nécessaires pour déployer l'application.
 * Utilisation : deno run --allow-write setup-vps-web.ts
 */

// Fix: Add Deno declaration for TypeScript environments not configured for Deno
declare const Deno: any;

const dockerfileContent = `
FROM denoland/deno:alpine-1.44.4

# Dossier de travail
WORKDIR /app

# Copie des fichiers de l'application
COPY . .

# Cache les dépendances Deno (si nécessaire)
RUN deno cache deploy.ts

# Port exposé par le serveur Deno (deploy.ts utilise le port 8000 par défaut)
EXPOSE 8000

# Commande de lancement avec les permissions minimales
CMD ["run", "--allow-net", "--allow-read", "deploy.ts"]
`;

const dockerComposeContent = `
version: '3.8'

services:
  lf-parfait-web:
    build: .
    container_name: lf_parfait_container
    restart: always
    ports:
      - "80:8000"
    environment:
      # L'API_KEY doit être définie sur votre VPS ou via un fichier .env
      - API_KEY=\${API_KEY}
`;

try {
  console.log("Génération du Dockerfile...");
  // Fix: Use Deno global to write files
  Deno.writeTextFileSync("Dockerfile", dockerfileContent.trim());
  
  console.log("Génération du docker-compose.yml...");
  // Fix: Use Deno global to write files
  Deno.writeTextFileSync("docker-compose.yml", dockerComposeContent.trim());
  
  console.log("\n✅ Configuration terminée avec succès !");
  console.log("\nInstructions pour le VPS :");
  console.log("1. Transférez tous les fichiers sur votre serveur.");
  console.log("2. Créez un fichier .env avec votre clef : API_KEY=votre_clef_ici");
  console.log("3. Lancez la commande : docker compose up -d --build");
} catch (error) {
  // @ts-ignore
  console.error("❌ Erreur lors de la génération des fichiers :", error.message);
}
