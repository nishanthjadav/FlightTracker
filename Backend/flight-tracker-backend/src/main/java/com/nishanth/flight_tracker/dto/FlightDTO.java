package com.nishanth.flight_tracker.dto;

public class FlightDTO {

    private String departureAirport;
    private String arrivalAirport;
    private Long firstSeen;
    private Long lastSeen;

    private Double depLat;
    private Double depLng;
    private Double arrLat;
    private Double arrLng;

    public FlightDTO() {}

    public FlightDTO(String departureAirport, String arrivalAirport, Long firstSeen, Long lastSeen, Double depLat, Double depLng, Double arrLat, Double arrLng) {
        this.departureAirport = departureAirport;
        this.arrivalAirport = arrivalAirport;
        this.firstSeen = firstSeen;
        this.lastSeen = lastSeen;
        this.depLat = depLat;
        this.depLng = depLng;
        this.arrLat = arrLat;
        this.arrLng = arrLng;
    }
    public FlightDTO(String departureAirport, String arrivalAirport, Long firstSeen, Long lastSeen) {
        this.departureAirport = departureAirport;
        this.arrivalAirport = arrivalAirport;
        this.firstSeen = firstSeen;
        this.lastSeen = lastSeen;
    }

    public String getDepartureAirport() { return departureAirport; }
    public void setDepartureAirport(String departureAirport) { this.departureAirport = departureAirport; }

    public String getArrivalAirport() { return arrivalAirport; }
    public void setArrivalAirport(String arrivalAirport) { this.arrivalAirport = arrivalAirport; }

    public Long getFirstSeen() { return firstSeen; }
    public void setFirstSeen(Long firstSeen) { this.firstSeen = firstSeen; }

    public Long getLastSeen() { return lastSeen; }
    public void setLastSeen(Long lastSeen) { this.lastSeen = lastSeen; }

    public Double getDepLat() { return depLat; }
    public void setDepLat(Double depLat) { this.depLat = depLat; }

    public Double getDepLng() { return depLng; }
    public void setDepLng(Double depLng) { this.depLng = depLng; }

    public Double getArrLat() { return arrLat; }
    public void setArrLat(Double arrLat) { this.arrLat = arrLat; }

    public Double getArrLng() { return arrLng; }
    public void setArrLng(Double arrLng) { this.arrLng = arrLng; }
}