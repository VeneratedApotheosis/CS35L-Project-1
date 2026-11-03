import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

// Placeholder login
export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth()

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  return (
    <main>
      <h1>Habit Garden</h1>
      <button type="button" onClick={() => void signInWithGoogle()}>
        Sign in with Google
      </button>
    </main>
  )
}