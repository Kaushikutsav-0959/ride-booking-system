package com.utsav.ridebooking.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.utsav.ridebooking.Security.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> {
        })
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(
                        auth -> auth
                                .requestMatchers("/auth/**")
                                .permitAll()
                                .requestMatchers("/actuator/**")
                                .permitAll()
                                .requestMatchers("/admin/**")
                                .hasRole("ADMIN")
                                .requestMatchers("/rides/*/accept")
                                .hasAnyRole("DRIVER", "ADMIN")
                                .requestMatchers("/rides/*/reject")
                                .hasAnyRole("DRIVER", "ADMIN")
                                .requestMatchers("/rides/*/complete")
                                .hasAnyRole("DRIVER", "ADMIN")
                                .requestMatchers("/rides/*/start")
                                .hasAnyRole("DRIVER", "ADMIN")
                                .requestMatchers("/rides")
                                .hasAnyRole("PASSENGER", "ADMIN")
                                .requestMatchers("/rides/**")
                                .hasAnyRole("PASSENGER", "ADMIN")
                                .requestMatchers("/drivers/nearby")
                                .authenticated()
                                .requestMatchers("/drivers/**")
                                .hasAnyRole("DRIVER", "ADMIN")
                                .anyRequest()
                                .authenticated())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable());

        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}