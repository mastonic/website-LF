#!/usr/bin/env bash
# Download OFL fonts required by the visual studio renderer.
# Run once before starting the dev server or running render tests:
#   bash scripts/download-fonts.sh

set -euo pipefail

FONT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/fonts"
mkdir -p "$FONT_DIR"

declare -A FONTS=(
  ["Inter-Regular.ttf"]="https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.ttf"
  ["Inter-Bold.ttf"]="https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.ttf"
  ["Montserrat-Regular.ttf"]="https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-Regular.ttf"
  ["Montserrat-Bold.ttf"]="https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-Bold.ttf"
  ["Playfair_Display-Regular.ttf"]="https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Regular.ttf"
  ["Playfair_Display-Bold.ttf"]="https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf"
  ["Raleway-Regular.ttf"]="https://github.com/google/fonts/raw/main/ofl/raleway/static/Raleway-Regular.ttf"
  ["Raleway-Bold.ttf"]="https://github.com/google/fonts/raw/main/ofl/raleway/static/Raleway-Bold.ttf"
  ["Lato-Regular.ttf"]="https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf"
  ["Lato-Bold.ttf"]="https://github.com/google/fonts/raw/main/ofl/lato/Lato-Bold.ttf"
  ["Nunito-Regular.ttf"]="https://github.com/google/fonts/raw/main/ofl/nunito/static/Nunito-Regular.ttf"
  ["Nunito-Bold.ttf"]="https://github.com/google/fonts/raw/main/ofl/nunito/static/Nunito-Bold.ttf"
  ["SourceSans3-Regular.ttf"]="https://github.com/google/fonts/raw/main/ofl/sourcesans3/static/SourceSans3-Regular.ttf"
  ["SourceSans3-Bold.ttf"]="https://github.com/google/fonts/raw/main/ofl/sourcesans3/static/SourceSans3-Bold.ttf"
  ["Roboto-Regular.ttf"]="https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Regular.ttf"
  ["Roboto-Bold.ttf"]="https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf"
)

echo "Téléchargement des polices dans $FONT_DIR ..."

for filename in "${!FONTS[@]}"; do
  dest="$FONT_DIR/$filename"
  if [[ -f "$dest" ]]; then
    echo "  ✓ $filename (déjà présent)"
    continue
  fi
  echo "  ↓ $filename"
  if ! curl -fsSL --retry 3 "${FONTS[$filename]}" -o "$dest"; then
    echo "  ✗ Échec : $filename — vérifiez l'URL ou téléchargez manuellement."
    rm -f "$dest"
  fi
done

echo ""
echo "Polices disponibles dans public/fonts/ :"
ls "$FONT_DIR"/*.ttf 2>/dev/null | xargs -I{} basename {} || echo "Aucune police trouvée."
echo ""
echo "Terminé. Vous pouvez maintenant lancer les tests de rendu."
