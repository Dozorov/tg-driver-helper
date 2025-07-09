# Telegram Driver Helper Bot

A comprehensive Telegram bot for driver onboarding and management with AI-powered document analysis, built with Node.js, TypeScript, Supabase, and Digital Ocean Spaces.

## 🚀 Features

### Driver Onboarding
- **Step-by-step onboarding process** with guided prompts
- **Document collection**: CDL, DOT Medical Certificate, Driver Photo
- **AI-powered document analysis** using OpenAI GPT-4 Vision
- **Automatic data extraction** from uploaded documents
- **HR notification system** for review and approval

### Driver Management
- **Status tracking**: Pending, Active, Inactive, Suspended
- **Profile management** with all driver information
- **Document expiry tracking** and notifications

### Request System
- **Advance payment requests** with amount and reason
- **Vacation requests** with date range and reason
- **Automatic routing** to appropriate departments
- **Status tracking** for all requests

### AI Integration
- **Document analysis** for CDL and DOT Medical Certificates
- **Data validation** and confidence scoring
- **Automatic information extraction** from uploaded documents

### Storage & Database
- **Supabase PostgreSQL** for data storage
- **Digital Ocean Spaces** (S3-compatible) for file storage
- **Secure document management** with public URLs

## 🛠️ Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Bot Framework**: Telegraf
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Digital Ocean Spaces (S3-compatible)
- **AI**: OpenAI GPT-4 Vision
- **Validation**: Joi
- **Security**: Helmet, CORS

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Telegram Bot Token (from @BotFather)
- OpenAI API Key
- Supabase Account
- Digital Ocean Spaces Account

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tg-driver-helper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   TELEGRAM_HR_GROUP_ID=your_hr_group_chat_id_here

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Supabase Configuration
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

   # Digital Ocean Spaces (S3) Configuration
   DO_SPACES_ENDPOINT=your_do_spaces_endpoint_here
   DO_SPACES_KEY=your_do_spaces_access_key_here
   DO_SPACES_SECRET=your_do_spaces_secret_key_here
   DO_SPACES_BUCKET=your_bucket_name_here
   DO_SPACES_REGION=your_region_here

   # Application Configuration
   NODE_ENV=development
   PORT=3000
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the application**
   ```bash
   npm start
   ```

## 🔧 Development

```bash
# Run in development mode with hot reload
npm run dev

# Run with nodemon for auto-restart
npm run watch
```

## 📊 Database Schema

### Drivers Table
```sql
CREATE TABLE drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  cdl_number TEXT,
  cdl_expiry_date DATE,
  dot_medical_certificate TEXT,
  dot_medical_expiry_date DATE,
  driver_photo_url TEXT,
  status TEXT DEFAULT 'pending',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Advance Payment Requests
```sql
CREATE TABLE advance_payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Vacation Requests
```sql
CREATE TABLE vacation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🤖 Bot Commands

### For Drivers
- `/start` - Start onboarding or show main menu
- `/request_advance` - Request advance payment
- `/request_vacation` - Request vacation
- `/status` - Check your status
- `/help` - Show help message

### For HR (Admin Commands)
- `/approve_[driver_id]` - Approve driver application
- `/reject_[driver_id]` - Reject driver application

## 🔄 Onboarding Flow

1. **Driver starts bot** with `/start`
2. **Collects basic information**:
   - Full name
   - Phone number
   - CDL number and expiry
   - DOT Medical Certificate and expiry
3. **Uploads documents**:
   - Driver photo
   - CDL document
   - DOT Medical Certificate
4. **AI analysis** of uploaded documents
5. **HR notification** with all information
6. **HR approval/rejection** process
7. **Driver status update** and notification

## 🔐 Security Features

- **Environment variable validation**
- **Input sanitization** and validation
- **Secure file uploads** with content type validation
- **CORS protection**
- **Helmet security headers**
- **Graceful error handling**

## 📁 Project Structure

```
src/
├── config/
│   ├── database.ts      # Supabase configuration
│   └── storage.ts       # Digital Ocean Spaces configuration
├── services/
│   ├── ai.ts           # OpenAI integration
│   └── telegram.ts     # Telegram bot logic
├── types/
│   └── index.ts        # TypeScript type definitions
└── index.ts            # Main application entry point
```

## 🚀 Deployment

### Environment Setup
1. Set up a production server (VPS, Heroku, Railway, etc.)
2. Configure environment variables
3. Set up SSL certificate for HTTPS
4. Configure webhook URL for Telegram bot

### Database Setup
1. Create Supabase project
2. Run database migrations
3. Configure RLS (Row Level Security) policies
4. Set up backup strategy

### File Storage Setup
1. Create Digital Ocean Spaces bucket
2. Configure CORS policies
3. Set up access keys
4. Test file upload/download

## 🔧 Configuration

### Telegram Bot Setup
1. Create bot with @BotFather
2. Get bot token
3. Add bot to HR group
4. Get group chat ID
5. Configure webhook (optional)

### OpenAI Setup
1. Create OpenAI account
2. Generate API key
3. Configure billing
4. Test API access

### Supabase Setup
1. Create Supabase project
2. Get project URL and keys
3. Configure database schema
4. Set up authentication (if needed)

### Digital Ocean Spaces Setup
1. Create Spaces bucket
2. Generate access keys
3. Configure CORS
4. Test file operations

## 📝 API Endpoints

### Health Check
- `GET /health` - Application health status

## 🐛 Troubleshooting

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates

Stay updated with the latest features and bug fixes by:
- Following the repository
- Checking release notes
- Monitoring the changelog 