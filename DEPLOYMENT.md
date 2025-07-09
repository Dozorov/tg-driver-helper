# Deployment Guide

This guide will help you deploy the Telegram Driver Helper Bot to various platforms.

## 🚀 Quick Start

### 1. Local Development

```bash
# Clone the repository
git clone <repository-url>
cd tg-driver-helper

# Run setup script
npm run setup

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f driver-bot

# Stop services
docker-compose down
```

## ☁️ Cloud Deployment Options

### Option 1: Railway

1. **Connect Repository**
   - Go to [Railway](https://railway.app)
   - Connect your GitHub repository
   - Select the repository

2. **Configure Environment Variables**
   - Go to Variables tab
   - Add all required environment variables from `.env`

3. **Deploy**
   - Railway will automatically detect the Node.js app
   - Deploy and get your public URL

4. **Set Webhook** (Optional)
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://your-railway-app.railway.app/webhook"}'
   ```

### Option 2: Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Create Heroku App**
   ```bash
   heroku create your-driver-bot
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set TELEGRAM_BOT_TOKEN=your_token
   heroku config:set OPENAI_API_KEY=your_key
   # ... set all other variables
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 3: Digital Ocean App Platform

1. **Create App**
   - Go to Digital Ocean App Platform
   - Connect your GitHub repository
   - Select Node.js as the environment

2. **Configure Environment**
   - Add all environment variables
   - Set build command: `npm run build`
   - Set run command: `npm start`

3. **Deploy**
   - Deploy the app
   - Get your public URL

### Option 4: VPS Deployment

1. **Set up VPS**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PM2
   sudo npm install -g pm2
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd tg-driver-helper

   # Install dependencies
   npm install

   # Build application
   npm run build

   # Start with PM2
   pm2 start dist/index.js --name "driver-bot"
   pm2 startup
   pm2 save
   ```

3. **Set up Nginx** (Optional)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔧 Required Services Setup

### 1. Telegram Bot Setup

1. **Create Bot**
   - Message @BotFather on Telegram
   - Send `/newbot`
   - Follow instructions to create bot
   - Save the bot token

2. **Get HR Group ID**
   - Add bot to HR group
   - Send a message in the group
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find the `chat.id` for your group

### 2. Supabase Setup

1. **Create Project**
   - Go to [Supabase](https://supabase.com)
   - Create new project
   - Wait for setup to complete

2. **Set up Database**
   - Go to SQL Editor
   - Run the schema from `database/schema.sql`
   - Copy project URL and keys

3. **Configure RLS**
   - Enable Row Level Security
   - Set up policies as defined in schema

### 3. Digital Ocean Spaces Setup

1. **Create Space**
   - Go to Digital Ocean Spaces
   - Create new space
   - Choose region close to your users

2. **Generate Keys**
   - Go to API section
   - Generate new access key
   - Save key and secret

3. **Configure CORS**
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### 4. OpenAI Setup

1. **Create Account**
   - Go to [OpenAI](https://openai.com)
   - Create account and add billing
   - Generate API key

2. **Configure Usage**
   - Set up usage limits
   - Monitor API usage

## 🔐 Security Considerations

### Environment Variables
- Never commit `.env` files
- Use secure secret management
- Rotate keys regularly

### Database Security
- Use strong passwords
- Enable SSL connections
- Set up proper RLS policies

### File Storage
- Use private buckets when possible
- Set up proper CORS policies
- Monitor access logs

### Bot Security
- Keep bot token secret
- Monitor bot usage
- Set up rate limiting

## 📊 Monitoring & Logging

### Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs driver-bot

# Restart application
pm2 restart driver-bot
```

### Health Checks
- Monitor `/health` endpoint
- Set up uptime monitoring
- Configure alerting

### Log Management
- Use structured logging
- Set up log aggregation
- Monitor error rates

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@v1.0.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: driver-bot
```

## 🚨 Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check bot token
   - Verify webhook configuration
   - Check server logs

2. **Database connection issues**
   - Verify Supabase credentials
   - Check network connectivity
   - Validate database schema

3. **File upload failures**
   - Check Digital Ocean Spaces credentials
   - Verify bucket permissions
   - Check file size limits

4. **AI analysis errors**
   - Verify OpenAI API key
   - Check API quota
   - Validate image format

### Debug Commands
```bash
# Check application status
curl http://localhost:3000/health

# View application logs
pm2 logs driver-bot --lines 100

# Restart application
pm2 restart driver-bot

# Check environment variables
pm2 env driver-bot
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancers
- Implement session sharing
- Set up database clustering

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Use caching strategies

### Performance Optimization
- Implement connection pooling
- Use CDN for static assets
- Optimize image processing

## 🔄 Backup Strategy

### Database Backups
- Set up automated Supabase backups
- Test restore procedures
- Monitor backup health

### File Storage Backups
- Replicate files across regions
- Set up versioning
- Test recovery procedures

### Application Backups
- Version control all code
- Document configuration
- Maintain deployment scripts

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Verify all service configurations
4. Contact support team

## 🔄 Updates

Keep your deployment updated:
1. Monitor for security updates
2. Update dependencies regularly
3. Test updates in staging
4. Plan maintenance windows 