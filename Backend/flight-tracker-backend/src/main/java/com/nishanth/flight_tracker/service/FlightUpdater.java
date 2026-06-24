package com.nishanth.flight_tracker.service;

import org.springframework.stereotype.Component;

/**
 * Previously ran a @Scheduled refresh every 30s, but it overwrote FlightService's
 * enriched cache with un-coordinatized, un-enriched flights. FlightService now owns
 * the cache lifecycle (in-memory TTL + disk persistence), so this class is a no-op.
 */
@Component
public class FlightUpdater {
}
