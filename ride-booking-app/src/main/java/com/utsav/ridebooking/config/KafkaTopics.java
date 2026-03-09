package com.utsav.ridebooking.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KafkaTopics {
    public static final String RIDE_EVENTS = "ride-events";

    @Bean
    public NewTopic rideEventsTopic() {
        return new NewTopic(RIDE_EVENTS, 3, (short) 1);
    }
}