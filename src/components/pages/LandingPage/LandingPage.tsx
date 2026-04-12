import { useState, type TransitionEvent } from 'react'
import { VergeButton } from '../../buttons'

type Hide = 'no' | 'fade' | 'yes'

export function LandingPage() {
    const [hide, setHide] = useState<Hide>('no')

    if (hide === 'yes') {
        return null
    }

    const onPlay = () =>
        setHide((h) => {
            if (h !== 'no') {
                return h
            }
            return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'yes' : 'fade'
        })

    const onChromeTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
        if (e.propertyName !== 'opacity') {
            return
        }
        setHide((h) => (h === 'fade' ? 'yes' : h))
    }

    return (
        <div
            className={`landing__chrome${hide === 'fade' ? ' landing__chrome--exiting' : ''}`}
            onTransitionEnd={onChromeTransitionEnd}
        >
            <header className="landing__header">
                <h1 className="landing__title">VERGE: Endless Road</h1>
            </header>
            <div className="landing__main">
                <div className="landing__actions" role="group" aria-label="Main menu">
                    <VergeButton onClick={onPlay}>PLAY</VergeButton>
                    <VergeButton onClick={() => {}}>SETTINGS</VergeButton>
                </div>
            </div>
        </div>
    )
}
