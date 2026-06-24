import type { Flight, PlaneStateDTO } from "../api/flights";

type Props = {
  flight: Flight | null;
  state: PlaneStateDTO | null;
  onClose: () => void;
};

export default function FlightInfoPanel({ flight, state, onClose }: Props) {
  if (!flight) return null;

  const callsign = state?.callsign?.trim() || flight.callsign?.trim() || "—";
  const altitudeFt = state?.altitude != null ? Math.round(state.altitude * 3.281) : null;
  const velocityKts = state?.velocity != null ? Math.round(state.velocity * 1.944) : null;
  const heading = state?.heading != null ? Math.round(state.heading) : null;

  return (
    <aside className="info-panel">
      <div className="info-header">
        <div>
          <div className="info-header-row">
            <div className="info-callsign">{callsign}</div>
          </div>
          <div className="info-icao">
            <span className="lbl">ICAO24</span> {flight.icao24?.toUpperCase() || "—"}
          </div>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="info-body">
        {flight.celebrityName && (
          <div className="celebrity-badge">
            <span className="star">★</span>
            <div>
              <div className="name">{flight.celebrityName}</div>
              {flight.celebrityCategory && (
                <div className="cat">{flight.celebrityCategory}</div>
              )}
            </div>
          </div>
        )}

        <div className="route">
          <div className="airport-code">{flight.departureAirport || "----"}</div>
          <div className="route-arrow" />
          <div className="airport-code">{flight.arrivalAirport || "----"}</div>
        </div>

        <div className="info-grid">
          <Cell label="Altitude" value={altitudeFt != null ? `${altitudeFt.toLocaleString()} ft` : "—"} />
          <Cell label="Ground Speed" value={velocityKts != null ? `${velocityKts} kt` : "—"} />
          <Cell label="Heading" value={heading != null ? `${heading.toString().padStart(3, "0")}°` : "—"} />
          <Cell label="On Ground" value={state?.onGround == null ? "—" : state.onGround ? "YES" : "NO"} />
          <Cell label="Aircraft" value={flight.aircraftModel || "—"} fullWidth />
          <Cell label="Operator Origin" value={state?.originCountry || flight.originCountry || "—"} fullWidth />
        </div>
      </div>
    </aside>
  );
}

function Cell({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={`info-cell${fullWidth ? " full" : ""}`}>
      <div className="info-cell-label">{label}</div>
      <div className="info-cell-value">{value}</div>
    </div>
  );
}
