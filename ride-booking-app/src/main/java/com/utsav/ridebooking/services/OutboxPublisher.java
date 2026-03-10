package com.utsav.ridebooking.services;

import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import com.utsav.ridebooking.models.OutboxEvent;
import java.util.List;
import com.utsav.ridebooking.config.KafkaTopics;
import com.utsav.ridebooking.repository.OutboxRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utsav.ridebooking.events.RideEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;

@Service
public class OutboxPublisher {
    private final RideEventPublisher rideEventPublisher;
    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final Logger log = LoggerFactory.getLogger(OutboxPublisher.class);

    OutboxPublisher(RideEventPublisher rideEventPublisher, OutboxRepository outboxRepository) {
        this.rideEventPublisher = rideEventPublisher;
        this.outboxRepository = outboxRepository;
    }

    @Scheduled(fixedDelay = 2000)
    public void publishEvents() {

        Pageable limit = PageRequest.of(0, 100);

        while (true) {
            List<OutboxEvent> events = outboxRepository.findByProcessedFalseOrderByIdAsc(limit);

            if (events.isEmpty()) {
                break;
            }

            List<OutboxEvent> processedBatch = new java.util.ArrayList<>();

            for (OutboxEvent e : events) {
                try {
                    String topic = KafkaTopics.RIDE_EVENTS;

                    /*
                     * For now all events are routed through the ride-events topic.
                     * If driver-location topics are introduced later, this block
                     * can be extended to route based on aggregateType.
                     */

                    RideEvent event = objectMapper.readValue(e.getPayload(), RideEvent.class);
                    rideEventPublisher.publish(topic, event);

                    // mark processed only if publish succeeds
                    e.setProcessed(true);
                    processedBatch.add(e);

                } catch (Exception ex) {
                    log.error("Failed to publish outbox event id={}", e.getId(), ex);
                    // do not mark processed so it will be retried in the next scheduler run
                }
            }
            if (!processedBatch.isEmpty()) {
                outboxRepository.saveAll(processedBatch);
            }
        }
    }
}