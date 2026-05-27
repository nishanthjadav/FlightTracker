package com.nishanth.flight_tracker.controller;


import com.nishanth.flight_tracker.dto.PocketFlightsResponse;
import com.nishanth.flight_tracker.model.Flight;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@RestController
@RequestMapping("/api/flights")
@CrossOrigin(origins = "http://localhost:5173")
public class FlightController {

    private final RestTemplate restTemplate;

    public FlightController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping
    public List<Flight> getFlights() {

        String url = "https://pocketworld.org/api/flights";

        PocketFlightsResponse response =
    restTemplate.getForObject(url, PocketFlightsResponse.class);

        if (response == null) {
            return List.of();
        }

        return response.flights.stream()
               .map(f -> new Flight(
                f.callsign,
                f.callsign,
                f.lat,
                f.lng,
                f.heading,
                f.velocity
            )).limit(100)
                .toList();
    }
}
