import { describe, expect, it, vi } from 'vitest'
import { authenticatedRequest } from './api'

describe('authenticated backend requests', () => {
  it('reads the current Clerk session token for each request', async () => {
    const getToken = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    const fetcher = vi.fn().mockResolvedValue({ ok: true })
    const options = { getToken, fetcher, baseUrl: 'https://api.eventnest.test', method: 'POST' }

    await authenticatedRequest('/account', options)
    await authenticatedRequest('/account', options)

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[0][0]).toBe('https://api.eventnest.test/account')
    expect(fetcher.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer first')
    expect(fetcher.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer second')
  })

  it('does not fetch without an active session token', async () => {
    const fetcher = vi.fn()
    await expect(
      authenticatedRequest('/account', {
        getToken: vi.fn().mockResolvedValue(null),
        fetcher,
        baseUrl: 'https://api.eventnest.test',
      }),
    ).rejects.toThrow('active Clerk session')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects slash-backslash origin confusion before reading or sending a token', async () => {
    const getToken = vi.fn().mockResolvedValue('secret-token')
    const fetcher = vi.fn()
    await expect(
      authenticatedRequest('/\\evil.example/path', {
        getToken,
        fetcher,
        baseUrl: 'https://api.eventnest.test',
      }),
    ).rejects.toThrow('relative path')
    expect(getToken).not.toHaveBeenCalled()
    expect(fetcher).not.toHaveBeenCalled()
  })
})
