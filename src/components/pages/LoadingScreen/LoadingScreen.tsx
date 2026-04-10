import { useEffect, useRef, useState } from 'react'
import { LOADING_LABELS, MIN_LOADING_MS } from './loadingConfig'

type LoadingScreenProps = {
    onDone: () => void
}

export function LoadingScreen({ onDone }: Readonly<LoadingScreenProps>) {
    const [exiting, setExiting] = useState(false)
    const [labelIndex, setLabelIndex] = useState(0)
    const doneCalled = useRef(false)

    const currentLabel = LOADING_LABELS[labelIndex]

    useEffect(() => {
        if (exiting) {
            return
        }
        const n = LOADING_LABELS.length
        const stepMs = Math.max(280, Math.floor(MIN_LOADING_MS / n))
        let step = 0
        const id = globalThis.setInterval(() => {
            step += 1
            if (step < n) {
                setLabelIndex(step)
            } else {
                globalThis.clearInterval(id)
            }
        }, stepMs)
        return () => globalThis.clearInterval(id)
    }, [exiting])

    useEffect(() => {
        let cancelled = false
        const fontsReady = (globalThis.document?.fonts?.ready ?? Promise.resolve(undefined)).catch(
            () => undefined,
        )
        const minDelay = new Promise<void>((resolve) => {
            setTimeout(resolve, MIN_LOADING_MS)
        })

        void Promise.all([fontsReady, minDelay]).then(() => {
            if (!cancelled) {
                setExiting(true)
            }
        })

        return () => {
            cancelled = true
        }
    }, [])

    const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
        if (event.propertyName !== 'opacity' || !exiting || doneCalled.current) {
            return
        }
        doneCalled.current = true
        onDone()
    }

    return (
        <div
            className={`loading-screen${exiting ? ' loading-screen--exiting' : ''}`}
            role="status"
            aria-live="polite"
            aria-busy={!exiting}
            style={
                {
                    '--loading-duration': `${MIN_LOADING_MS}ms`,
                } as React.CSSProperties
            }
            onTransitionEnd={handleTransitionEnd}
        >
            <span className="loading-screen__sr">Loading: {currentLabel}</span>
            <div className="loading-screen__stack">
                <p className="loading-screen__primary">Loading</p>
                <div className="loading-screen__track" aria-hidden="true">
                    <div className="loading-screen__fill" />
                </div>
                <p className="loading-screen__secondary" key={labelIndex}>
                    {currentLabel}
                </p>
            </div>
        </div>
    )
}
