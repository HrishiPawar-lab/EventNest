import { StrictMode } from 'react'
import { ClerkProvider } from '@clerk/react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { IconContext } from 'react-icons'
import { AppRoutes } from './app/router'
import { OnboardingGate } from './features/auth/AuthRoutes'
import './index.css'

const root = document.getElementById('root')
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!root) {
  throw new Error('EventNest root element is missing')
}

function ApplicationRoutes() {
  const navigate = useNavigate()

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/auth/complete"
      signUpFallbackRedirectUrl="/auth/complete"
    >
      <OnboardingGate>
        <AppRoutes />
      </OnboardingGate>
    </ClerkProvider>
  )
}

const appRoot = createRoot(root)

if (!publishableKey) {
  appRoot.render(
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 text-center text-ink">
      <div className="max-w-md rounded-xl border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">EventNest needs its Clerk publishable key</h1>
        <p className="mt-3 text-sm text-stone-600">
          Set VITE_CLERK_PUBLISHABLE_KEY in frontend/.env.local and restart Vite.
        </p>
      </div>
    </main>,
  )
} else {
  appRoot.render(
    <StrictMode>
      <IconContext.Provider value={{ style: { strokeWidth: 1.5 } }}>
        <BrowserRouter>
          <ApplicationRoutes />
        </BrowserRouter>
      </IconContext.Provider>
    </StrictMode>,
  )
}
