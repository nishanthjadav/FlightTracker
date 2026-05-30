package com.nishanth.flight_tracker.model;

public class Airport {
    private String code;
    private String name;
    private Double lat;
    private Double lon;

    public Airport() {}

    public Airport(String code, String name, Double lat, Double lon) {
        this.code = code;
        this.name = name;
        this.lat = lat;
        this.lon = lon;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public double getLat() {
        return lat;
    }

    public void setLat(double lat) {
        this.lat = lat;
    }

    public double getLon() {
        return lon;
    }

    public void setLon(double lon) {
        this.lon = lon;
    }
}
