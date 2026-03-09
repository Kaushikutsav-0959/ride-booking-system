package com.utsav.ridebooking.events;

import java.util.List;

public class RideEvent {
    private Long rideId;
    private Long driverId;
    private List<Long> eligibleDrivers;
    private Long customerId;
    private Long timestamp;
    private String eventType;

    public RideEvent() {
    }

    public Long getRideId() {
        return rideId;
    }

    public void setRideId(Long rideId) {
        this.rideId = rideId;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public List<Long> getEligibleDrivers() {
        return eligibleDrivers;
    }

    public void setEligibleDrivers(List<Long> eligibleDrivers) {
        this.eligibleDrivers = eligibleDrivers;
    }

    public Long getDriverId() {
        return driverId;
    }

    public void setDriverId(Long driverId) {
        this.driverId = driverId;
    }
}
