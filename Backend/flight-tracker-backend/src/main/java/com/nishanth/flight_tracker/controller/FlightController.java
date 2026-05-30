package com.nishanth.flight_tracker.controller;

import com.nishanth.flight_tracker.dto.FlightDTO;
import com.nishanth.flight_tracker.service.FlightService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class FlightController {

    private final FlightService flightService;

    public FlightController(FlightService flightService) {
        this.flightService = flightService;
    }

    @GetMapping("/api/flights")
    public List<FlightDTO> getFlights() {
        return flightService.getFlights();
    }
}