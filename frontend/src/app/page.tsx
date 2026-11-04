import { ProtectedRoute } from "@/auth/ProtectedRoute"
import Garden from "@/views/Garden"

export default function HomePage() {
  return (
    <ProtectedRoute>
      <Garden />
    </ProtectedRoute>
  )
}
