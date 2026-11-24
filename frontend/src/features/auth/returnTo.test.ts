import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumeDestination,
  destinationFromLocation,
  readDestination,
  rememberDestination,
  safeDestination,
  signInPathFor,
} from './returnTo'

describe('auth destination preservation', () => {
  beforeEach(() => sessionStorage.clear())

  it('keeps a same-origin destination and the selected event and quantity', () => {
    const location = {
      pathname: '/account',
      search: '?tab=tickets',
      hash: '#upcoming',
      state: { ticketSelection: { eventId: 'evt_42', quantity: 3 } },
    }
    const destination = destinationFromLocation(location)
    expect(destination).toBe('/account?tab=tickets&eventId=evt_42&quantity=3#upcoming')
    expect(signInPathFor(location)).toBe(
      '/sign-in?return_to=%2Faccount%3Ftab%3Dtickets%26eventId%3Devt_42%26quantity%3D3%23upcoming',
    )
  })

  it('persists and consumes the destination within the current tab', () => {
    rememberDestination('/account?eventId=evt_42&quantity=3')
    expect(readDestination()).toBe('/account?eventId=evt_42&quantity=3')
    expect(consumeDestination()).toBe('/account?eventId=evt_42&quantity=3')
    expect(readDestination()).toBe('/account')
  })

  it('rejects external redirects, protocol-relative URLs, backslashes and auth loops', () => {
    for (const destination of [
      'https://evil.example/path',
      '//evil.example/path',
      '/\\evil.example/path',
      '/sign-in?return_to=/account',
      '/auth/complete',
    ]) {
      expect(safeDestination(destination)).toBe('/account')
    }
  })
})
