import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { EmailVerificationPage } from './EmailVerificationPage'
import { PhoneVerificationPage } from './PhoneVerificationPage'

const clerkState = vi.hoisted(() => ({ user: null }))
vi.mock('@clerk/react', () => ({
  useUser: () => ({ user: clerkState.user }),
  useReverification: (callback) => callback,
}))

function renderPage(Page) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  )
}

describe('Clerk contact verification', () => {
  beforeEach(() => {
    clerkState.user = null
  })
  afterEach(cleanup)

  it('collects an email, sends a code, verifies it, and makes it primary', async () => {
    const person = userEvent.setup()
    const email = {
      id: 'email_1',
      emailAddress: 'ada@example.com',
      prepareVerification: vi.fn().mockResolvedValue(undefined),
      attemptVerification: vi.fn().mockResolvedValue({ verification: { status: 'verified' } }),
    }
    const user = {
      emailAddresses: [],
      primaryEmailAddress: null,
      primaryEmailAddressId: null,
      createEmailAddress: vi.fn().mockResolvedValue(email),
      update: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
    }
    clerkState.user = user
    renderPage(EmailVerificationPage)

    await person.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await person.click(screen.getByRole('button', { name: 'Send verification code' }))
    await waitFor(() =>
      expect(user.createEmailAddress).toHaveBeenCalledWith({ email: 'ada@example.com' }),
    )
    expect(email.prepareVerification).toHaveBeenCalledWith({ strategy: 'email_code' })

    await person.type(screen.getByLabelText('Verification code'), '123456')
    await person.click(screen.getByRole('button', { name: 'Verify and continue' }))
    await waitFor(() => expect(email.attemptVerification).toHaveBeenCalledWith({ code: '123456' }))
    expect(user.update).toHaveBeenCalledWith({ primaryEmailAddressId: 'email_1' })
    expect(user.reload).toHaveBeenCalled()
  })

  it('collects an E.164 phone number, sends SMS, verifies OTP, and makes it primary', async () => {
    const person = userEvent.setup()
    const phone = {
      id: 'phone_1',
      phoneNumber: '+919876543210',
      prepareVerification: vi.fn().mockResolvedValue(undefined),
      attemptVerification: vi.fn().mockResolvedValue({ verification: { status: 'verified' } }),
    }
    const user = {
      phoneNumbers: [],
      primaryPhoneNumber: null,
      primaryPhoneNumberId: null,
      createPhoneNumber: vi.fn().mockResolvedValue(phone),
      update: vi.fn().mockResolvedValue(undefined),
      reload: vi.fn().mockResolvedValue(undefined),
    }
    clerkState.user = user
    renderPage(PhoneVerificationPage)

    await person.type(screen.getByLabelText('Mobile number'), '9876543210')
    await person.click(screen.getByRole('button', { name: 'Send verification code' }))
    expect(screen.getByText('Use international format, such as +919876543210')).toBeTruthy()
    expect(user.createPhoneNumber).not.toHaveBeenCalled()

    await person.clear(screen.getByLabelText('Mobile number'))
    await person.type(screen.getByLabelText('Mobile number'), '+919876543210')
    await person.click(screen.getByRole('button', { name: 'Send verification code' }))
    await waitFor(() =>
      expect(user.createPhoneNumber).toHaveBeenCalledWith({ phoneNumber: '+919876543210' }),
    )
    expect(phone.prepareVerification).toHaveBeenCalled()

    await person.type(screen.getByLabelText('Verification code'), '654321')
    await person.click(screen.getByRole('button', { name: 'Verify and continue' }))
    await waitFor(() => expect(phone.attemptVerification).toHaveBeenCalledWith({ code: '654321' }))
    expect(user.update).toHaveBeenCalledWith({ primaryPhoneNumberId: 'phone_1' })
    expect(user.reload).toHaveBeenCalled()
  })

  it('shows a recoverable Clerk error when phone creation fails', async () => {
    const person = userEvent.setup()
    clerkState.user = {
      phoneNumbers: [],
      primaryPhoneNumber: null,
      createPhoneNumber: vi.fn().mockRejectedValue({ errors: [{ message: 'Try again later' }] }),
    }
    renderPage(PhoneVerificationPage)
    await person.type(screen.getByLabelText('Mobile number'), '+919876543210')
    await person.click(screen.getByRole('button', { name: 'Send verification code' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Try again later'))
    expect(screen.getByRole('button', { name: 'Send verification code' }).disabled).toBe(false)
  })
})
