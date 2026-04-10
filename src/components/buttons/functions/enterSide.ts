export type EnterSide = 'top' | 'right' | 'bottom' | 'left'

export function getEnterSide(el: HTMLElement, clientX: number, clientY: number): EnterSide {
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height))
    const w = rect.width
    const h = rect.height
    const dTop = y
    const dBottom = h - y
    const dLeft = x
    const dRight = w - x
    const min = Math.min(dTop, dBottom, dLeft, dRight)
    if (min === dTop) {
        return 'top'
    }
    if (min === dBottom) {
        return 'bottom'
    }
    if (min === dLeft) {
        return 'left'
    }
    return 'right'
}
