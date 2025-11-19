# API Keys Guide for Camera First Fitness

## Required API Keys

You need these API keys for the application to function:

### 1. YouTube Data API v3 Key

**What it's for:** Fetching video metadata and workout videos
**Required:** YES
**Free tier:** 10,000 quota units per day (sufficient for most use cases)

**How to get:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "API Key"
5. Enable "YouTube Data API v3" in the API Library
6. Copy your API key

**Add to .env:**
```bash
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

### 2. Spoonacular Food API Key

**What it's for:** Recipe data, nutritional information, meal planning
**Required:** YES
**Free tier:** 150 requests/day (can be limiting for active development)

**How to get:**
1. Go to [Spoonacular Food API](https://spoonacular.com/food-api)
2. Click "Get Access" or "Start Now"
3. Create an account
4. Choose a plan (free tier available)
5. Copy your API key from the dashboard

**Add to .env:**
```bash
SPOONACULAR_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Optional API Keys

### 3. OpenAI API Key (NOT REQUIRED)

**What it's for:** AI-powered features (pose analysis, recipe generation, nutrition insights)
**Required:** NO - App works perfectly without it
**Cost:** Pay-per-use (GPT-4: ~$0.01-0.03 per request)

**Note:** OpenAI features are completely optional. The core application features work without OpenAI:
- ✅ Workout library and browsing
- ✅ Recipe library and search
- ✅ User profile and library
- ✅ YouTube video integration
- ✅ Meal logging and tracking
- ✅ Nutrition summaries
- ❌ AI pose analysis (requires OpenAI)
- ❌ AI recipe generation (requires OpenAI)
- ❌ AI nutrition insights (requires OpenAI)

**How to get (if you want AI features):**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account
3. Add payment method (requires billing)
4. Navigate to API Keys section
5. Create new secret key
6. Copy the key (you won't see it again)

**Add to .env (optional):**
```bash
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**If you don't want AI features, leave OpenAI commented out or disabled:**
```bash
# OPENAI_ENABLED=false
# OPENAI_API_KEY=
```

---

## Quick Start Configuration

### For Local Development

Copy `.env.example` to `.env` and fill in:

```bash
# Required
YOUTUBE_API_KEY=your_youtube_key_here
SPOONACULAR_API_KEY=your_spoonacular_key_here

# Optional (leave commented to disable AI features)
# OPENAI_ENABLED=true
# OPENAI_API_KEY=your_openai_key_here
```

### For AWS Deployment

Edit `aws/.env.deploy`:

```bash
# Required
YOUTUBE_API_KEY=your_youtube_key_here
SPOONACULAR_API_KEY=your_spoonacular_key_here

# Optional (leave commented to disable AI features)
# OPENAI_ENABLED=true
# OPENAI_API_KEY=your_openai_key_here
```

---

## Cost Comparison

| API Service | Free Tier | Paid Plans | Required? |
|-------------|-----------|------------|-----------|
| **YouTube Data API** | 10,000 units/day (free forever) | N/A | YES |
| **Spoonacular** | 150 requests/day | $0-$150/month | YES |
| **OpenAI GPT-4** | No free tier | $0.01-0.03 per request | NO |

**Estimated Monthly Costs:**
- **Without OpenAI:** $0 (if within free tiers)
- **With OpenAI:** $10-50/month (depending on usage)

---

## Security Best Practices

### Never Commit API Keys

Add to `.gitignore`:
```
.env
.env.local
.env.*.local
aws/.env.deploy
```

### Use Environment Variables

**Local development:**
```bash
# .env file (not committed)
YOUTUBE_API_KEY=xxx
SPOONACULAR_API_KEY=xxx
```

**AWS deployment:**
- Use AWS Secrets Manager (production)
- Or environment variables in ECS/EC2

### Rotate Keys Regularly

Recommended schedule:
- YouTube API key: Every 90 days
- Spoonacular API key: Every 90 days
- OpenAI API key: Every 30-60 days (if used)

---

## Troubleshooting

### YouTube API Quota Exceeded

**Error:** `quotaExceeded` or 429 status code

**Solutions:**
1. Check quota usage in Google Cloud Console
2. Request quota increase (usually approved automatically)
3. Implement caching to reduce API calls
4. Use multiple API keys (rotate)

### Spoonacular Rate Limiting

**Error:** 402 Payment Required or rate limit errors

**Solutions:**
1. Upgrade to paid plan
2. Implement aggressive caching
3. Reduce recipe search frequency
4. Use Redis cache (already implemented)

### OpenAI API Errors (If Enabled)

**Error:** `invalid_api_key` or 401 status code

**Solutions:**
1. Verify API key is correct
2. Check billing is set up
3. Ensure `OPENAI_ENABLED=true` is set
4. Check account has GPT-4 access

**To disable OpenAI features:**
```bash
# In .env or .env.deploy
OPENAI_ENABLED=false
# or just comment out OPENAI_API_KEY
```

---

## FAQ

**Q: Can I run the app without any API keys?**
A: No. You need at least YouTube and Spoonacular keys for core functionality.

**Q: Is OpenAI required?**
A: No. OpenAI is completely optional. The app works great without it.

**Q: What happens if I don't provide an OpenAI key?**
A: AI features (pose analysis, AI recipe generation, nutrition insights) will be disabled. All other features work normally.

**Q: Can I use the free tiers for production?**
A: YouTube free tier is usually sufficient. Spoonacular free tier (150 requests/day) may be too limited for production with multiple users.

**Q: How do I know if my API keys are working?**
A: Check application logs after startup:
```bash
# Local
docker-compose logs app | grep -i "api\|openai\|youtube\|spoonacular"

# AWS
./deploy-ec2.sh logs | grep -i "api\|openai"
```

**Q: I forgot to add my API keys. Can I add them later?**
A: Yes! Update your `.env` file and restart:
```bash
# Local
docker-compose restart app

# AWS
./deploy-ec2.sh update
```

---

## Next Steps

1. **Get your API keys** from YouTube and Spoonacular
2. **Update .env file** with your keys
3. **Start the application**: `docker-compose up`
4. **Verify everything works**: Check health endpoint and logs
5. **(Optional)** Add OpenAI key later if you want AI features

---

**Ready to deploy?**

- **Local development:** See [README.md](README.md)
- **AWS EC2 deployment:** See [aws/EC2-QUICKSTART.md](aws/EC2-QUICKSTART.md)
