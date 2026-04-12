import { useParams } from 'react-router-dom'
import { Game } from '../../game/Game.tsx'
import { LandingPage } from './LandingPage.tsx'

/** Shell for `/:mapId`: canvas + glass UI on one route. */
export function LandingLayout() {
    const { mapId } = useParams<{ mapId: string }>()

    return (
        <div className="landing" data-map-seed={mapId}>
            <Game mapSeed={mapId ?? 'default'} />
            <LandingPage />
        </div>
    )
}
