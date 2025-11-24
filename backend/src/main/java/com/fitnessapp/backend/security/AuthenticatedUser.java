package com.fitnessapp.backend.security;

import java.io.Serializable;
import java.util.UUID;

/**
 * Represents the authenticated caller derived from API key authentication.
 */
public record AuthenticatedUser(
    Long apiKeyId,
    String apiKeyName,
    UUID userId
) implements Serializable {
}
