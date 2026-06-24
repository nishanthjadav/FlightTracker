package com.nishanth.flight_tracker.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class CelebrityAircraft {

    private String registration;
    private String icao24;
    private String model;

    public CelebrityAircraft() {}

    public String getRegistration() { return registration; }
    public void setRegistration(String registration) { this.registration = registration; }

    public String getIcao24() { return icao24; }
    public void setIcao24(String icao24) { this.icao24 = icao24; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
}
