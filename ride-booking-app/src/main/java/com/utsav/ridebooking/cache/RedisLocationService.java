package com.utsav.ridebooking.cache;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.data.geo.Point;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Metrics;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.redis.domain.geo.GeoReference;
import java.util.ArrayList;
import java.util.HashMap;

@Service
public class RedisLocationService {
    private final StringRedisTemplate stringRedisTemplate;

    private static final String DRIVER_GEO_KEY = "drivers:geo";
    private static final String DRIVER_HEARTBEAT_KEY_PREFIX = "driver:heartbeat:";
    private static final long HEARTBEAT_TTL_SECONDS = 30;
    private static final String ELIGIBLE_DRIVERS_TEMPLATE = "ride:{rideId}:candidates";
    private static final long RIDE_ACCEPTANCE_TIMER = 60;
    private static final String RIDE_REQUEST_CHANNEL = "ride:requests";

    public RedisLocationService(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    private String buildHeartbeatKey(Long driverId) {
        return DRIVER_HEARTBEAT_KEY_PREFIX + driverId;
    }

    public void saveDriverLocation(Long driverId, double lat, double lon) {
        stringRedisTemplate.opsForGeo().add(DRIVER_GEO_KEY, new Point(lon, lat), driverId.toString());
        String heartbeatKey = buildHeartbeatKey(driverId);
        stringRedisTemplate.opsForValue().set(heartbeatKey, "alive", HEARTBEAT_TTL_SECONDS,
                java.util.concurrent.TimeUnit.SECONDS);
    }

    public List<Long> fetchNearestDrivers(double pickupLat, double pickupLong, double radiusKm, int limit) {
        GeoResults<RedisGeoCommands.GeoLocation<String>> results = stringRedisTemplate
                .opsForGeo()
                .search(DRIVER_GEO_KEY, GeoReference.fromCoordinate(new Point(pickupLong, pickupLat)),
                        new Distance(radiusKm, Metrics.KILOMETERS),
                        RedisGeoCommands.GeoSearchCommandArgs.newGeoSearchArgs().limit(limit));

        List<Long> driverIds = new ArrayList<>();
        if (results == null) {
            return driverIds;
        }

        results.forEach(r -> {
            String member = r.getContent().getName();
            driverIds.add(Long.valueOf(member));
        });

        return driverIds;
    }

    public void storeEligibleDrivers(Long rideId, List<Long> driverIds) {

        if (driverIds == null || driverIds.isEmpty()) {
            return;
        }

        String rideKey = ELIGIBLE_DRIVERS_TEMPLATE.replace("{rideId}", rideId.toString());
        List<String> driverIdStrings = driverIds.stream().map(String::valueOf).toList();
        stringRedisTemplate.opsForSet().add(rideKey, driverIdStrings.toArray(new String[0]));
        stringRedisTemplate.expire(rideKey, RIDE_ACCEPTANCE_TIMER, TimeUnit.SECONDS);
    }

    public void publishRideRequest(Long rideId, double pickupLat, double pickupLong) {
        try {
            ObjectMapper mapper = new ObjectMapper();

            Map<String, Object> payloadMap = new HashMap<>();
            payloadMap.put("rideId", rideId);
            payloadMap.put("pickupLat", pickupLat);
            payloadMap.put("pickupLong", pickupLong);
            payloadMap.put("timestamp", System.currentTimeMillis());

            String payload = mapper.writeValueAsString(payloadMap);

            stringRedisTemplate.convertAndSend(RIDE_REQUEST_CHANNEL, payload);
        } catch (Exception e) {
            throw new RuntimeException("Failed to publish ride request : ", e);
        }
    }

    public List<Long> getEligibleDrivers(Long rideId) {
        String rideKey = ELIGIBLE_DRIVERS_TEMPLATE.replace("{rideId}", rideId.toString());
        var members = stringRedisTemplate.opsForSet().members(rideKey);
        List<Long> driverIds = new ArrayList<>();
        if (members == null) {
            return driverIds;
        }

        for (String member : members) {
            driverIds.add(Long.valueOf(member));
        }

        return driverIds;
    }

    public void clearEligibleDrivers(Long rideId) {
        String rideKey = ELIGIBLE_DRIVERS_TEMPLATE.replace("{rideId}", rideId.toString());
        stringRedisTemplate.delete(rideKey);
    }

    public void clearEligibleDriver(Long rideId, Long driverId) {
        String rideKey = ELIGIBLE_DRIVERS_TEMPLATE.replace("{rideId}", rideId.toString());
        stringRedisTemplate.opsForSet().remove(rideKey, driverId.toString());
    }

    public Map<Long, Point> fetchDriverLocations(List<Long> driverIds) {
        Map<Long, Point> locations = new HashMap<>();

        if (driverIds == null || driverIds.isEmpty()) {
            return locations;
        }

        List<String> members = driverIds.stream().map(String::valueOf).toList();
        List<Point> points = stringRedisTemplate.opsForGeo().position(DRIVER_GEO_KEY, members.toArray(new String[0]));

        for (int i = 0; i < members.size(); i++) {
            Point p = points.get(i);
            if (p != null) {
                locations.put(Long.valueOf(members.get(i)), p);
            }
        }

        return locations;
    }
}