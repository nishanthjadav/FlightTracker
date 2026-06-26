# FlightTracker

A real-time flight tracking app with a 3D interactive globe. Browse live flights from around the world, filter by country/altitude/aircraft type, and track known celebrity private jets.

## What it does

- Pulls live flight data from the [OpenSky Network](https://opensky-network.org/) and displays planes on a 3D globe
- Tracks a curated list of celebrity aircraft — see which ones are airborne right now
- Filter flights by origin country, altitude, speed, aircraft model, and more
- Click any plane to see details: callsign, origin, destination, speed, heading, altitude
- Analytics panel with a breakdown of the current flight data

## Stack

- **Frontend**: React + TypeScript, Vite, Three.js-based globe
- **Backend**: Java Spring Boot, polls OpenSky every 10 seconds and caches results

## Project structure

```
FlightTracker/
├── Backend/flight-tracker-backend/   # Spring Boot API
└── Frontend/flight-tracker-frontend/ # React app
```

## Running locally

**Backend** — requires Java 17+
```bash
cd Backend/flight-tracker-backend
./mvnw spring-boot:run
```

**Frontend**
```bash
cd Frontend/flight-tracker-frontend
npm install
npm run dev
```

The frontend expects the backend running at `localhost:8080`.
