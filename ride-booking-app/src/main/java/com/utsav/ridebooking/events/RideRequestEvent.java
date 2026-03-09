package com.utsav.ridebooking.events;

import java.time.LocalDateTime;

public class RideRequestEvent {
    private Long rideId;
    private Double pickupLat;
    private Double pickupLong;
    private LocalDateTime timestamp;

    RideRequestEvent() {
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

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}