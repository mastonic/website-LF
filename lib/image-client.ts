/**
 * Réduit une photo avant l'envoi (téléphone : 3 à 8 Mo) : 1600 px max, JPEG.
 * Évite la limite de taille des requêtes et accélère l'envoi en 4G.
 * Si le navigateur ne sait pas la lire, on envoie le fichier tel quel.
 */
export async function reduirePhoto(file: File, maxEdge = 1600, quality = 0.82): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality))
    if (!blob) return file
    const nom = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return new File([blob], `${nom}.jpg`, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
