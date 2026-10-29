import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, type ReactElement } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { NAV_ITEMS } from '@/components/layout/nav'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/features/auth/AuthContext'
import { CodeSignInPage } from '@/features/auth/CodeSignInPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { PendingPage } from '@/features/auth/PendingPage'
import { RequireRole } from '@/features/auth/RequireRole'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { AdminSignupPage } from '@/features/auth/AdminSignupPage'
import { EmployeeSignupPage } from '@/features/auth/EmployeeSignupPage'
import { VerifyPage } from '@/features/auth/VerifyPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { PrivacyPage, TermsPage } from '@/features/legal/LegalPages'
import { NotFoundPage } from '@/components/NotFoundPage'

// The signed-in screens load on demand, so the landing and sign-in pages stay small and fast.
const DashboardPage = lazy(() => import('@/features/inventory/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })))
const ProductsPage = lazy(() => import('@/features/products/ProductsPage').then((m) => ({ default: m.ProductsPage })))
const WarehousesPage = lazy(() => import('@/features/warehouses/WarehousesPage').then((m) => ({ default: m.WarehousesPage })))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const UsersPage = lazy(() => import('@/features/users/UsersPage').then((m) => ({ default: m.UsersPage })))
const ProfilePage = lazy(() => import('@/features/account/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('@/features/account/SettingsPage').then((m) => ({ default: m.SettingsPage })))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

/** Route element for each nav entry. Access rules come from NAV_ITEMS so the dock and the router never disagree. */
const PAGES: Record<string, ReactElement> = {
  '/dashboard': <DashboardPage />,
  '/inventory': <InventoryPage />,
  '/products': <ProductsPage />,
  '/warehouses': <WarehousesPage />,
  '/reports': <ReportsPage />,
  '/users': <UsersPage />,
}

/** Every route in the app. Kept apart from the providers so tests can mount it with their own router and data. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/code" element={<CodeSignInPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/signup/admin" element={<AdminSignupPage />} />
      <Route path="/signup/employee" element={<EmployeeSignupPage />} />
      <Route path="/signup/verify" element={<VerifyPage />} />
      <Route path="/signup/pending" element={<PendingPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      {/* Grouped /auth/* routes so both /auth/login and /login work seamlessly */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/login/code" element={<CodeSignInPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/signup/admin" element={<AdminSignupPage />} />
      <Route path="/auth/signup/employee" element={<EmployeeSignupPage />} />
      <Route path="/auth/signup/verify" element={<VerifyPage />} />
      <Route path="/auth/signup/pending" element={<PendingPage />} />
      <Route element={<AppLayout />}>
        {NAV_ITEMS.map((item) => (
          <Route
            key={item.to}
            path={item.to}
            element={<RequireRole roles={item.roles} permission={item.permission}>{PAGES[item.to]}</RequireRole>}
          />
        ))}
        {/* Personal pages: every signed-in role, reached from the account menu rather than the dock. */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
