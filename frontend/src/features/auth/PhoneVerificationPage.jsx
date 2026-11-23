import { useReverification, useUser } from '@clerk/react'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { AuthShell } from './AuthShell'
import { clerkErrorMessage } from './clerkErrors'
import { ContactCollectionForm } from './ContactCollectionForm'
import { VerificationCodeForm } from './VerificationCodeForm'

export function PhoneVerificationPage() {
  const { user } = useUser()
  const [pendingPhone, setPendingPhone] = useState(null)
  const [useNewNumber, setUseNewNumber] = useState(false)
  const [error, setError] = useState('')
  const [promoting, setPromoting] = useState(false)
  const createPhone = useReverification((number) =>
    user?.createPhoneNumber({ phoneNumber: number }),
  )
  const setPrimaryPhone = useReverification((id) => user?.update({ primaryPhoneNumberId: id }))
  const phone = useNewNumber
    ? null
    : pendingPhone || user?.primaryPhoneNumber || user?.phoneNumbers?.[0]
  const verifiedAlternate =
    !useNewNumber &&
    user?.phoneNumbers?.find(
      (entry) =>
        entry.verification?.status === 'verified' && entry.id !== user.primaryPhoneNumberId,
    )

  async function addPhone(number) {
    const created = await createPhone(number)
    await created.prepareVerification()
    setUseNewNumber(false)
    setPendingPhone(created)
  }

  async function verify(code) {
    const verified = await phone.attemptVerification({ code })
    if (verified.verification?.status !== 'verified')
      throw new Error('Phone verification is still pending')
    if (user.primaryPhoneNumberId !== phone.id) {
      await setPrimaryPhone(phone.id)
    }
    await user.reload()
  }

  async function promoteExisting() {
    setError('')
    setPromoting(true)
    try {
      await setPrimaryPhone(verifiedAlternate.id)
      await user.reload()
    } catch (cause) {
      setError(clerkErrorMessage(cause))
    } finally {
      setPromoting(false)
    }
  }

  return (
    <AuthShell eyebrow="One last security step">
      <Card className="border-0 shadow-none">
        <CardHeader className="p-0">
          <CardTitle>Verify your phone</CardTitle>
          <CardDescription>
            Every EventNest account needs a verified mobile number. We will text you a one-time
            code.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-6">
          {verifiedAlternate ? (
            <Button onClick={promoteExisting} disabled={promoting} className="w-full">
              Use my verified number
            </Button>
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
        </CardContent>
      </Card>
    </AuthShell>
  )
}
