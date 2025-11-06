# Free Tier Quota System

## Overview

The CameraFirst Fitness app includes a **free tier quota system** for AI-powered features to ensure fair usage and sustainability. This document outlines the quota policies, technical implementation, and user experience guidelines.

## Free Tier Limits

### AI Recipe Generation
- **Limit**: 10 AI-generated meal plans per day
- **Reset**: Daily at midnight (user's timezone)
- **Behavior**:
  - ✅ Cached meal plans DO NOT consume quota
  - ✅ Fallback recipes (non-AI) DO NOT consume quota
  - ❌ Each new AI generation consumes 1 quota
  
### AI Nutrition Advice
- **Limit**: 5 advice requests per week
- **Reset**: Weekly on Monday (user's timezone)
- **Behavior**:
  - Cached advice within the same week does not consume quota
  - Each unique weekly advice generation consumes 1 quota

### Pose Analysis
- **Limit**: 20 analyses per day
- **Reset**: Daily at midnight (user's timezone)
- **Behavior**:
  - Each pose analysis upload consumes 1 quota
  - Reviewing previous analyses does not consume quota

## API Endpoints

### Check Quota Status

**Get All Quotas**
```http
GET /api/v1/quotas
Authorization: Bearer {token}

Response 200:
{
  "data": {
    "ai_recipe_generation": {
      "type": "AI_RECIPE_GENERATION",
      "limit": 10,
      "used": 3,
      "remaining": 7,
      "periodStart": "2025-11-06",
      "periodEnd": "2025-11-07",
      "resetsAt": "2025-11-07T00:00:00Z",
      "exceeded": false
    },
    "ai_nutrition_advice": {...},
    "pose_analysis": {...}
  }
}
```

**Get Specific Quota**
```http
GET /api/v1/quotas/recipe
GET /api/v1/quotas/nutrition
GET /api/v1/quotas/pose

Response 200:
{
  "data": {
    "type": "AI_RECIPE_GENERATION",
    "limit": 10,
    "used": 3,
    "remaining": 7,
    "periodStart": "2025-11-06",
    "periodEnd": "2025-11-07",
    "resetsAt": "2025-11-07T00:00:00Z",
    "exceeded": false
  }
}
```

### Quota Exceeded Error

When a user exceeds their quota:

```http
POST /api/v1/meal-plans/generate

Response 429 (Too Many Requests):
{
  "code": "QUOTA_EXCEEDED",
  "message": "Quota exceeded for ai_recipe_generation: used 10/10 (resets in 0 days)",
  "quotaUsage": {
    "type": "AI_RECIPE_GENERATION",
    "limit": 10,
    "used": 10,
    "remaining": 0,
    "periodStart": "2025-11-06",
    "periodEnd": "2025-11-07",
    "resetsAt": "2025-11-07T00:00:00Z",
    "exceeded": true
  }
}
```

## Frontend Integration

### Display Quota in UI

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from './services/api';

function QuotaIndicator() {
  const { data } = useQuery({
    queryKey: ['quotas', 'recipe'],
    queryFn: () => api.get('/api/v1/quotas/recipe'),
  });

  if (!data) return null;

  const quota = data.data.data;
  const percentage = (quota.used / quota.limit) * 100;

  return (
    <div className="quota-indicator">
      <div className="quota-bar">
        <div 
          className="quota-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p>
        {quota.remaining} / {quota.limit} AI recipes remaining today
      </p>
      {quota.exceeded && (
        <p className="quota-warning">
          Quota exceeded. Resets in {quota.daysUntilReset} days.
        </p>
      )}
    </div>
  );
}
```

### Handle Quota Exceeded

```typescript
import { useMutation } from '@tanstack/react-query';

function GenerateRecipeButton() {
  const generateRecipe = useMutation({
    mutationFn: () => api.post('/api/v1/meal-plans/generate'),
    onError: (error) => {
      if (error.response?.status === 429) {
        const quotaData = error.response.data;
        showQuotaExceededModal(quotaData);
      }
    },
  });

  return (
    <button onClick={() => generateRecipe.mutate()}>
      Generate AI Recipe
    </button>
  );
}

function showQuotaExceededModal(quotaData) {
  // Show friendly modal with:
  // - Current usage: X/Y
  // - Time until reset
  // - Option to view cached recipes
  // - Upgrade CTA (future)
}
```

## Technical Implementation

### Architecture

```
User Request
    ↓
Controller (REST API)
    ↓
QuotaService.checkQuota()  ← Check before operation
    ↓
Business Logic (e.g., SmartRecipeService)
    ↓
QuotaService.consumeQuota()  ← Consume if operation succeeds
    ↓
Redis Counter (atomic increment)
    ↓
Response to User
```

### Redis Storage

**Key Format:**
```
quota:{type}:{userId}:{periodStart}
```

**Examples:**
```
quota:ai_recipe_generation:uuid-123:2025-11-06
quota:ai_nutrition_advice:uuid-123:2025-11-04  (week start)
quota:pose_analysis:uuid-123:2025-11-06
```

**TTL:**
- Keys automatically expire at the end of the period + 1 hour buffer
- Daily quotas: ~25 hours TTL
- Weekly quotas: ~8 days TTL

### Code Flow

**1. Check Quota (Before Operation)**
```java
QuotaUsage usage = quotaService.checkQuota(userId, QuotaType.AI_RECIPE_GENERATION);
if (usage.exceeded()) {
  throw new QuotaExceededException(usage);
}
```

**2. Consume Quota (After Successful Operation)**
```java
try {
  // Check first
  quotaService.checkQuota(userId, QuotaType.AI_RECIPE_GENERATION);
  
  // Consume before expensive AI call
  quotaService.consumeQuota(userId, QuotaType.AI_RECIPE_GENERATION);
  
  // Perform AI operation
  String result = aiService.generate(...);
  
  return result;
} catch (QuotaExceededException ex) {
  throw ex; // Let exception handler deal with it
}
```

### Metrics

All quota operations are tracked with Micrometer metrics:

**Counters:**
- `quota.consumed{type=ai_recipe_generation,exceeded=false}` - Successful consumption
- `quota.consumed{type=ai_recipe_generation,exceeded=true}` - Attempted consumption when exceeded
- `quota.exceeded{type=ai_recipe_generation}` - Total exceeded attempts
- `quota.reset{type=ai_recipe_generation}` - Manual resets (admin)

**Timers:**
- `quota.consume.duration{type=ai_recipe_generation}` - Consumption latency
- `quota.check.duration{type=ai_recipe_generation}` - Check latency

## User Experience Guidelines

### When to Show Quota

**✅ DO:**
- Show quota indicator on AI feature pages
- Show remaining count before user clicks generate
- Display quota percentage (e.g., "7/10 remaining")
- Show countdown to reset when quota is low (<20%)

**❌ DON'T:**
- Don't hide quota until exceeded
- Don't surprise users with quota errors
- Don't make quota the primary focus (keep it subtle)

### Quota Messaging

**Good Examples:**
```
✅ "You have 7 AI recipes remaining today"
✅ "3 AI generations left (resets at midnight)"
✅ "Your daily quota refreshes in 4 hours"
```

**Bad Examples:**
```
❌ "QUOTA EXCEEDED - UPGRADE NOW!"
❌ "Error: Out of credits"
❌ "You can't do that anymore"
```

### Graceful Degradation

When quota is exceeded:

1. **Show cached content first**
   - "Here's your most recent AI-generated plan"
   - Users can still view and use previous generations

2. **Offer alternatives**
   - "Browse our recipe library"
   - "Try our pre-made meal plans"
   - "Customize an existing plan"

3. **Explain the limit**
   - "We limit AI generations to keep the app free and fast"
   - "Your quota resets tomorrow at midnight"

4. **Future: Upgrade option**
   - "Get unlimited AI generations with Premium"
   - (Not implemented yet)

## Testing

### Unit Tests

```bash
./gradlew test --tests QuotaServiceTest
```

**Test Coverage:**
- ✅ Check quota with no usage
- ✅ Check quota with existing usage
- ✅ Consume quota increments counter
- ✅ Consume quota throws when exceeded
- ✅ Consume multiple units at once
- ✅ Reset quota deletes Redis key
- ✅ Get all quotas returns all types
- ✅ Quota period matches reset period
- ✅ Metrics are recorded correctly

### Integration Tests

```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Run integration tests
./gradlew integrationTest
```

### Manual Testing

```bash
# Check quota
curl -H "Authorization: Bearer {token}" \
  http://localhost:8080/api/v1/quotas/recipe

# Generate recipe (consumes quota)
curl -X POST -H "Authorization: Bearer {token}" \
  http://localhost:8080/api/v1/meal-plans/generate

# Verify quota consumed
curl -H "Authorization: Bearer {token}" \
  http://localhost:8080/api/v1/quotas/recipe
```

## Admin Operations

### Reset User Quota (Future)

```java
@PostMapping("/admin/quotas/reset")
@PreAuthorize("hasRole('ADMIN')")
public void resetUserQuota(
    @RequestParam UUID userId,
    @RequestParam QuotaType type) {
  quotaService.resetQuota(userId, type);
}
```

### Monitor Quota Usage

```promql
# Total quota consumed per day
sum(rate(quota_consumed_total[1d])) by (type)

# Quota exceeded rate
rate(quota_exceeded_total[5m])

# Users hitting quota limit
count(quota_consumed_total{exceeded="true"}) by (user_id)
```

## Roadmap

### Phase 1 (Current)
- ✅ Basic quota tracking with Redis
- ✅ Daily/Weekly reset periods
- ✅ REST API for quota status
- ✅ Frontend integration guidelines
- ✅ Error handling and messaging

### Phase 2 (Future)
- ⏳ Premium tier with higher limits
- ⏳ Flexible quota configuration per user
- ⏳ Quota purchase/top-up
- ⏳ Referral bonus quotas
- ⏳ Admin dashboard for quota management

### Phase 3 (Future)
- ⏳ Machine learning-based quota optimization
- ⏳ Dynamic quota adjustments based on usage patterns
- ⏳ Shared team quotas
- ⏳ Quota rollover between periods

## FAQ

**Q: What happens to cached meal plans?**  
A: Cached plans don't consume quota when retrieved. Users can access cached plans indefinitely.

**Q: Can users see their quota history?**  
A: Not yet. Currently only current period usage is tracked. Historical tracking is planned for Phase 2.

**Q: How accurate is the reset countdown?**  
A: Very accurate. Resets are based on user's timezone, calculated server-side.

**Q: What if Redis goes down?**  
A: Quota checks will fail gracefully. The service logs errors but doesn't block users. Consider fallback to in-memory quota tracking.

**Q: Can admins manually adjust quotas?**  
A: Not yet in the UI, but the `QuotaService.resetQuota()` method can be called programmatically.

**Q: Are there rate limits in addition to quotas?**  
A: Not yet. Quotas are daily/weekly caps. Rate limiting (e.g., max 1 request/minute) is planned separately.

## Related Documentation

- [User Library Enhancements](./USER-LIBRARY-ENHANCEMENTS.md)
- [Cache Facade Guide](./CACHE-FACADE-GUIDE.md)
- [API Documentation](./API-DOCS.md)

---

**Status:** ✅ Implemented  
**Date:** November 6, 2025  
**Version:** 1.0
