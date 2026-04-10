import { Route, Routes } from 'react-router-dom'
import { useLoadingContext } from '../context/LoadingContext.tsx'
import { LandingPage } from './pages/LandingPage/LandingPage.tsx'

export function Verge() {
    const { isLoading } = useLoadingContext()

    return (
        <main className="app" aria-busy={isLoading}>
            <Routes>
                <Route path="/" element={<LandingPage />} />
            </Routes>
        </main>
    )
}
