package com.nishanth.flight_tracker.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class OpenSkyClient {

    private static final Logger log = LoggerFactory.getLogger(OpenSkyClient.class);

    private final RestTemplate restTemplate;

    @Value("${opensky.username:}")
    private String username;

    @Value("${opensky.password:}")
    private String password;

    public OpenSkyClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }


    public String fetchFlightsRaw(long begin, long end) {
        try {
            String url = String.format("https://opensky-network.org/api/flights/all?begin=%d&end=%d", begin, end);

            HttpHeaders headers = new HttpHeaders();
            if (username != null && !username.isBlank() && password != null) {
                String token = username + ":" + password;
                String basic = Base64.getEncoder().encodeToString(token.getBytes(StandardCharsets.UTF_8));
                headers.set("Authorization", "Basic " + basic);
            }

            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            return resp.getBody();
        } catch (Exception e) {
            log.error("OpenSkyClient.fetchFlightsRaw failed", e);
            return null;
        }
    }
}
