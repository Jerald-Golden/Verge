import { BrowserRouter } from 'react-router-dom'
import { LoadingProvider } from '../context/LoadingContext.tsx'
import { Verge } from './Verge.tsx'

export default function App() {
    return (
        <LoadingProvider>
            <BrowserRouter>
                <Verge />
            </BrowserRouter>
        </LoadingProvider>
    )
}
