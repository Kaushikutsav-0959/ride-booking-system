package com.utsav.ridebooking.events;

import java.util.List;

public class RideRequestedEvent {
    private Long rideId;
    private Double pickupLat;
    private Double pickupLong;
    private Long customerId;
    private List<Long> candidateDriverIds;
    private long timestamp;

    public RideRequestedEvent() {
    }

    public Long getRideId() {
        return rideId;
    }

    public void setRideId(Long rideId) {
        this.rideId = rideId;
    }

    public Double getPickupLat() {
        return pickupLat;
    }

    public void setPickupLat(Double pickupLat) {
        this.pickupLat = pickupLat;
    }

    public Double getPickupLong() {
        return pickupLong;
    }

    public void setPickupLong(Double pickupLong) {
        this.pickupLong = pickupLong;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public void setCustomerId(Long customerId) {
        this.customerId = customerId;
    }

    public List<Long> getCandidateDriverIds() {
        return candidateDriverIds;
    }

    public void setCandidateDriverIds(List<Long> candidateDriverIds) {
        this.candidateDriverIds = candidateDriverIds;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

}