package com.nishanth.flight_tracker.controller;

import com.nishanth.flight_tracker.dto.*;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class FlightController {

    private final RestTemplate restTemplate;

    @Value("${opensky.client-id}")
    private String clientId;

    @Value("${opensky.client-secret}")
    private String clientSecret;

    public FlightController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

@GetMapping("/api/flights")
public List<FlightDTO> getFlights() {
    RestTemplate restTemplate = new RestTemplate();

    long now = System.currentTimeMillis() / 1000;
    long begin = now - 3600; // last 1 hour
    long end = now;

    String url = "https://opensky-network.org/api/flights/all?begin=" + begin + "&end=" + end;

    ResponseEntity<List<Map<String, Object>>> response =
        restTemplate.exchange(
            url,
            HttpMethod.GET,
            null,
            new ParameterizedTypeReference<>() {}
        );

    List<Map<String, Object>> body = response.getBody();
    if (body == null) return List.of();

    return body.stream().map(f -> new FlightDTO(
        (String) f.get("estDepartureAirport"),
        (String) f.get("estArrivalAirport"),
        (Integer) f.get("firstSeen"),
        (Integer) f.get("lastSeen")
    )).toList();
}

    private String getAccessToken() {

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        String body =
                "grant_type=client_credentials" +
                "&client_id=" + clientId +
                "&client_secret=" + clientSecret;

        HttpEntity<String> request = new HttpEntity<>(body, headers);

        OpenSkyAuthResponse response =
                restTemplate.postForObject(
                        "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
                        request,
                        OpenSkyAuthResponse.class
                );

        return response.getAccessToken();
    }
}