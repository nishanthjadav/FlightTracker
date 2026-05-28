package com.nishanth.flight_tracker.dto;

public class FlightDTO {
    public String departureAirport;
    public String arrivalAirport;
    public Integer firstSeen;
    public Integer lastSeen;

    public FlightDTO(String d, String a, Integer f, Integer l) {
        this.departureAirport = d;
        this.arrivalAirport = a;
        this.firstSeen = f;
        this.lastSeen = l;
    }
}