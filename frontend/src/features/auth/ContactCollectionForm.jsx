import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { clerkErrorMessage } from './clerkErrors'

const emailSchema = z.object({ contact: z.email('Enter a valid email address') })
const phoneSchema = z.object({
  contact: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Use international format, such as +919876543210'),
})

export function ContactCollectionForm({ kind, onSubmit }) {
  const isPhone = kind === 'phone'
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(isPhone ? phoneSchema : emailSchema) })

  async function submit(values) {
    setError('')
    try {
      await onSubmit(values.contact)
    } catch (cause) {
      setError(clerkErrorMessage(cause))
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor={`${kind}-contact`} className="text-sm font-semibold text-slate-800">
          {isPhone ? 'Mobile number' : 'Email address'}
        </label>
        <Input
          id={`${kind}-contact`}
          type={isPhone ? 'tel' : 'email'}
          inputMode={isPhone ? 'tel' : 'email'}
          autoComplete={isPhone ? 'tel' : 'email'}
          placeholder={isPhone ? '+919876543210' : 'you@example.com'}
          aria-invalid={Boolean(errors.contact)}
          aria-describedby={errors.contact ? `${kind}-error` : undefined}
          {...register('contact')}
        />
        {errors.contact && (
          <p id={`${kind}-error`} className="text-sm text-red-700">
            {errors.contact.message}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Sending code...' : 'Send verification code'}
      </Button>
    </form>
  )
}
