import { useReverification, useUser } from '@clerk/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { AuthShell } from './AuthShell'
import { phoneVerificationErrorMessage } from './clerkErrors'
import { ContactCollectionForm } from './ContactCollectionForm'
import { VerificationCodeForm } from './VerificationCodeForm'

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>
type ClerkPhone = NonNullable<ClerkUser['primaryPhoneNumber']>

export function PhoneVerificationPage() {
  const { user } = useUser()
  const [pendingPhone, setPendingPhone] = useState<ClerkPhone | null>(null)
  const [useNewNumber, setUseNewNumber] = useState(false)
  const [error, setError] = useState('')
  const [promoting, setPromoting] = useState(false)
  const createPhone = useReverification((number: string) =>
    user?.createPhoneNumber({ phoneNumber: number }),
  )
  const setPrimaryPhone = useReverification((id: string) =>
    user?.update({ primaryPhoneNumberId: id }),
  )
  const phone = useNewNumber
    ? null
    : pendingPhone || user?.primaryPhoneNumber || user?.phoneNumbers?.[0]
  const verifiedAlternate = useNewNumber
    ? undefined
    : user?.phoneNumbers?.find(
        (entry) =>
          entry.verification?.status === 'verified' && entry.id !== user.primaryPhoneNumberId,
      )
  const phoneVerified = phone?.verification?.status === 'verified'

  async function addPhone(number: string) {
    const created = await createPhone(number)
    if (!created) throw new Error('Phone number could not be added')
    await created.prepareVerification()
    setUseNewNumber(false)
    setPendingPhone(created)
  }

  async function verify(code: string) {
    if (!user || !phone) throw new Error('Phone number is unavailable')
    const verified = await phone.attemptVerification({ code })
    if (verified.verification?.status !== 'verified')
      throw new Error('Phone verification is still pending')
    if (user.primaryPhoneNumberId !== phone.id) {
      await setPrimaryPhone(phone.id)
    }
    await user.reload()
  }

  async function promoteExisting() {
    if (!user || !verifiedAlternate) return
    setError('')
    setPromoting(true)
    try {
      await setPrimaryPhone(verifiedAlternate.id)
      await user.reload()
    } catch (cause) {
      setError(phoneVerificationErrorMessage(cause))
    } finally {
      setPromoting(false)
    }
  }

  return (
    <AuthShell eyebrow="Optional account detail">
      <Card className="border-0 shadow-none">
        <CardHeader className="p-0">
          <CardTitle>Add a phone number</CardTitle>
          <CardDescription>
            Phone verification is optional. If SMS is supported for your number, we will send a
            one-time code. You can continue using EventNest without a phone number.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-6">
          {verifiedAlternate ? (
            <Button onClick={promoteExisting} disabled={promoting} className="w-full">
              Use my verified number
            </Button>
          ) : phoneVerified ? (
            <p role="status" className="text-sm text-emerald-800">
              Your phone number is verified.
            </p>
          ) : phone ? (
            <>
              <VerificationCodeForm
                key={phone.id}
                kind="phone"
                target={phone.phoneNumber}
                initialSent={Boolean(pendingPhone)}
                onSend={() => phone.prepareVerification()}
                onVerify={verify}
              />
              <Button
                type="button"
                variant="ghost"
                className="mt-3 w-full"
                onClick={() => setUseNewNumber(true)}
              >
                Use a different number
              </Button>
            </>
          ) : (
            <ContactCollectionForm kind="phone" onSubmit={addPhone} />
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button asChild variant="outline" className="mt-5 w-full">
            <Link to="/account">Continue to my account</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
