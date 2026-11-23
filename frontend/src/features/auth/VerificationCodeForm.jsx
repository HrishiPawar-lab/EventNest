import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { clerkErrorMessage } from './clerkErrors'

const codeSchema = z.object({
  code: z.string().regex(/^\d{4,8}$/, 'Enter the code from your message'),
})

export function VerificationCodeForm({ kind, target, onSend, onVerify, initialSent = false }) {
  const [sent, setSent] = useState(initialSent)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(initialSent ? 'Code sent. Check your messages.' : '')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(codeSchema) })

  async function send() {
    setError('')
    setSending(true)
    try {
      await onSend()
      setSent(true)
      setFeedback('A new code is on its way.')
    } catch (cause) {
      setError(clerkErrorMessage(cause))
    } finally {
      setSending(false)
    }
  }

  async function verify({ code }) {
    setError('')
    try {
      await onVerify(code)
      setFeedback('Verified. Taking you back...')
    } catch (cause) {
      setError(clerkErrorMessage(cause))
    }
  }

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-slate-700">
        {kind === 'phone' ? 'Send a text to' : 'Send an email to'} <strong>{target}</strong>
      </p>
      {!sent && (
        <Button onClick={send} disabled={sending} className="w-full">
          {sending ? 'Sending...' : 'Send verification code'}
        </Button>
      )}
      {sent && (
        <form onSubmit={handleSubmit(verify)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <label htmlFor={`${kind}-code`} className="text-sm font-semibold text-slate-800">
              Verification code
            </label>
            <Input
              id={`${kind}-code`}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter your code"
              aria-invalid={Boolean(errors.code)}
              aria-describedby={errors.code ? `${kind}-code-error` : undefined}
              {...register('code')}
            />
            {errors.code && (
              <p id={`${kind}-code-error`} className="text-sm text-red-700">
                {errors.code.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Verify and continue'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={send}
            disabled={sending || isSubmitting}
          >
            {sending ? 'Resending...' : 'Resend code'}
          </Button>
        </form>
      )}
      {feedback && (
        <p role="status" className="text-sm text-emerald-800">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
