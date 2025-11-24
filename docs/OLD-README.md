````markdown
# 🏋️ AI Fitness Coach - Camera First Fitness

**AI-Powered Pose Analysis & Personalized Training Platform**

An intelligent fitness application that uses GPT-4 Vision and computer vision to analyze workout form, provide real-time corrections, and track progress over time.

## 🎯 Core Features

### ✅ Implemented
- **AI Pose Analysis**: Upload workout photos/videos for instant AI feedback
- **5 Exercise Types**: Squat, Deadlift, Bench Press, Yoga, Plank
- **Smart Scoring**: 1-10 rating with detailed breakdown
- **Progress Tracking**: Historical data with improvement metrics
- **Multi-platform**: REST API + React Native mobile app
- **Enterprise Ready**: API key authentication, quota management

### 🚀 Coming Soon
- MediaPipe skeleton detection for precise joint angles
- Real-time video stream analysis
- Team dashboards for corporate wellness programs
- Personalized training plan generation

## 💡 Why This Matters

30% of gym-goers get injured due to improper form. Our AI coach provides 24/7 expert guidance at a fraction of traditional personal trainer costs.

---

Backend services for the Camera First Fitness MVP. This repository includes a Spring Boot service, PostgreSQL, and Redis all orchestrated via Docker Compose.

## Prerequisites
- Docker Desktop 4.0+ (engine + compose plugin)
- Java 21 (Temurin recommended) if running the app locally without Docker
- Make a copy of `.env.example` as `.env` and populate the values before running services
- **API Keys Required:**
  - YouTube API Key (for video metadata)
  - Spoonacular API Key (for recipe data)
- **Optional:** OpenAI API Key (only for AI pose analysis feature - app works without it)

## Quick Start (5 minutes)
1. Duplicate `.env.example` to `.env` and update any secrets:
   ```bash
   cp .env.example .env
   ```
   Required keys:
   - `YOUTUBE_API_KEY` - For video metadata
   - `SPOONACULAR_API_KEY` - For recipe data

   Optional (for AI features):
   - `OPENAI_API_KEY` - For AI pose analysis (optional - app works without it)
   
2. Build the Spring Boot artifacts for the first time:
   ```bash
   ./gradlew clean build
   ```
3. Start the stack:
   ```bash
   docker compose up --build
   ```
4. Verify health:
   - API Health: http://localhost:8080/actuator/health
   - PostgreSQL: `psql postgresql://fitnessuser:dev_password@localhost:5432/fitness_mvp`
   - Redis: `redis-cli -h localhost -p 6379 ping`

5. The application seeds a starter content library on boot (120 workout cards + 60 recipes).
   - Set `APP_SEED_ENABLED=false` if you want to skip seeding (e.g., when restoring from a dump).

6. **Test AI Pose Analysis**:
   ```bash
   ./test-pose-analysis.sh
   ```

### Additional Documentation
- [docs/api-key-provisioning.md](docs/api-key-provisioning.md) – mint tenant-bound API keys for mobile clients.
- [docs/nutrition-cache-usage.md](docs/nutrition-cache-usage.md) – use the shared nutrition advice cache across services.
- **Saved Library Sorting Quick Reference** – the `/api/v1/workouts|recipes/saved` endpoints accept a comma-delimited `sort` parameter. Examples:
  ```bash
  # Most recent first (default)
  curl -H "X-API-Key: ..." "http://localhost:8080/api/v1/workouts/saved"

  # Sort by workout duration then fallback to savedAt
  curl -H "X-API-Key: ..." "http://localhost:8080/api/v1/workouts/saved?sort=duration,asc"

  # Sort recipes by prep time with newest first as tiebreaker
  curl -H "X-API-Key: ..." "http://localhost:8080/api/v1/recipes/saved?sort=time,desc"
  ```
  Supported fields:
  - Workouts: `savedAt` (default), `duration`
  - Recipes: `savedAt` (default), `time`, `difficulty`
  Append `asc` or `desc` to control direction; unspecified direction defaults to `desc`.

### Mobile Builds (Expo / EAS)
The React Native client lives in `fitness-mvp/` and expects the following env vars in `fitness-mvp/.env`:
```
API_BASE_URL=https://api.fitness-mvp.com
API_KEY=your_api_key
YOUTUBE_API_KEY=...
SPOONACULAR_API_KEY=...
OPENAI_API_KEY=...
```

Build + distribute:
```bash
cd fitness-mvp
npm install
npx expo prebuild --platform ios,android   # once, if you need native projects
npx expo start --clear                     # local smoke with Expo Go

# EAS cloud builds (requires `eas login`)
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview

# To submit to stores later
npx eas submit --platform ios --profile production
npx eas submit --platform android --profile production
```
Profiles live in `fitness-mvp/eas.json`; use `preview` for internal QA and `production` for client-ready artifacts.

### API Keys for Local Development

- Provision user-scoped API keys so the React Native app can call `/api/v1/me`:
  see [docs/api-key-provisioning.md](docs/api-key-provisioning.md) for the
  workflow and helper script.
- After generating a key, populate `fitness-mvp/.env` with `API_KEY=<value>` and
  restart the Expo bundle.

## 🚀 New: AI Pose Analysis

Upload workout photos or videos to get instant AI feedback:

```bash
curl -X POST http://localhost:8080/api/v1/pose/analyze \
  -H "X-API-Key: your-api-key" \
  -F "file=@squat-video.mp4" \
  -F 'data={"userId":"550e8400-e29b-41d4-a716-446655440000","exerciseType":"squat"}'
```

**Endpoints**:
- `POST /api/v1/pose/analyze` - Analyze workout form
- `GET /api/v1/pose/history/{userId}` - Get training history
- `GET /api/v1/pose/progress/{userId}` - Get progress stats
- `GET /api/v1/gamification/leaderboard/meal-logs?scope=weekly&limit=10` - Meal logging leaderboard (cached, MD3-aligned)

See full documentation: [docs/ai-pose-analysis-implementation-guide.md](docs/ai-pose-analysis-implementation-guide.md)

## Project Structure
- `docker-compose.yml` – Docker services for PostgreSQL, Redis, and the Spring Boot app
- `.env.example` – Template for environment-specific secrets and connection strings
- `src/main/resources/application.yml` – Spring profiles (`dev` and `prod`) and shared configuration
- `src/main/resources/db/migration` – Flyway migration scripts (created in later steps)
- `src/main/java/com/fitnessapp/backend` – Spring Boot source code

## Testing
Run the unit tests at any time with:
```bash
./gradlew test
```

Flyway migrations can be executed manually using:
```bash
./gradlew flywayMigrate
```

## API Keys

### Required Keys

**YouTube API Key**
The YouTube Data API v3 key **must not** be committed. Store it in your secrets manager of choice (1Password or AWS Secrets Manager) and inject it via the `YOUTUBE_API_KEY` environment variable.

**Spoonacular API Key**
Required for recipe data. Store securely and inject via `SPOONACULAR_API_KEY` environment variable.

### Optional Keys

**OpenAI API Key (OPTIONAL)**
Only needed if you want AI-powered features (pose analysis, recipe generation, nutrition insights).
The app works perfectly without OpenAI - all core features (workouts, recipes, user library) are available.

If you want AI features, get your key from: https://platform.openai.com/api-keys
Set `OPENAI_ENABLED=true` and `OPENAI_API_KEY=your-key` in your `.env` file.

## Troubleshooting
- If `docker compose up` fails on the `app` service because dependencies are unavailable, rerun once the database and Redis containers report healthy.
- To apply database changes quickly in development, stop the stack, run `docker compose down -v` to drop volumes, and start again.

## Useful Commands
| Purpose | Command |
|---|---|
| Build Spring Boot jar | `./gradlew build` |
| Start services | `docker compose up --build` |
| Stop services | `docker compose down` |
| Run migrations | `./gradlew flywayMigrate` |
| Format code (Spotless to be added) | _coming soon_ |

## 🚀 Deploy to AWS

Ready to deploy to production? We have complete deployment guides for AWS:

### AWS EC2 Deployment (Recommended for Getting Started)
**Deploy in 30 minutes with automated scripts!**

- **Cost:** ~$65/month
- **Complexity:** Low (fully automated)
- **Best for:** MVP, development, small-scale production

[**→ Quick Start Guide**](AWS-EC2-DEPLOYMENT-SUMMARY.md)

**Deploy in 3 commands:**
```bash
cd aws/
cp .env.deploy.example .env.deploy
nano .env.deploy  # Add your API keys

./deploy-ec2.sh setup    # 15 min - creates infrastructure
./deploy-ec2.sh deploy   # 10 min - deploys application
```

### AWS ECS Fargate (Production Grade)
**For enterprise applications with auto-scaling**

- **Cost:** ~$90/month
- **Complexity:** Medium
- **Best for:** Production, high availability, auto-scaling

[**→ ECS Deployment Guide**](aws/AWS-DEPLOYMENT-GUIDE.md)

### Compare Options
[**→ EC2 vs ECS Fargate Comparison**](aws/DEPLOYMENT-COMPARISON.md)

---

### Deployment Documentation

| Guide | Purpose | Time |
|-------|---------|------|
| [AWS-EC2-DEPLOYMENT-SUMMARY.md](AWS-EC2-DEPLOYMENT-SUMMARY.md) | Complete EC2 overview | Start here |
| [aws/EC2-QUICKSTART.md](aws/EC2-QUICKSTART.md) | 30-minute quick start | Quick deploy |
| [aws/EC2-DEPLOYMENT-GUIDE.md](aws/EC2-DEPLOYMENT-GUIDE.md) | Comprehensive EC2 guide | Full details |
| [aws/DEPLOYMENT-COMPARISON.md](aws/DEPLOYMENT-COMPARISON.md) | EC2 vs Fargate | Compare options |
| [aws/README.md](aws/README.md) | AWS overview | Main guide |
