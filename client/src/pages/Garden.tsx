import { useAuth } from '../auth/useAuth'

// Placeholder home page
export default function Garden() {
  const { user, signOut } = useAuth()

  return (
    <main>
      <h1>Garden</h1>
      <p>Signed in as {user?.email}</p>
      <button type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </main>
  )
}