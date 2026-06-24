package com.nishanth.flight_tracker.dto;

import java.util.List;

public class BatchStateRequest {

    private List<String> icao24s;

    public BatchStateRequest() {}

    public List<String> getIcao24s() { return icao24s; }
    public void setIcao24s(List<String> icao24s) { this.icao24s = icao24s; }
}
