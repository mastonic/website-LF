import { describe, it, expect } from 'vitest'
import { sanitizeSvg, svgIsDangerous } from '@/lib/svg-sanitizer'

const CLEAN_SVG = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#abc"/></svg>'

describe('sanitizeSvg', () => {
  it('passes a clean SVG', () => {
    const r = sanitizeSvg(CLEAN_SVG)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.svg).toContain('<svg')
  })

  it('removes <script> blocks', () => {
    const input = `<svg><script>alert(1)</script><rect/></svg>`
    const r = sanitizeSvg(input)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.svg).not.toContain('<script')
  })

  it('removes on* event handlers', () => {
    const input = `<svg><rect onclick="evil()" width="10"/></svg>`
    const r = sanitizeSvg(input)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.svg).not.toContain('onclick')
  })

  it('removes javascript: hrefs', () => {
    const input = `<svg><a href="javascript:alert(1)"><text>click</text></a></svg>`
    const r = sanitizeSvg(input)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.svg).not.toContain('javascript:')
  })

  it('removes <foreignObject>', () => {
    const input = `<svg><foreignObject><div>html</div></foreignObject></svg>`
    const r = sanitizeSvg(input)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.svg).not.toContain('foreignObject')
  })

  it('removes <!DOCTYPE> and <!ENTITY>', () => {
    const input = `<!DOCTYPE foo [<!ENTITY bar "baz">]><svg><rect/></svg>`
    const r = sanitizeSvg(input)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.svg).not.toContain('DOCTYPE')
      expect(r.svg).not.toContain('ENTITY')
    }
  })

  it('rejects non-SVG content', () => {
    const r = sanitizeSvg('<html><body>not svg</body></html>')
    expect(r.ok).toBe(false)
  })
})

describe('svgIsDangerous', () => {
  it('clean SVG is not dangerous', () => expect(svgIsDangerous(CLEAN_SVG)).toBe(false))
  it('detects script tags', () => expect(svgIsDangerous('<svg><script>x</script></svg>')).toBe(true))
  it('detects on* attributes', () => expect(svgIsDangerous('<svg><rect onload="x()"/></svg>')).toBe(true))
  it('detects javascript: URIs', () => expect(svgIsDangerous('<svg><a href="javascript:x">x</a></svg>')).toBe(true))
  it('detects foreignObject', () => expect(svgIsDangerous('<svg><foreignObject/></svg>')).toBe(true))
})
