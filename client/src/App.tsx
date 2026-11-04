import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import Garden from './pages/Garden'
import Login from './pages/Login'
import StyleGuide from './styleGuide'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/style-guide" element={<StyleGuide />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Garden />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App