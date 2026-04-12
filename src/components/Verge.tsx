import { Route, Routes } from 'react-router-dom'
import { useLoadingContext } from '../context/LoadingContext.tsx'
import { LandingLayout } from './pages/LandingPage/LandingLayout.tsx'
import { MapSeedRedirect } from './routing/MapSeedRedirect.tsx'

export function Verge() {
    const { isLoading } = useLoadingContext()

    return (
        <main className="app" aria-busy={isLoading}>
            <Routes>
                <Route path="/" element={<MapSeedRedirect />} />
                <Route path="/:mapId" element={<LandingLayout />} />
            </Routes>
        </main>
    )
}
