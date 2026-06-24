package com.nishanth.flight_tracker.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Celebrity {

    private String name;
    private String category;
    private List<CelebrityAircraft> aircraft = new ArrayList<>();

    public Celebrity() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public List<CelebrityAircraft> getAircraft() { return aircraft; }
    public void setAircraft(List<CelebrityAircraft> aircraft) { this.aircraft = aircraft; }
}
