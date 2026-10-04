function hexToLinear(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').padEnd(6, '0')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const linearize = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  return [linearize(r), linearize(g), linearize(b)]
}

function luminance(hex: string): number {
  const [r, g, b] = hexToLinear(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1)
  const l2 = luminance(hex2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

export function textColorOnBg(bgHex: string): { color: string; meetsAA: boolean } {
  const onWhite = contrastRatio(bgHex, '#ffffff')
  const onDark = contrastRatio(bgHex, '#1a1a1a')
  const color = onWhite >= onDark ? '#ffffff' : '#1a1a1a'
  const ratio = Math.max(onWhite, onDark)
  return { color, meetsAA: ratio >= 4.5 }
}
