import { VergeButton } from '../../buttons'

export function LandingPage() {
    return (
        <div className="landing__chrome">
            <header className="landing__header">
                <h1 className="landing__title">VERGE: Endless Road</h1>
            </header>
            <div className="landing__main">
                <div className="landing__actions" role="group" aria-label="Main menu">
                    <VergeButton onClick={() => {}}>PLAY</VergeButton>
                    <VergeButton onClick={() => {}}>SETTINGS</VergeButton>
                </div>
            </div>
        </div>
    )
}
