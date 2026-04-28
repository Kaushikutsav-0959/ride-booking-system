package com.utsav.ridebooking.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

import com.utsav.ridebooking.models.User;
import com.utsav.ridebooking.models.UserRole;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByRole(UserRole role);

    @Modifying
    @Query("DELETE FROM User u WHERE u.email <> :email")
    void deleteAllExcept(@Param("email") String email);

}