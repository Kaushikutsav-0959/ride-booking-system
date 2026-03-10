package com.utsav.ridebooking.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.utsav.ridebooking.models.OutboxEvent;
import java.util.List;
import org.springframework.data.domain.Pageable;

public interface OutboxRepository extends JpaRepository<OutboxEvent, Long> {

    List<OutboxEvent> findByProcessedFalseOrderByIdAsc(Pageable pageable);
}