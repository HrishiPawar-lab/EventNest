import { lazy, StrictMode, Suspense } from 'react'
import { ClerkProvider } from '@clerk/react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import App from './App'
import { AuthComplete, OnboardingGate, RequireAuth } from './features/auth/AuthRoutes'
import { LoadingScreen } from './features/auth/LoadingScreen'
import './index.css'

const AuthPage = lazy(() =>
  import('./features/auth/AuthPage').then((module) => ({ default: module.AuthPage })),
)
const EmailVerificationPage = lazy(() =>
  import('./features/auth/EmailVerificationPage').then((module) => ({
    default: module.EmailVerificationPage,
  })),
)
const PhoneVerificationPage = lazy(() =>
  import('./features/auth/PhoneVerificationPage').then((module) => ({
    default: module.PhoneVerificationPage,
  })),
)
const AccountPage = lazy(() =>
  import('./features/auth/AccountPage').then((module) => ({ default: module.AccountPage })),
)

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
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
            <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/verify-phone" element={<PhoneVerificationPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/auth/complete" element={<AuthComplete />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </OnboardingGate>
    </ClerkProvider>
  )
}

const appRoot = createRoot(root)

if (!publishableKey) {
  appRoot.render(
    <main className="flex min-h-screen items-center justify-center bg-sky-50 px-5 text-center text-slate-800">
      <div className="max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold">EventNest needs its Clerk publishable key</h1>
        <p className="mt-3 text-sm text-slate-600">
          Set VITE_CLERK_PUBLISHABLE_KEY in frontend/.env.local and restart Vite.
        </p>
      </div>
    </main>,
  )
} else {
  appRoot.render(
    <StrictMode>
      <BrowserRouter>
        <ApplicationRoutes />
      </BrowserRouter>
    </StrictMode>,
  )
}
