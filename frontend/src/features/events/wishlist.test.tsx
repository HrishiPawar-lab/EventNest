import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { WishlistButton } from './EventCard'
import { useWishlist } from './wishlist'

const clerkState = vi.hoisted(() => ({ id: 'user-one' }))

vi.mock('@clerk/react', () => ({
  useUser: () => ({ user: { id: clerkState.id } }),
  useAuth: () => ({ isSignedIn: true }),
}))

function WishlistControl() {
  const { ids, toggle } = useWishlist()
  return (
    <div>
      <p>{ids.join(', ') || 'Nothing saved'}</p>
      <button type="button" onClick={() => toggle('afterglow-live')}>
        Toggle event
      </button>
    </div>
  )
}

describe('preview wishlist', () => {
  beforeEach(() => {
    localStorage.clear()
    clerkState.id = 'user-one'
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('keeps sample selections separate for each signed-in account', async () => {
    const user = userEvent.setup()
    const view = render(<WishlistControl />)
    await user.click(screen.getByRole('button', { name: 'Toggle event' }))
    expect(screen.getByText('afterglow-live')).toBeTruthy()

    clerkState.id = 'user-two'
    view.rerender(<WishlistControl />)
    expect(screen.getByText('Nothing saved')).toBeTruthy()

    clerkState.id = 'user-one'
    view.rerender(<WishlistControl />)
    expect(screen.getByText('afterglow-live')).toBeTruthy()
  })

  it('shows an error when browser storage rejects a save', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })
    render(
      <MemoryRouter>
        <WishlistButton eventId="afterglow-live" />
      </MemoryRouter>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save to wishlist' }))
    expect(screen.getByRole('alert').textContent).toContain('Could not save here')
  })
})
