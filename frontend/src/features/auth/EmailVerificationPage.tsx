import { useReverification, useUser } from '@clerk/react'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { AuthShell } from './AuthShell'
import { clerkErrorMessage } from './clerkErrors'
import { ContactCollectionForm } from './ContactCollectionForm'
import { VerificationCodeForm } from './VerificationCodeForm'

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>
type ClerkEmail = NonNullable<ClerkUser['primaryEmailAddress']>

export function EmailVerificationPage() {
  const { user } = useUser()
  const [pendingEmail, setPendingEmail] = useState<ClerkEmail | null>(null)
  const [error, setError] = useState('')
  const [promoting, setPromoting] = useState(false)
  const createEmail = useReverification((address: string) =>
    user?.createEmailAddress({ email: address }),
  )
  const setPrimaryEmail = useReverification((id: string) =>
    user?.update({ primaryEmailAddressId: id }),
  )
  const email = pendingEmail || user?.primaryEmailAddress || user?.emailAddresses?.[0]
  const verifiedAlternate = user?.emailAddresses?.find(
    (entry) => entry.verification?.status === 'verified' && entry.id !== user.primaryEmailAddressId,
  )

  async function addEmail(address: string) {
    const created = await createEmail(address)
    if (!created) throw new Error('Email address could not be added')
    await created.prepareVerification({ strategy: 'email_code' })
    setPendingEmail(created)
  }

  async function verify(code: string) {
    if (!user || !email) throw new Error('Email address is unavailable')
    const verified = await email.attemptVerification({ code })
    if (verified.verification?.status !== 'verified')
      throw new Error('Email verification is still pending')
    if (user.primaryEmailAddressId !== email.id) {
      await setPrimaryEmail(email.id)
    }
    await user.reload()
  }

  async function promoteExisting() {
    if (!user || !verifiedAlternate) return
    setError('')
    setPromoting(true)
    try {
      await setPrimaryEmail(verifiedAlternate.id)
      await user.reload()
    } catch (cause) {
      setError(clerkErrorMessage(cause))
    } finally {
      setPromoting(false)
    }
  }

  return (
    <AuthShell eyebrow="One quick security step">
      <Card className="border-0 shadow-none">
        <CardHeader className="p-0">
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            Confirm your email address before continuing to EventNest.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-6">
          {verifiedAlternate ? (
            <Button onClick={promoteExisting} disabled={promoting} className="w-full">
              Use my verified email
            </Button>
          ) : email ? (
            <VerificationCodeForm
              key={email.id}
              kind="email"
              target={email.emailAddress}
              initialSent={Boolean(pendingEmail)}
              onSend={() => email.prepareVerification({ strategy: 'email_code' })}
              onVerify={verify}
            />
          ) : (
            <ContactCollectionForm kind="email" onSubmit={addEmail} />
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  )
}
