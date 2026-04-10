import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { LoadingScreen } from '../components/pages/LoadingScreen/LoadingScreen.tsx'

export type LoadingContextValue = {
    isLoading: boolean
    startLoading: () => void
    finishLoading: () => void
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

export function LoadingProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [isLoading, setIsLoading] = useState(true)

    const startLoading = useCallback(() => {
        setIsLoading(true)
    }, [])

    const finishLoading = useCallback(() => {
        setIsLoading(false)
    }, [])

    const value = useMemo(
        () => ({
            isLoading,
            startLoading,
            finishLoading,
        }),
        [isLoading, startLoading, finishLoading],
    )

    return (
        <LoadingContext.Provider value={value}>
            {children}
            {isLoading ? <LoadingScreen onDone={finishLoading} /> : null}
        </LoadingContext.Provider>
    )
}

export function useLoadingContext(): LoadingContextValue {
    const ctx = useContext(LoadingContext)
    if (ctx == null) {
        throw new Error('useLoadingContext must be used within LoadingProvider')
    }
    return ctx
}
