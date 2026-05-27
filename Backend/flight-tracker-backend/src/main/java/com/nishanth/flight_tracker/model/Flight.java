package com.nishanth.flight_tracker.model;


public class Flight{

    public String id;
    public String airline;
    public double lat;
    public double lng;
    private double heading;
    private double velocity;

    public Flight(String id,
                  String airline,
                  double lat,
                  double lng,
                  double heading,
                  double velocity) {

        this.id = id;
        this.airline = airline;
        this.lat = lat;
        this.lng = lng;
        this.heading = heading;
        this.velocity = velocity;
    }
     public String getId() {
        return id;
    }

    public String getAirline() {
        return airline;
    }

    public double getLat() {
        return lat;
    }

    public double getLng() {
        return lng;
    }

    public double getHeading() {
        return heading;
    }

    public double getVelocity() {
        return velocity;
    }
}