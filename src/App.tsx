/** @file Defines the main application component with routing and global providers. */

import { HashRouter, Navigate, Route, Routes } from 'react-router'
import HomePage from './pages/Home'
import GalleryPage from './pages/Gallery'
import AdminPage from './pages/Admin'
import ProfilePage from './pages/Profile'
import FavoritesPage from './pages/Favorites'
import AlbumsPage from './pages/Albums'
import { AuthProvider } from './context/AuthContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { AppLayout } from './components/layout/AppLayout'

/**
 * Root application component that wires routing and global state providers.
 */
export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <HashRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/albums" element={<AlbumsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </HashRouter>
      </FavoritesProvider>
    </AuthProvider>
  )
}
