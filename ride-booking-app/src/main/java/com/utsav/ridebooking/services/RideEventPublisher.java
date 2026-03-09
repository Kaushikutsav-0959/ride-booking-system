package com.utsav.ridebooking.services;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import com.utsav.ridebooking.events.RideEvent;

@Service
public class RideEventPublisher {
    private final KafkaTemplate<String, RideEvent> kafkaTemplate;

    public RideEventPublisher(KafkaTemplate<String, RideEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(String topic, RideEvent event) {
        kafkaTemplate.send(topic, event);
    }
}
