package com.nishanth.flight_tracker.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class PlaneState {

    public String icao24;
    public String callsign;
    public String origin_country;

    public Double longitude;
    public Double latitude;

    public Double baro_altitude;
    public Boolean on_ground;

    public Double velocity;
    public Double true_track;
}