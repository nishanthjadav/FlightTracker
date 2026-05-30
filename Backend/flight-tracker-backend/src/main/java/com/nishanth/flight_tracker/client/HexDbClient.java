package com.nishanth.flight_tracker.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nishanth.flight_tracker.model.Airport;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Component
public class HexDbClient {

    private static final String BASE_URL =
            "https://hexdb.io/api/v1/airport/icao/";

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    public Airport fetchAirport(String icao) {
        if (icao == null || icao.isBlank()) return null;

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(BASE_URL + icao))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return null;
            }

            JsonNode node = mapper.readTree(response.body());

            if (node.has("status") && node.get("status").asInt() == 404) {
                return null;
            }

            String name = node.has("airport") ? node.get("airport").asText() : null;
            double lat = node.has("latitude") ? node.get("latitude").asDouble() : 0.0;
            double lon = node.has("longitude") ? node.get("longitude").asDouble() : 0.0;

            if (name == null) return null;

            return new Airport(
                    icao,
                    name,
                    lat,
                    lon
            );

        } catch (Exception e) {
            return null;
        }
    }
}