import { useUser } from '@clerk/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuArrowLeft, LuCircleCheck, LuMail, LuPhone } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { SiteShell } from '../../components/layout/SiteShell'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(50),
  lastName: z.string().trim().max(50),
})
type ProfileValues = z.infer<typeof profileSchema>

export function AccountSettingsPage() {
  const { user } = useUser()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { firstName: user?.firstName || '', lastName: user?.lastName || '' },
  })

  const save = handleSubmit(async (values) => {
    setStatus('')
    setError('')
    if (!user) return
    try {
      await user.update(values)
      await user.reload()
      setStatus('Profile updated.')
    } catch {
      setError('Could not update your profile. Please try again.')
    }
  })

  return (
    <SiteShell>
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-brand"
        >
          <LuArrowLeft aria-hidden="true" /> Back to profile
        </Link>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-brand">Your account</p>
        <h1 className="mt-2 text-4xl font-black">Account settings</h1>
        <p className="mt-3 text-stone-600">Keep your profile and contact details up to date.</p>
        <div className="mt-8 space-y-6">
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold">Personal details</h2>
            <p className="mt-1 text-sm text-stone-500">
              The name people see on your EventNest profile.
            </p>
            <form onSubmit={save} className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="first-name" className="mb-2 block text-sm font-semibold">
                  First name
                </label>
                <Input
                  id="first-name"
                  {...register('firstName')}
                  aria-invalid={Boolean(errors.firstName)}
                />
                {errors.firstName && (
                  <p role="alert" className="mt-1 text-xs text-red-700">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="last-name" className="mb-2 block text-sm font-semibold">
                  Last name
                </label>
                <Input
                  id="last-name"
                  {...register('lastName')}
                  aria-invalid={Boolean(errors.lastName)}
                />
                {errors.lastName && (
                  <p role="alert" className="mt-1 text-xs text-red-700">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </form>
            {status && (
              <p role="status" className="mt-4 flex items-center gap-2 text-sm text-green-800">
                <LuCircleCheck aria-hidden="true" /> {status}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-red-700">
                {error}
              </p>
            )}
          </section>
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold">Contact and verification</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <LuMail aria-hidden="true" className="text-brand" />
                  <span>
                    <strong className="block">Email address</strong>
                    <span className="text-stone-500">
                      {user?.primaryEmailAddress?.emailAddress || 'Not available'}
                    </span>
                  </span>
                </div>
                <span className="text-xs font-semibold text-green-800">Verified</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <LuPhone aria-hidden="true" className="text-brand" />
                  <span>
                    <strong className="block">Phone number</strong>
                    <span className="text-stone-500">
                      {user?.primaryPhoneNumber?.phoneNumber || 'Optional — not added'}
                    </span>
                  </span>
                </div>
                <Link to="/verify-phone" className="text-xs font-bold text-brand hover:underline">
                  {user?.primaryPhoneNumber ? 'Manage' : 'Add'}
                </Link>
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold">Security</h2>
            <p className="mt-2 text-sm text-stone-600">
              Your password, connected accounts, and active sessions are managed securely by Clerk.
            </p>
            <p className="mt-4 text-xs text-stone-500">
              Password changes and session management are not exposed through this EventNest
              preview.
            </p>
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
