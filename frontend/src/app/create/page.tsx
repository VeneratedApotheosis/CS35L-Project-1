import { ProtectedRoute } from "@/auth/ProtectedRoute"
import CreateHabit from "@/views/CreateHabit"

export default function CreateHabitPage() {
  return (
    <ProtectedRoute>
      <CreateHabit />
    </ProtectedRoute>
  )
}
