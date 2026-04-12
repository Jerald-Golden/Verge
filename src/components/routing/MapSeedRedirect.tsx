import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MathUtils } from 'three'

/** Assigns a stable map seed in the URL (Three.js UUID); replace so `/` is not left in history. */
export function MapSeedRedirect() {
    const navigate = useNavigate()

    useEffect(() => {
        navigate(`/${MathUtils.generateUUID()}`, { replace: true })
    }, [navigate])

    return null
}
