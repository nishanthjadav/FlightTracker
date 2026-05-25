package com.nishanth.flight_tracker.model;


public class Flight{

    public String id;
    public String airline;
    public double lat;
    public double lng;

    public Flight(String id, String airline, double lat, double lng) {
        this.id = id;
        this.airline = airline;
        this.lat = lat;
        this.lng = lng;
    }
}