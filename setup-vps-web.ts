
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

# Cache les dépendances Deno
RUN deno cache deploy.ts

# Port exposé par le serveur Deno
EXPOSE 8000

# Commande de lancement
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
      # Changement du port hôte vers 8080 pour éviter les conflits (ex: "8080:8000")
      - "8080:8000"
    environment:
      - API_KEY=\${API_KEY}
`;

try {
  console.log("Génération du Dockerfile...");
  Deno.writeTextFileSync("Dockerfile", dockerfileContent.trim());
  
  console.log("Génération du docker-compose.yml...");
  Deno.writeTextFileSync("docker-compose.yml", dockerComposeContent.trim());
  
  console.log("\n✅ Configuration mise à jour !");
  console.log("\nNote : Le port a été réglé sur 8080 pour éviter l'erreur 'port already allocated'.");
  console.log("\nProchaines étapes :");
  console.log("1. Relancez : docker compose up -d --build");
  console.log("2. Accédez à votre site sur http://votre-ip:8080");
  console.log("\nAstuce : Si vous voulez le port 80, modifiez '8080:8000' en '80:8000' dans docker-compose.yml");
  console.log("puis assurez-vous d'arrêter Nginx ou Apache sur votre VPS (systemctl stop nginx).");
} catch (error) {
  // @ts-ignore
  console.error("❌ Erreur :", error.message);
}
