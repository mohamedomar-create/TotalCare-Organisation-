import { describe, expect, it } from 'vitest'
import { newInviteCode, whatsappNumber } from './invites'

describe('invitations', () => {
  it('makes readable, unique codes', () => {
    const codes = new Set(Array.from({ length: 500 }, newInviteCode))
    expect(codes.size).toBe(500)
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{10}$/)
  })
  it('turns Egyptian numbers into WhatsApp numbers', () => {
    expect(whatsappNumber('010 1234 5678')).toBe('201012345678')
    expect(whatsappNumber('+20 101 234 5678')).toBe('201012345678')
    expect(whatsappNumber('00201012345678')).toBe('201012345678')
    expect(whatsappNumber('')).toBe('')
  })
})
