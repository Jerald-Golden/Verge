import { useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react'

/** Radius large enough to cover the whole button from any origin inside the rect (avoids snap when origin moves). */
function setFillRadiusCover(el: HTMLButtonElement, rect: DOMRectReadOnly) {
    el.style.setProperty(
        '--verge-btn-fill-r-max',
        `${Math.hypot(rect.width, rect.height) * 1.02}px`,
    )
}

function setFillOriginFromPointer(el: HTMLButtonElement, clientX: number, clientY: number) {
    const rect = el.getBoundingClientRect()
    const px = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const py = Math.max(0, Math.min(clientY - rect.top, rect.height))
    const ax = (px / rect.width) * 100
    const ay = (py / rect.height) * 100
    el.style.setProperty('--verge-btn-fill-ax', `${ax}%`)
    el.style.setProperty('--verge-btn-fill-ay', `${ay}%`)
    setFillRadiusCover(el, rect)
}

function setFillOriginCenter(el: HTMLButtonElement) {
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--verge-btn-fill-ax', '50%')
    el.style.setProperty('--verge-btn-fill-ay', '50%')
    setFillRadiusCover(el, rect)
}

export type VergeButtonProps = {
    children: ReactNode
    onClick?: () => void
    className?: string
}

export function VergeButton({ children, onClick, className }: Readonly<VergeButtonProps>) {
    const [hovered, setHovered] = useState(false)

    const handlePointerEnter = (e: MouseEvent<HTMLButtonElement>) => {
        setFillOriginFromPointer(e.currentTarget, e.clientX, e.clientY)
        setHovered(true)
    }

    const handlePointerLeave = (e: MouseEvent<HTMLButtonElement>) => {
        setFillOriginFromPointer(e.currentTarget, e.clientX, e.clientY)
        setHovered(false)
    }

    const handleFocus = (e: FocusEvent<HTMLButtonElement>) => {
        if (e.currentTarget.matches(':focus-visible')) {
            setFillOriginCenter(e.currentTarget)
            setHovered(true)
        }
    }

    const handleBlur = () => {
        setHovered(false)
    }

    const rootClass = [
        'verge-button verge-button--glass',
        hovered ? 'verge-button--hovered' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <button
            type="button"
            className={rootClass}
            onClick={onClick}
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
            onFocus={handleFocus}
            onBlur={handleBlur}
        >
            <span className="verge-button__fill" aria-hidden />
            <span className="verge-button__label">{children}</span>
        </button>
    )
}
