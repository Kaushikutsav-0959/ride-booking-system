package com.utsav.ridebooking.utils;

public class GeoUtil {
    private static final Double EARTH_RADIUS_KM = 6371.00;

    public static Double haversineDistance(
            Double lat1,
            Double long1,
            Double lat2,
            Double long2) {
        Double dlat = Math.toRadians(lat2 - lat1);
        Double dlong = Math.toRadians(long2 - long1);

        Double rlat1 = Math.toRadians(lat1);
        Double rlat2 = Math.toRadians(lat2);

        Double a = Math.sin(dlat / 2) * Math.sin(dlat / 2)
                + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(dlong / 2) * Math.sin(dlong / 2);

        Double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_KM * c;
    }
}