package com.utsav.ridebooking.events;

import java.time.LocalDateTime;

public class RideResponseEvent {
    private Long rideId;
    private Long driverId;
    private LocalDateTime timestamp;
    private RideAction action;

    public enum RideAction {
        ACCEPT, REJECT
    }

    public RideResponseEvent() {
    }

    public Long getRideId() {
        return rideId;
    }

    public void setRideId(Long rideId) {
        this.rideId = rideId;
    }

    public Long getDriverId() {
        return driverId;
    }

    public void setDriverId(Long driverId) {
        this.driverId = driverId;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public RideAction getAction() {
        return action;
    }

    public void setAction(RideAction action) {
        this.action = action;
    }

}
