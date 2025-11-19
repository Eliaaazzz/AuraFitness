# Quick Start Guide (Without OpenAI)

**Your fitness app is now ready to run without OpenAI!**

---

## What You Need

### Required API Keys (2 only)

1. **YouTube Data API v3 Key** (FREE)
   - Get it: https://console.cloud.google.com/apis/credentials
   - Free quota: 10,000 requests/day
   - Used for: Video metadata and workout videos

2. **Spoonacular Food API Key** (FREE tier available)
   - Get it: https://spoonacular.com/food-api
   - Free quota: 150 requests/day
   - Used for: Recipe data and nutrition info

### NOT Required

❌ OpenAI API Key - **REMOVED** (app works without it!)

---

## Option 1: Local Development (5 minutes)

### Step 1: Get API Keys

1. Get YouTube API key:
   - Go to https://console.cloud.google.com/apis/credentials
   - Create project → Enable YouTube Data API v3 → Create credentials
   - Copy API key

2. Get Spoonacular API key:
   - Go to https://spoonacular.com/food-api
   - Sign up → Go to dashboard → Copy API key

### Step 2: Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit the file
nano .env
# or use your preferred editor
```

Add your API keys:
```bash
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX
SPOONACULAR_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Leave these commented (OpenAI not needed):
# OPENAI_ENABLED=false
# OPENAI_API_KEY=
```

### Step 3: Build and Run

```bash
# Build the application
./gradlew clean build

# Start with Docker Compose
docker-compose up --build
```

### Step 4: Verify It Works

```bash
# Check health endpoint
curl http://localhost:8080/actuator/health

# Should return:
# {"status":"UP"}

# Check workouts endpoint
curl http://localhost:8080/api/v1/workouts

# Check recipes endpoint
curl http://localhost:8080/api/v1/recipes
```

### Access the Application

- API: http://localhost:8080
- Health: http://localhost:8080/actuator/health
- API Docs: http://localhost:8080/swagger-ui.html

**✅ Done! Your app is running without OpenAI!**

---

## Option 2: AWS EC2 Deployment (30 minutes)

### Step 1: Get API Keys

Same as Option 1 above (YouTube + Spoonacular only)

### Step 2: Configure Deployment

```bash
cd aws/

# Copy example configuration
cp .env.deploy.example .env.deploy

# Edit configuration
nano .env.deploy
```

Add your API keys:
```bash
# Required
YOUTUBE_API_KEY=your_youtube_key_here
SPOONACULAR_API_KEY=your_spoonacular_key_here

# Leave OpenAI commented (not needed):
# OPENAI_ENABLED=false
# OPENAI_API_KEY=
```

### Step 3: Deploy Infrastructure

```bash
# This creates VPC, RDS, Redis, EC2
./deploy-ec2.sh setup

# Takes 15-20 minutes
# You'll see: "⚠️ OpenAI API key not provided - AI features will be disabled"
# This is NORMAL and EXPECTED!

# Save the credentials displayed at the end
```

### Step 4: Deploy Application

```bash
# This builds and deploys your app
./deploy-ec2.sh deploy

# Takes 10-15 minutes
```

### Step 5: Verify Deployment

```bash
# Check health (replace <EC2_IP> with your EC2 public IP)
curl http://<EC2_IP>:8080/actuator/health

# Should return:
# {"status":"UP"}

# View logs
./deploy-ec2.sh logs

# Should see: "⚠️ OpenAI features DISABLED - AI features not available"
# This is NORMAL - your app is working!
```

**✅ Done! Your app is deployed on AWS without OpenAI!**

---

## What to Expect

### Startup Logs (NORMAL)

When you start the application, you'll see:

```
⚠️  OpenAI features DISABLED - AI features not available
   Core features still available:
   ✓ Workout library
   ✓ Recipe library
   ✓ User profiles
   ✓ YouTube integration
   ✓ Meal tracking
   To enable AI features, set OPENAI_ENABLED=true and provide OPENAI_API_KEY
```

**This is completely normal and expected!**

### Features That Work

✅ **All core features work perfectly:**
- Workout library (browse, search, filter, save)
- Recipe library (browse, search, filter, save)
- User profiles and settings
- YouTube video integration
- Meal logging and tracking
- Nutrition summaries
- API key management
- Gamification features

### Features That Don't Work (Optional AI Features)

❌ These features will return an error (expected):
- AI Pose Analysis (requires OpenAI)
- AI Recipe Generation (requires OpenAI)
- AI Nutrition Insights (requires OpenAI)

**These are optional features. Your app is fully functional without them.**

---

## Troubleshooting

### Issue: Application won't start

**Check logs:**
```bash
# Local
docker-compose logs app

# AWS
./deploy-ec2.sh logs
```

**Common fixes:**
1. Verify YouTube API key is correct
2. Verify Spoonacular API key is correct
3. Check database is running
4. Check Redis is running

### Issue: "API key not configured" error

**Solution:**
- Make sure you added YouTube and Spoonacular keys to `.env`
- Restart the application
- OpenAI key is NOT needed - ignore any OpenAI-related errors for AI endpoints

### Issue: Spoonacular rate limit

**Solution:**
- Free tier: 150 requests/day may be limiting
- Upgrade to paid plan, or
- Use less aggressive recipe searches, or
- Wait for quota to reset (next day)

---

## Cost Breakdown

### Local Development

**Cost: $0/month**
- Everything runs on your computer
- No cloud costs
- Only API call quotas matter

### AWS Deployment (Without OpenAI)

**Cost: ~$65/month**
- EC2: $30/month
- RDS: $18/month
- Redis: $13/month
- Other: $4/month

**Previously (with OpenAI): $75-115/month**
**Savings: $10-50/month by removing OpenAI**

---

## Next Steps

### 1. Test Core Features

```bash
# Test workouts
curl http://localhost:8080/api/v1/workouts

# Test recipes
curl http://localhost:8080/api/v1/recipes

# Test health
curl http://localhost:8080/actuator/health
```

### 2. Generate API Keys for Mobile App

```bash
# SSH into your server (if using AWS)
# Or run locally

# Create API key for a user
curl -X POST http://localhost:8080/admin/api-keys \
  -H "Content-Type: application/json" \
  -d '{"userId":"your-user-id","description":"Mobile app key"}'
```

### 3. Connect Mobile App

Update your mobile app `.env`:
```bash
API_BASE_URL=http://<YOUR_EC2_IP>:8080
# or http://localhost:8080 for local
```

### 4. (Optional) Add Custom Domain

See: [aws/EC2-DEPLOYMENT-GUIDE.md - Phase 6](aws/EC2-DEPLOYMENT-GUIDE.md#phase-6-domain--ssl-configuration)

---

## Documentation

- **Main README:** [README.md](README.md)
- **API Keys Guide:** [API-KEYS-GUIDE.md](API-KEYS-GUIDE.md)
- **Changes Summary:** [OPENAI-REMOVED-SUMMARY.md](OPENAI-REMOVED-SUMMARY.md)
- **AWS Quick Start:** [aws/EC2-QUICKSTART.md](aws/EC2-QUICKSTART.md)
- **AWS Full Guide:** [aws/EC2-DEPLOYMENT-GUIDE.md](aws/EC2-DEPLOYMENT-GUIDE.md)

---

## FAQ

**Q: Do I really not need OpenAI?**
A: Correct! Your app works 100% without OpenAI. Only AI features require it.

**Q: What if I want AI features later?**
A: Easy! Just add `OPENAI_ENABLED=true` and `OPENAI_API_KEY` to your `.env`, then restart.

**Q: Will my users notice AI features are missing?**
A: Only if they try to use pose analysis, AI recipe generation, or AI nutrition insights. All other features work normally.

**Q: Can I use the free tiers forever?**
A: YouTube free tier is generous (10,000 requests/day). Spoonacular free tier (150 requests/day) may be limiting for production.

**Q: How do I know it's working?**
A: If the health endpoint returns `{"status":"UP"}`, you're good!

---

## Support

- **GitHub Issues:** Report problems or ask questions
- **Documentation:** See files listed above
- **Logs:** Use `docker-compose logs` or `./deploy-ec2.sh logs`

---

**Ready to start? Follow Option 1 or Option 2 above!** 🚀
