import { VergeCanvas } from '../canvas/Canvas.tsx'

/** R3F scene host; expand with game loop / entities as needed. */
export function Game() {
    return (
        <div className="game" aria-hidden>
            <VergeCanvas />
        </div>
    )
}
