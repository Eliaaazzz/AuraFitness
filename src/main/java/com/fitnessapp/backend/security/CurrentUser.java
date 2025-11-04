package com.fitnessapp.backend.security;

import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {

  public Optional<AuthenticatedUser> get() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser principal)) {
      return Optional.empty();
    }
    return Optional.of(principal);
  }

  public UUID requireUserId() {
    return get()
        .map(AuthenticatedUser::userId)
        .orElseThrow(() -> new IllegalStateException("User context is missing. Did you provide X-API-Key?"));
  }
}
