package com.nishanth.flight_tracker.client;

import com.nishanth.flight_tracker.dto.PlaneStateDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class OpenSkyClient {

    private static final Logger log = LoggerFactory.getLogger(OpenSkyClient.class);

    /** When OpenSky returns 429, refuse to call again for this long. */
    private static final long RATE_LIMIT_COOLDOWN_MS = 60_000;

    private final RestTemplate restTemplate;
    private final ObjectMapper mapper = new ObjectMapper();
    private final AtomicLong rateLimitedUntil = new AtomicLong(0);

    @Value("${opensky.username:}")
    private String username;

    @Value("${opensky.password:}")
    private String password;

    public OpenSkyClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        if (username != null && !username.isBlank() && password != null) {
            String token = username + ":" + password;
            String basic = Base64.getEncoder().encodeToString(token.getBytes(StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + basic);
        }
        return headers;
    }

    /** True if we're currently in the cooldown window after a 429. */
    private boolean isRateLimited() {
        return System.currentTimeMillis() < rateLimitedUntil.get();
    }

    private void enterCooldown(String operation) {
        long until = System.currentTimeMillis() + RATE_LIMIT_COOLDOWN_MS;
        rateLimitedUntil.set(until);
        log.warn("OpenSky 429 on {} — suppressing outbound calls for {}s",
            operation, RATE_LIMIT_COOLDOWN_MS / 1000);
    }

    public String fetchFlightsRaw(long begin, long end) {
        if (isRateLimited()) return null;
        try {
            String url = String.format("https://opensky-network.org/api/flights/all?begin=%d&end=%d", begin, end);
            HttpEntity<Void> request = new HttpEntity<>(authHeaders());
            ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            return resp.getBody();
        } catch (HttpClientErrorException.TooManyRequests e) {
            enterCooldown("fetchFlightsRaw");
            return null;
        } catch (Exception e) {
            log.error("OpenSkyClient.fetchFlightsRaw failed: {}", e.getMessage());
            return null;
        }
    }

    public JsonNode fetchState(String icao24) {
        if (isRateLimited()) return null;
        try {
            String url = String.format("https://opensky-network.org/api/states/all?icao24=%s", icao24);
            HttpEntity<Void> request = new HttpEntity<>(authHeaders());
            ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            if (resp.getStatusCode().value() != 200) return null;
            return mapper.readTree(resp.getBody());
        } catch (HttpClientErrorException.TooManyRequests e) {
            enterCooldown("fetchState");
            return null;
        } catch (Exception e) {
            log.error("OpenSkyClient.fetchState failed for {}: {}", icao24, e.getMessage());
            return null;
        }
    }

    public List<PlaneStateDTO> fetchStatesBatch(List<String> icao24s) {
        if (icao24s == null || icao24s.isEmpty()) return Collections.emptyList();
        if (isRateLimited()) return Collections.emptyList();

        // OpenSky uses GET with one query param per icao24 — nginx caps URL length
        // around 8 KB, so anything past ~80-100 icao24s triggers a 414. Chunk and merge.
        // Conservative size: ~50 codes ≈ 700 bytes of query string.
        final int CHUNK_SIZE = 50;
        List<String> cleaned = new ArrayList<>();
        for (String code : icao24s) {
            if (code != null && !code.isBlank()) cleaned.add(code.toLowerCase());
        }
        if (cleaned.isEmpty()) return Collections.emptyList();

        List<PlaneStateDTO> all = new ArrayList<>();
        for (int i = 0; i < cleaned.size(); i += CHUNK_SIZE) {
            // Bail out of remaining chunks if a 429 puts us in cooldown mid-loop.
            if (isRateLimited()) break;
            List<String> chunk = cleaned.subList(i, Math.min(i + CHUNK_SIZE, cleaned.size()));
            all.addAll(fetchStatesChunk(chunk));
        }
        return all;
    }

    private List<PlaneStateDTO> fetchStatesChunk(List<String> icao24s) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString("https://opensky-network.org/api/states/all");
            for (String code : icao24s) {
                builder.queryParam("icao24", code);
            }
            URI uri = builder.build().encode().toUri();

            HttpEntity<Void> request = new HttpEntity<>(authHeaders());
            ResponseEntity<String> resp = restTemplate.exchange(uri, HttpMethod.GET, request, String.class);
            if (resp.getStatusCode().value() != 200) {
                log.warn("fetchStatesChunk non-200: {}", resp.getStatusCode());
                return Collections.emptyList();
            }

            JsonNode root = mapper.readTree(resp.getBody());
            JsonNode states = root.get("states");
            List<PlaneStateDTO> out = new ArrayList<>();
            if (states == null || !states.isArray()) return out;

            for (JsonNode s : states) {
                PlaneStateDTO dto = new PlaneStateDTO();
                // OpenSky state vector spec:
                // [0]=icao24 [1]=callsign [2]=origin_country [5]=lng [6]=lat
                // [7]=baro_altitude [8]=on_ground [9]=velocity [10]=true_track
                dto.setIcao24(strAt(s, 0));
                String cs = strAt(s, 1);
                dto.setCallsign(cs != null ? cs.trim() : null);
                dto.setOriginCountry(strAt(s, 2));
                dto.setLng(dblAt(s, 5));
                dto.setLat(dblAt(s, 6));
                dto.setAltitude(dblAt(s, 7));
                dto.setOnGround(s.has(8) && !s.get(8).isNull() ? s.get(8).asBoolean() : null);
                dto.setVelocity(dblAt(s, 9));
                dto.setHeading(dblAt(s, 10));
                out.add(dto);
            }
            return out;
        } catch (HttpClientErrorException.TooManyRequests e) {
            enterCooldown("fetchStatesChunk");
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("OpenSkyClient.fetchStatesChunk failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private static String strAt(JsonNode arr, int idx) {
        return arr.has(idx) && !arr.get(idx).isNull() ? arr.get(idx).asText() : null;
    }

    private static Double dblAt(JsonNode arr, int idx) {
        return arr.has(idx) && !arr.get(idx).isNull() ? arr.get(idx).asDouble() : null;
    }
}
