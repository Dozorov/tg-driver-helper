import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { dbOperations } from '../config/database';
import { storageService } from '../config/storage';
import { aiService } from './ai';
import { Driver, DriverStatus, RequestStatus } from '../types';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set!');
}
console.log('Using TELEGRAM_BOT_TOKEN of length:', token.length);
const bot = new Telegraf(token);

export const telegramService = {
  bot,

  // Helper methods for date validation
  isValidDateFormat(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
  },

  isDateExpired(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    return date < today;
  },

  // Initialize bot commands and handlers
  initialize() {
    this.setupCommands();
    this.setupOnboardingHandlers();
    this.setupRequestHandlers();
    this.setupAdminHandlers();
  },

  setupCommands() {
    console.log('🔧 Setting up commands...');
    bot.command('start', async (ctx) => {
      console.log('🚀 /start command received');
      try {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;

        console.log(`Processing /start command from user ${telegramId}`);
        
        // Try to get existing driver, but don't fail if database is not available
        let existingDriver = null;
        try {
          existingDriver = await dbOperations.getDriverByTelegramId(telegramId);
        } catch (dbError) {
          console.log('Database not available, starting fresh onboarding');
        }
        
        if (existingDriver) {
          if (existingDriver.onboarding_completed) {
            await this.showMainMenu(ctx);
          } else {
            await this.continueOnboarding(ctx, existingDriver);
          }
        } else {
          await this.startOnboarding(ctx);
        }
      } catch (error) {
        console.error('Error in /start command:', error);
        await ctx.reply('❌ Sorry, there was an error. Please try again.');
      }
    });

    bot.command('help', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      // Check if user is in HR group
      const hrGroupId = process.env.TELEGRAM_HR_GROUP_ID;
      const isHR = hrGroupId && ctx.chat?.id.toString() === hrGroupId;

      if (isHR) {
        await ctx.reply(
          '🚛 Driver Helper Bot - HR Commands\n\n' +
          'Available commands:\n' +
          '/list_drivers - List all drivers\n' +
          '/message [driver_id] - Send message to specific driver\n' +
          '/approve [driver_id] - Approve driver application\n' +
          '/reject [driver_id] - Reject driver application\n' +
          '/help - Show this help message'
        );
      } else {
        await ctx.reply(
          '🚛 Driver Helper Bot\n\n' +
          'Available commands:\n' +
          '/start - Start onboarding or show main menu\n' +
          '/list_drivers - List all drivers (admin only)\n' +
          '/request_advance - Request advance payment\n' +
          '/request_vacation - Request vacation\n' +
          '/status - Check your status\n' +
          '/help - Show this help message'
        );
      }
    });

    bot.command('list_drivers', async (ctx) => {
      console.log('📋 /list_drivers command received');
      console.log('list_drivers command received from:', ctx.from?.id, 'in chat:', ctx.chat?.id);
      console.log('Command text:', ctx.message?.text);
      await this.listDriversForHR(ctx);
    });

    bot.command('test', async (ctx) => {
      console.log('🧪 /test command received');
      await ctx.reply('✅ Bot is working! Database connection test...');
      try {
        const result = await dbOperations.getAllDrivers();
        await ctx.reply(`✅ Database connected! Found ${result?.length || 0} drivers.`);
      } catch (error) {
        await ctx.reply(`❌ Database error: ${(error as Error).message}`);
      }
    });

    // HR communication commands
    bot.hears(/^\/message (\d+)$/, async (ctx) => {
      const match = ctx.message.text.match(/^\/message (\d+)$/);
      if (!match) return;
      ctx.message.text = `/message_${match[1]}`; // for compatibility with startHRMessage
      await this.startHRMessage(ctx);
    });
    bot.hears(/^\/approve (\d+)$/, async (ctx) => {
      const match = ctx.message.text.match(/^\/approve (\d+)$/);
      if (!match) return;
      ctx.message.text = `approve_${match[1]}`; // for compatibility with handleApproval
      await this.handleApproval(ctx, 'approve');
    });
    bot.hears(/^\/reject (\d+)$/, async (ctx) => {
      const match = ctx.message.text.match(/^\/reject (\d+)$/);
      if (!match) return;
      ctx.message.text = `reject_${match[1]}`; // for compatibility with handleApproval
      await this.handleApproval(ctx, 'reject');
    });

    // Handle inline button callbacks
    bot.action(/^message_(\d+)$/, async (ctx) => {
      console.log('🔘 Message button clicked for driver:', ctx.match[1]);
      const driverId = parseInt(ctx.match[1]);
      await this.startHRMessageFromButton(ctx, driverId);
    });

    bot.action(/^approve_(\d+)$/, async (ctx) => {
      console.log('🔘 Approve button clicked for driver:', ctx.match[1]);
      const driverId = parseInt(ctx.match[1]);
      await this.handleApprovalFromButton(ctx, 'approve', driverId);
    });

    bot.action(/^reject_(\d+)$/, async (ctx) => {
      console.log('🔘 Reject button clicked for driver:', ctx.match[1]);
      const driverId = parseInt(ctx.match[1]);
      await this.handleApprovalFromButton(ctx, 'reject', driverId);
    });

    // Handle driver button callbacks
    bot.action('message_hr', async (ctx) => {
      console.log('🔘 Driver clicked Message HR button');
      await this.startDriverMessage(ctx, 'hr');
      // Log after session creation
      const telegramId = ctx.from?.id;
      if (telegramId) {
        const session = await dbOperations.getUserSession(telegramId, 'driver_reply');
        console.log('  [DEBUG] Created driver_reply session:', session);
      }
    });

    bot.action('message_support', async (ctx) => {
      console.log('🔘 Driver clicked Contact Support button');
      await this.startDriverMessage(ctx, 'support');
    });

    bot.action('request_advance', async (ctx) => {
      console.log('🔘 Driver clicked Request Advance button');
      await this.startAdvancePaymentRequest(ctx);
    });

    bot.action('request_vacation', async (ctx) => {
      console.log('🔘 Driver clicked Request Vacation button');
      await this.startVacationRequest(ctx);
    });

    bot.action('check_status', async (ctx) => {
      console.log('🔘 Driver clicked Check Status button');
      await this.checkStatus(ctx);
    });

    bot.action('help', async (ctx) => {
      console.log('🔘 Driver clicked Help button');
      await this.showHelp(ctx);
    });

    bot.command('cancel', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      // Check for driver_reply session
      const driverReplySession = await dbOperations.getUserSession(telegramId, 'driver_reply');
      if (driverReplySession) {
        await dbOperations.deleteUserSession(telegramId, 'driver_reply');
        await ctx.reply('❌ Reply mode cancelled. You can now use the main menu.');
        return;
      }

      // Check for hr_message session
      const hrMessageSession = await dbOperations.getUserSession(telegramId, 'hr_message');
      if (hrMessageSession) {
        await dbOperations.deleteUserSession(telegramId, 'hr_message');
        await ctx.reply('❌ Message cancelled.');
        return;
      }

      // If no session found
      await ctx.reply('There is no active session to cancel.');
    });

    console.log('✅ Commands setup completed');
  },

  async startOnboarding(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    // Initialize session
    await dbOperations.createUserSession(telegramId, 'onboarding', 1, { telegram_id: telegramId });

    await ctx.reply(
      '🚛 Welcome to Driver Onboarding!\n\n' +
      'I\'ll help you complete your registration. Let\'s start with your basic information.\n\n' +
      'Please send me your full name (First Name Last Name):'
    );
  },

  async continueOnboarding(ctx: Context, driver: Driver) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    await dbOperations.updateUserSession(telegramId, 'onboarding', 1, { ...driver });

    await this.processOnboardingStep(ctx, driver);
  },

  async processOnboardingStep(ctx: Context, session: any) {
    // This method handles the current onboarding step
    // For now, we'll just continue with the next step
    await this.handleOnboardingText(ctx, session);
  },

  setupOnboardingHandlers() {
    // Remove the text handler from here since it will be handled in setupAdminHandlers
    bot.on(message('photo'), async (ctx, next) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return next();

      const session = await dbOperations.getUserSession(telegramId, 'onboarding');
      if (!session) return next();

      await this.handleOnboardingPhoto(ctx, session);
    });

    bot.on(message('document'), async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const session = await dbOperations.getUserSession(telegramId, 'onboarding');
      if (!session) return;

      await this.handleOnboardingDocument(ctx, session);
    });
  },

  async handleOnboardingText(ctx: Context, session: any) {
    if (!ctx.message || !('text' in ctx.message)) return;
    const text = ctx.message.text;
    if (!text) return;

    // Ensure session.data exists
    if (!session.data) {
      session.data = {};
    }

    switch (session.step) {
      case 1: // Full name
        session.data.full_name = text;
        session.step = 2;
        await ctx.reply('📱 Please send me your phone number:');
        break;

      case 2: // Phone number
        session.data.phone_number = text;
        session.step = 3;
        await ctx.reply(
          '📸 Please send me a clear photo of yourself for identification purposes:'
        );
        break;

      case 3: // CDL expiry date (after CDL photo uploaded)
        if (!this.isValidDateFormat(text)) {
          await ctx.reply('❌ Please enter the date in YYYY-MM-DD format (e.g., 2025-12-31):');
          return;
        }
        
        if (this.isDateExpired(text)) {
          await ctx.reply('❌ This CDL has expired. Please provide a valid, non-expired CDL:');
          return;
        }
        
        session.data.cdl_expiry_date = text;
        session.step = 4;
        await ctx.reply(
          '📅 Please send me your DOT Medical Certificate expiry date (YYYY-MM-DD format):'
        );
        break;

      case 5: // CDL expiry date (after CDL photo uploaded)
        if (!this.isValidDateFormat(text)) {
          await ctx.reply('❌ Please enter the date in YYYY-MM-DD format (e.g., 2025-12-31):');
          return;
        }
        
        if (this.isDateExpired(text)) {
          await ctx.reply('❌ This CDL has expired. Please provide a valid, non-expired CDL:');
          return;
        }
        
        session.data.cdl_expiry_date = text;
        session.step = 6;
        await ctx.reply(
          'Now please send me a photo of your DOT Medical Certificate:'
        );
        break;

      case 7: // DOT Medical expiry date (after DOT photo uploaded)
        if (!this.isValidDateFormat(text)) {
          await ctx.reply('❌ Please enter the date in YYYY-MM-DD format (e.g., 2025-12-31):');
          return;
        }
        
        if (this.isDateExpired(text)) {
          await ctx.reply('❌ This DOT Medical Certificate has expired. Please provide a valid, non-expired certificate:');
          return;
        }
        
        session.data.dot_medical_expiry_date = text;
        session.step = 8;
        await ctx.reply(
          '✅ All information collected! Processing your application...'
        );
        
        // Complete onboarding immediately
        await this.completeOnboarding(ctx, session);
        break;

      default:
        await ctx.reply('Please follow the onboarding process step by step.');
    }

    // Update session in database
    await dbOperations.updateUserSession(ctx.from!.id, 'onboarding', session.step, session.data);
  },

  async handleOnboardingPhoto(ctx: Context, session: any) {
    if (!ctx.message || !('photo' in ctx.message)) return;
    const photo = ctx.message.photo?.[ctx.message.photo.length - 1];
    if (!photo) return;

    try {
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      
      // Download and upload to storage
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      
      const driverId = session.data?.id || 'temp';

      if (session.step === 3) {
        // Driver photo
        const photoUrl = await storageService.uploadDriverDocument(
          buffer,
          driverId,
          'photo',
          'driver_photo.jpg'
        );

        session.data = session.data || {};
        session.data.driver_photo_url = photoUrl;
        session.step = 4;

        await ctx.reply(
          '✅ Driver photo uploaded successfully!\n\n' +
          'Now please send me a photo of your CDL (Commercial Driver License):'
        );
      } else if (session.step === 4) {
        // CDL photo
        const cdlPhotoUrl = await storageService.uploadDriverDocument(
          buffer,
          driverId,
          'cdl',
          'cdl_photo.jpg'
        );

        session.data = session.data || {};
        session.data.cdl_photo_url = cdlPhotoUrl;
        session.step = 5;

        await ctx.reply(
          '✅ CDL photo uploaded successfully!\n\n' +
          '📅 Please send me your CDL expiry date (YYYY-MM-DD format):'
        );
      } else if (session.step === 6) {
        // DOT Medical photo
        const dotPhotoUrl = await storageService.uploadDriverDocument(
          buffer,
          driverId,
          'dot_medical',
          'dot_medical_photo.jpg'
        );

        session.data = session.data || {};
        session.data.dot_medical_photo_url = dotPhotoUrl;
        session.step = 7;

        await ctx.reply(
          '✅ DOT Medical Certificate photo uploaded successfully!\n\n' +
          '📅 Please send me your DOT Medical Certificate expiry date (YYYY-MM-DD format):'
        );
      } else {
        await ctx.reply('Please send a photo when requested during the onboarding process.');
        return;
      }

      await dbOperations.updateUserSession(ctx.from!.id, 'onboarding', session.step, session.data);
    } catch (error) {
      console.error('Error handling photo:', error);
      await ctx.reply('❌ Error uploading photo. Please try again.');
    }
  },

  async handleOnboardingDocument(ctx: Context, session: any) {
    // Documents are now handled as photos, so we'll redirect users to send photos instead
    await ctx.reply('📸 Please send photos instead of documents. You can take a photo of your document using your camera.');
  },

  async completeOnboarding(ctx: Context, session: any) {
    try {
      // Create or update driver record
      let driver: Driver;
      
      if (session.data?.id) {
        driver = await dbOperations.updateDriver(session.data.id, {
          ...session.data,
          onboarding_completed: true,
          status: DriverStatus.PENDING
        }) as Driver;
      } else {
        driver = await dbOperations.createDriver({
          ...session.data,
          onboarding_completed: true,
          status: DriverStatus.PENDING
        }) as Driver;
      }

      // Send notification to HR group
      await this.notifyHRGroup(driver);

      await ctx.reply(
        '🎉 Onboarding completed successfully!\n\n' +
        'Your application has been submitted and is under review by our HR team.\n' +
        'You will be notified once your status is updated.\n\n' +
        'Use /help to see available commands.'
      );

      await dbOperations.deleteUserSession(ctx.from!.id, 'onboarding');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      await ctx.reply('❌ Error completing onboarding. Please contact support.');
    }
  },

  async notifyHRGroup(driver: Driver) {
    const hrGroupId = process.env.TELEGRAM_HR_GROUP_ID;
    if (!hrGroupId) return;

    const message = `
🚛 New Driver Onboarding Request

👤 Driver: ${driver.full_name}
📱 Phone: ${driver.phone_number}
📅 CDL Expiry: ${driver.cdl_expiry_date}
📅 DOT Medical Expiry: ${driver.dot_medical_expiry_date}

📸 Driver Photo: ${driver.driver_photo_url}
📄 CDL Photo: ${driver.cdl_photo_url}
🏥 DOT Medical Photo: ${driver.dot_medical_photo_url}

To approve: /approve ${driver.id}
To reject: /reject ${driver.id}
To message: /message ${driver.id}
    `;

    await bot.telegram.sendMessage(hrGroupId, message);
  },

  setupRequestHandlers() {
    bot.command('request_advance', async (ctx) => {
      await this.startAdvancePaymentRequest(ctx);
    });

    bot.command('request_vacation', async (ctx) => {
      await this.startVacationRequest(ctx);
    });

    bot.command('status', async (ctx) => {
      await this.checkStatus(ctx);
    });
  },

  async startAdvancePaymentRequest(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const driver = await dbOperations.getDriverByTelegramId(telegramId);
    if (!driver || driver.status !== DriverStatus.ACTIVE) {
      await ctx.reply('❌ You are not registered or not active. Please contact HR.');
      return;
    }

    await dbOperations.createUserSession(telegramId, 'advance_request', 1, { requestType: 'advance' });

    await ctx.reply('💰 Advance Payment Request\n\nPlease enter the amount you need:');
  },

  async startVacationRequest(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const driver = await dbOperations.getDriverByTelegramId(telegramId);
    if (!driver || driver.status !== DriverStatus.ACTIVE) {
      await ctx.reply('❌ You are not registered or not active. Please contact HR.');
      return;
    }

    await dbOperations.createUserSession(telegramId, 'vacation_request', 1, { requestType: 'vacation' });

    await ctx.reply('🏖️ Vacation Request\n\nPlease enter your vacation start date (YYYY-MM-DD):');
  },

  async checkStatus(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const driver = await dbOperations.getDriverByTelegramId(telegramId);
    if (!driver) {
      await ctx.reply('❌ You are not registered. Use /start to begin onboarding.');
      return;
    }

    const statusEmoji = {
      [DriverStatus.PENDING]: '⏳',
      [DriverStatus.ACTIVE]: '✅',
      [DriverStatus.INACTIVE]: '❌',
      [DriverStatus.SUSPENDED]: '⚠️'
    };

    await ctx.reply(
      `📊 Your Status\n\n` +
      `Status: ${statusEmoji[driver.status]} ${driver.status.toUpperCase()}\n` +
      `Name: ${driver.full_name}\n` +
      `Onboarding: ${driver.onboarding_completed ? '✅ Complete' : '❌ Incomplete'}`
    );
  },

  setupAdminHandlers() {
    bot.command(/^\/list_drivers$/, async (ctx) => {
      await this.listDriversForHR(ctx);
    });

    // Handler for persistent reply keyboard actions (move these up)
    bot.hears('💬 Message HR', async (ctx) => {
      await this.startDriverMessage(ctx, 'hr');
    });
    bot.hears('📊 View Status', async (ctx) => {
      await this.checkStatus(ctx);
    });
    bot.hears('📝 Update Profile', async (ctx) => {
      // Show sub-menu for profile update
      await ctx.reply('What would you like to update?', {
        reply_markup: {
          keyboard: [
            ['🚗 Driver License', '🏥 Medical Card'],
            ['⬅️ Back to Menu']
          ],
          resize_keyboard: true,
          one_time_keyboard: false,
        }
      });
    });
    bot.hears('🚗 Driver License', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      // Set session for profile update (driver license)
      await dbOperations.createUserSession(telegramId, 'profile_update', 1, { type: 'driver_license' });
      await ctx.reply('Please send a new photo of your Driver License or type /cancel to abort.');
    });
    bot.hears('🏥 Medical Card', async (ctx) => {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      // Set session for profile update (medical card)
      await dbOperations.createUserSession(telegramId, 'profile_update', 1, { type: 'medical_card' });
      await ctx.reply('Please send a new photo of your Medical Card or type /cancel to abort.');
    });
    bot.hears('⬅️ Back to Menu', async (ctx) => {
      await this.showMainMenu(ctx);
    });

    // Universal text message handler - handles all text messages with proper priority
    bot.on(message('text'), async (ctx) => {
      console.log('📨 Universal text handler called:', ctx.message.text);
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      // Check if message is a command (starts with /)
      if (ctx.message.text?.startsWith('/')) {
        console.log('🔧 Command detected, letting command handlers process it');
        // Let the command handlers deal with it
        return;
      }

      // Priority 1: Check if HR is in message mode
      const hrSession = await dbOperations.getUserSession(telegramId, 'hr_message');
      console.log('  HR session found:', hrSession);
      if (hrSession) {
        console.log('  Calling handleHRMessage...');
        await this.handleHRMessage(ctx, hrSession.data);
        return;
      }

      // Priority 2: Check if driver is in reply mode
      const driverSession = await dbOperations.getUserSession(telegramId, 'driver_reply');
      console.log('  Driver session found:', driverSession);
      if (driverSession) {
        console.log('  Calling handleDriverReply...');
        await this.handleDriverReply(ctx, driverSession.data);
        return;
      }

      // Priority 3: Check if user is in onboarding mode
      const onboardingSession = await dbOperations.getUserSession(telegramId, 'onboarding');
      console.log('  Onboarding session found:', onboardingSession);
      if (onboardingSession) {
        console.log('  Calling handleOnboardingText...');
        await this.handleOnboardingText(ctx, onboardingSession);
        return;
      }

      // Priority 4: Check if user is in profile update date mode
      const profileUpdateDateSession = await dbOperations.getUserSession(telegramId, 'profile_update_date');
      console.log('  Profile update date session found:', profileUpdateDateSession);
      if (profileUpdateDateSession) {
        console.log('  Processing profile update date...');
        const text = ctx.message.text;
        if (!text) return;
        // Validate date format
        if (!this.isValidDateFormat(text)) {
          await ctx.reply('❌ Please enter the date in YYYY-MM-DD format (e.g., 2025-12-31):');
          return;
        }
        if (this.isDateExpired(text)) {
          await ctx.reply('❌ This date is in the past. Please provide a valid, non-expired date:');
          return;
        }
        const driver = await dbOperations.getDriverByTelegramId(telegramId);
        if (!driver) {
          await ctx.reply('❌ You are not registered as a driver.');
          await dbOperations.deleteUserSession(telegramId, 'profile_update_date');
          return;
        }
        if (profileUpdateDateSession.data.type === 'driver_license') {
          await dbOperations.updateDriver(driver.id, { cdl_expiry_date: text });
          await ctx.reply('✅ Your Driver License expiration date has been updated!');
        } else if (profileUpdateDateSession.data.type === 'medical_card') {
          await dbOperations.updateDriver(driver.id, { dot_medical_expiry_date: text });
          await ctx.reply('✅ Your Medical Card expiration date has been updated!');
        }
        await dbOperations.deleteUserSession(telegramId, 'profile_update_date');
        await this.showMainMenu(ctx);
        return;
      }

      // No active session found
      console.log('❓ No active session found for user, sending default message');
      await ctx.reply('Please use /start to begin onboarding or /help for available commands.');
    });

    // Обработчик кнопки "Ответить водителю"
    bot.action(/^reply_driver_(\d+)$/, async (ctx) => {
      const match = ctx.match;
      if (!match || !match[1]) return;
      const driverId = parseInt(match[1]);
      await this.handleReplyToDriverFromHR(ctx, driverId);
    });

    // Catch-all for unknown commands (must be last)
    bot.on(message('text'), async (ctx) => {
      if (ctx.message.text?.startsWith('/')) {
        console.log('🔍 Unknown command received:', ctx.message.text);
        await ctx.reply('Unknown command. Use /help to see available commands.');
      }
    });

    // Handler for profile update photo
    bot.on(message('photo'), async (ctx, next) => {
      const telegramId = ctx.from?.id;
      console.log('[PHOTO HANDLER] Photo received from:', telegramId);
      if (!telegramId) return next();
      const session = await dbOperations.getUserSession(telegramId, 'profile_update');
      if (!session || !session.data || !session.data.type) {
        console.log('[PHOTO HANDLER] No profile_update session found for:', telegramId);
        return next(); // Not in profile update mode
      }
      const photo = ctx.message.photo?.[ctx.message.photo.length - 1];
      if (!photo) {
        console.log('[PHOTO HANDLER] No photo found in message for:', telegramId);
        return;
      }
      try {
        console.log('[PHOTO HANDLER] Processing photo for profile update:', session.data.type);
        const file = await ctx.telegram.getFile(photo.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const response = await fetch(fileUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const driver = await dbOperations.getDriverByTelegramId(telegramId);
        if (!driver) {
          await ctx.reply('❌ You are not registered as a driver.');
          await dbOperations.deleteUserSession(telegramId, 'profile_update');
          return;
        }
        let uploadedUrl = '';
        if (session.data.type === 'driver_license') {
          console.log('[PHOTO HANDLER] Uploading driver license photo for driver:', driver.id);
          uploadedUrl = await storageService.uploadDriverDocument(buffer, String(driver.id), 'cdl', 'cdl_photo.jpg');
          await dbOperations.updateDriver(driver.id, { cdl_photo_url: uploadedUrl });
          // Set session to expect expiration date
          const createResult = await dbOperations.createUserSession(telegramId, 'profile_update_date', 1, { type: 'driver_license' });
          console.log('[PHOTO HANDLER] Created profile_update_date session:', createResult);
          const checkSession = await dbOperations.getUserSession(telegramId, 'profile_update_date');
          console.log('[PHOTO HANDLER] Immediately fetched profile_update_date session:', checkSession);
          await ctx.reply('✅ Your Driver License has been updated! Please enter the new expiration date (YYYY-MM-DD):');
        } else if (session.data.type === 'medical_card') {
          console.log('[PHOTO HANDLER] Uploading medical card photo for driver:', driver.id);
          uploadedUrl = await storageService.uploadDriverDocument(buffer, String(driver.id), 'dot_medical', 'dot_medical_photo.jpg');
          await dbOperations.updateDriver(driver.id, { dot_medical_photo_url: uploadedUrl });
          // Set session to expect expiration date
          const createResult = await dbOperations.createUserSession(telegramId, 'profile_update_date', 1, { type: 'medical_card' });
          console.log('[PHOTO HANDLER] Created profile_update_date session:', createResult);
          const checkSession = await dbOperations.getUserSession(telegramId, 'profile_update_date');
          console.log('[PHOTO HANDLER] Immediately fetched profile_update_date session:', checkSession);
          await ctx.reply('✅ Your Medical Card has been updated! Please enter the new expiration date (YYYY-MM-DD):');
        }
        await dbOperations.deleteUserSession(telegramId, 'profile_update');
        console.log('[PHOTO HANDLER] Profile update photo processed successfully for:', telegramId);
      } catch (error) {
        console.error('Error updating document:', error);
        await ctx.reply('❌ Error updating your document. Please try again.');
      }
    });


  },

  async handleApproval(ctx: Context, action: 'approve' | 'reject') {
    if (!ctx.message || !('text' in ctx.message)) return;
    const match = ctx.message.text?.match(new RegExp(`^${action}_(\\d+)$`));
    if (!match) return;

    const driverId = parseInt(match[1]);
    const driver = await dbOperations.updateDriverStatus(
      driverId,
      action === 'approve' ? DriverStatus.ACTIVE : DriverStatus.INACTIVE
    );

    if (driver) {
      await ctx.reply(
        `✅ Driver ${action === 'approve' ? 'approved' : 'rejected'} successfully.\n\n` +
        `Driver: ${driver.full_name}\n` +
        `Status: ${driver.status}`
      );

      // Notify driver
      await bot.telegram.sendMessage(
        driver.telegram_id,
        `🎉 Your driver application has been ${action === 'approve' ? 'approved' : 'rejected'}!\n\n` +
        `Status: ${driver.status.toUpperCase()}\n\n` +
        `${action === 'approve' ? 'You can now use all bot features.' : 'Please contact HR for more information.'}`
      );
    }
  },

  async showMainMenu(ctx: Context) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const driver = await dbOperations.getDriverByTelegramId(telegramId);
    if (!driver) return;

    let replyKeyboard;
    if (driver.status === DriverStatus.ACTIVE) {
      // Approved drivers see all options
      replyKeyboard = {
        keyboard: [
          ['💰 Request Advance Payment', '🏖️ Request Vacation'],
          ['💬 Message HR', '🆘 Contact Support'],
          ['📊 View Status', '❓ Help'],
          ['📝 Update Profile'],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      };
    } else {
      // Pending/unapproved drivers see only basic options
      replyKeyboard = {
        keyboard: [
          ['💬 Message HR', '📊 View Status'],
          ['📝 Update Profile'],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      };
    }

    await ctx.reply(
      `🚛 Welcome back, ${driver.full_name}!\n\n` +
      `Status: ${driver.status.toUpperCase()}\n\n` +
      `What would you like to do?`,
      { reply_markup: replyKeyboard }
    );
  },

  // HR Communication Methods
  async startHRMessageFromButton(ctx: any, driverId: number) {
    try {
      const driver = await dbOperations.getDriverById(driverId);
      
      if (!driver) {
        await ctx.answerCbQuery('❌ Driver not found.');
        return;
      }

      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      // Set HR in message mode
      await dbOperations.createUserSession(telegramId, 'hr_message', 1, { targetDriverId: driverId, targetDriverName: driver.full_name });

      await ctx.answerCbQuery(` Starting chat with ${driver.full_name}`);
      await ctx.reply(
        `💬 Message to ${driver.full_name}\n\n` +
        `Type your message below. The driver will receive it immediately.\n\n` +
        `To cancel, type /cancel`
      );
    } catch (error) {
      console.error('Error starting HR message from button:', error);
      await ctx.answerCbQuery('❌ Error starting chat.');
    }
  },

  async handleApprovalFromButton(ctx: any, action: 'approve' | 'reject', driverId: number) {
    try {
      const driver = await dbOperations.updateDriverStatus(
        driverId,
        action === 'approve' ? DriverStatus.ACTIVE : DriverStatus.INACTIVE
      );

      if (driver) {
        await ctx.answerCbQuery(
          `✅ Driver ${action === 'approve' ? 'approved' : 'rejected'} successfully!`
        );

        // Notify driver
        await bot.telegram.sendMessage(
          driver.telegram_id,
          `🎉 Your driver application has been ${action === 'approve' ? 'approved' : 'rejected'}!\n\n` +
          `Status: ${driver.status.toUpperCase()}\n\n` +
          `${action === 'approve' ? 'You can now use all bot features.' : 'Please contact HR for more information.'}`
        );
      } else {
        await ctx.answerCbQuery('❌ Driver not found.');
      }
    } catch (error) {
      console.error('Error handling approval from button:', error);
      await ctx.answerCbQuery('❌ Error processing request.');
    }
  },

  async startDriverMessage(ctx: any, department: 'hr' | 'support') {
    try {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const driver = await dbOperations.getDriverByTelegramId(telegramId);
      if (!driver) {
        // Check if this is a callback query or message
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('❌ You are not registered as a driver.');
        } else {
          await ctx.reply('❌ You are not registered as a driver.');
        }
        return;
      }

      // Set driver in message mode
      await dbOperations.createUserSession(telegramId, 'driver_reply', 1, { hrGroupId: department === 'hr' ? (process.env.TELEGRAM_HR_GROUP_ID || '') : (process.env.TELEGRAM_SUPPORT_GROUP_ID || ''), hrUserId: 0 });

      const deptName = department === 'hr' ? 'HR' : 'Support';
      
      // Check if this is a callback query or message
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(`💬 Starting chat with ${deptName}`);
      }
      
      await ctx.reply(
        `💬 Message to ${deptName}\n\n` +
        `Type your message below. ${deptName} will receive it immediately.\n\n` +
        `To cancel, type /cancel`
      );
    } catch (error) {
      console.error('Error starting driver message:', error);
      // Check if this is a callback query or message
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('❌ Error starting chat.');
      } else {
        await ctx.reply('❌ Error starting chat.');
      }
    }
  },

  async showHelp(ctx: any) {
    try {
      const telegramId = ctx.from?.id;
      if (!telegramId) return;

      const driver = await dbOperations.getDriverByTelegramId(telegramId);
      const isHR = process.env.TELEGRAM_HR_GROUP_ID && ctx.chat?.id.toString() === process.env.TELEGRAM_HR_GROUP_ID;

      if (isHR) {
        // Check if this is a callback query or message
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('📋 HR Help');
        }
        await ctx.reply(
          '🚛 Driver Helper Bot - HR Commands\n\n' +
          'Available commands:\n' +
          '/list_drivers - List all drivers\n' +
          '/message [driver_id] - Send message to specific driver\n' +
          '/approve [driver_id] - Approve driver application\n' +
          '/reject [driver_id] - Reject driver application\n' +
          '/help - Show this help message'
        );
      } else {
        // Check if this is a callback query or message
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery('📋 Driver Help');
        }
        await ctx.reply(
          '🚛 Driver Helper Bot\n\n' +
          'Available commands:\n' +
          '/start - Start onboarding or show main menu\n' +
          '/request_advance - Request advance payment\n' +
          '/request_vacation - Request vacation\n' +
          '/status - Check your status\n' +
          '/help - Show this help message\n\n' +
          'You can also use the buttons in the main menu for quick access!'
        );
      }
    } catch (error) {
      console.error('Error showing help:', error);
      // Check if this is a callback query or message
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery('❌ Error showing help.');
      } else {
        await ctx.reply('❌ Error showing help.');
      }
    }
  },

  async startHRMessage(ctx: Context) {
    if (!ctx.message || !('text' in ctx.message)) return;
    const match = ctx.message.text?.match(/^\/message_(\d+)$/);
    if (!match) return;

    const driverId = parseInt(match[1]);
    const driver = await dbOperations.getDriverById(driverId);
    
    if (!driver) {
      await ctx.reply('❌ Driver not found.');
      return;
    }

    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    // Set HR in message mode
    await dbOperations.createUserSession(telegramId, 'hr_message', 1, { targetDriverId: driverId, targetDriverName: driver.full_name });

    await ctx.reply(
      `💬 Message to ${driver.full_name}\n\n` +
      `Type your message below. The driver will receive it immediately.\n\n` +
      `To cancel, type /cancel`
    );
  },

  async handleHRMessage(ctx: Context, hrSession: { targetDriverId: number; targetDriverName: string }) {
    if (!ctx.message || !('text' in ctx.message)) return;
    const message = ctx.message.text;
    if (!message) return;

    console.log('🔔 handleHRMessage called');
    console.log('  HR Telegram ID:', ctx.from?.id);
    console.log('  HR Session data:', hrSession);
    console.log('  Target Driver ID:', hrSession?.targetDriverId);
    console.log('  Message to send:', message);

    // Validate session data
    if (!hrSession || !hrSession.targetDriverId) {
      console.error('❌ Invalid HR session data:', hrSession);
      await ctx.reply('❌ Error: Invalid session data. Please try starting the message again.');
      await dbOperations.deleteUserSession(ctx.from!.id, 'hr_message');
      return;
    }

    if (message === '/cancel') {
      await dbOperations.deleteUserSession(ctx.from!.id, 'hr_message');
      await ctx.reply('❌ Message cancelled.');
      return;
    }

    try {
      const driver = await dbOperations.getDriverById(hrSession.targetDriverId);
      console.log('  Driver fetched:', driver);
      if (!driver) {
        await ctx.reply('❌ Driver not found.');
        await dbOperations.deleteUserSession(ctx.from!.id, 'hr_message');
        return;
      }

      // Send message to driver
      console.log('  Sending message to driver Telegram ID:', driver.telegram_id);
      await bot.telegram.sendMessage(
        driver.telegram_id,
        `📨 Message from HR\n\n${message}\n\nTo reply, just send a message here.\nTo cancel reply mode, type /cancel`
      );

      // Set driver in reply mode
      await dbOperations.createUserSession(driver.telegram_id, 'driver_reply', 1, { hrGroupId: process.env.TELEGRAM_HR_GROUP_ID || '', hrUserId: ctx.from!.id });

      await ctx.reply(
        `✅ Message sent to ${hrSession.targetDriverName}!\n\n` +
        `The driver can now reply directly to you.`
      );

      // Clear HR session
      await dbOperations.deleteUserSession(ctx.from!.id, 'hr_message');
    } catch (error) {
      console.error('Error sending HR message:', error);
      await ctx.reply('❌ Error sending message. Please try again.');
    }
  },

  async handleDriverReply(ctx: Context, driverSession: { hrGroupId: string; hrUserId: number }) {
    if (!ctx.message || !('text' in ctx.message)) return;
    const message = ctx.message.text;
    if (!message) return;

    console.log('🔔 handleDriverReply called');
    console.log('  Driver Session data:', driverSession);

    // Validate session data
    if (!driverSession || !driverSession.hrGroupId) {
      console.error('❌ Invalid driver session data:', driverSession);
      await ctx.reply('❌ Error: Invalid session data. Please try starting the message again.');
      await dbOperations.deleteUserSession(ctx.from!.id, 'driver_reply');
      return;
    }

    // Check for cancel command
    if (message === '/cancel') {
      await dbOperations.deleteUserSession(ctx.from!.id, 'driver_reply');
      await ctx.reply('❌ Reply mode cancelled. You can now use the main menu.');
      return;
    }

    try {
      const driver = await dbOperations.getDriverByTelegramId(ctx.from!.id);
      if (!driver) {
        await ctx.reply('❌ You are not registered as a driver.');
        await dbOperations.deleteUserSession(ctx.from!.id, 'driver_reply');
        return;
      }

      // Log before sending
      console.log('  [DEBUG] Sending driver reply to HR group:', driverSession.hrGroupId, 'message:', message);

      // --- Добавляем инлайн-кнопку для ответа HR ---
      const replyKeyboard = {
        inline_keyboard: [
          [
            { text: `Response ${driver.full_name}`, callback_data: `reply_driver_${driver.id}` }
          ]
        ]
      };

      // Send reply to HR group with button
      await bot.telegram.sendMessage(
        driverSession.hrGroupId,
        `💬 Reply from ${driver.full_name}\n\n${message}`,
        { reply_markup: replyKeyboard }
      );

      await ctx.reply('✅ Your reply has been sent to HR!');

      // Clear driver session
      await dbOperations.deleteUserSession(ctx.from!.id, 'driver_reply');
    } catch (error) {
      console.error('Error handling driver reply:', error);
      await ctx.reply('❌ Error sending reply. Please try again.');
    }
  },

  // --- Новый обработчик callback для кнопки "Ответить водителю" ---
  async handleReplyToDriverFromHR(ctx: any, driverId: number) {
    try {
      const driver = await dbOperations.getDriverById(driverId);
      if (!driver) {
        await ctx.answerCbQuery('❌ Driver not found.');
        return;
      }
      const telegramId = ctx.from?.id;
      if (!telegramId) return;
      // Set HR in message mode
      await dbOperations.createUserSession(telegramId, 'hr_message', 1, { targetDriverId: driverId, targetDriverName: driver.full_name });
      await ctx.answerCbQuery(`Начинаем чат с ${driver.full_name}`);
      await ctx.reply(
        `💬 Message to ${driver.full_name}\n\n` +
        `Type your message below. The driver will receive it immediately.\n\n` +
        `To cancel, type /cancel`
      );
    } catch (error) {
      console.error('Error starting reply to driver from HR:', error);
      await ctx.answerCbQuery('❌ Error starting chat.');
    }
  },

  async listDriversForHR(ctx: Context) {
    try {
      console.log('listDriversForHR called');
      const drivers = await dbOperations.getAllDrivers();
      console.log('Drivers fetched:', drivers?.length || 0);
      
      if (!drivers || drivers.length === 0) {
        await ctx.reply('📋 No drivers found.');
        return;
      }

      let message = '📋 Driver List\n\n';
      const keyboard = {
        inline_keyboard: [] as any[][]
      };

      drivers.forEach((driver: Driver, index: number) => {
        const statusEmoji: { [key: string]: string } = {
          [DriverStatus.PENDING]: '⏳',
          [DriverStatus.ACTIVE]: '✅',
          [DriverStatus.INACTIVE]: '❌',
          [DriverStatus.SUSPENDED]: '⚠️'
        };

        message += `${index + 1}. ${driver.full_name} (${statusEmoji[driver.status]} ${driver.status})\n\n`;
        
        // Add buttons for each driver
        keyboard.inline_keyboard.push([
          { text: `💬 Message ${driver.full_name}`, callback_data: `message_${driver.id}` },
          { text: `✅ Approve`, callback_data: `approve_${driver.id}` },
          { text: `❌ Reject`, callback_data: `reject_${driver.id}` }
        ]);
      });

      console.log('Sending message with buttons:', message.substring(0, 100) + '...');
      await ctx.reply(message, { reply_markup: keyboard });
    } catch (error) {
      console.error('Error listing drivers:', error);
      await ctx.reply('❌ Error fetching driver list: ' + (error as Error).message);
    }
  },

  // Start the bot
  start() {
    console.log('🚀 Initializing bot...');
    this.initialize();
    
    // Add error handling
    bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      ctx.reply('❌ Sorry, something went wrong. Please try again.');
    });
    
    console.log('🚀 Launching bot...');
    bot.launch();
    console.log('✅ Telegram bot started successfully');
    console.log('📡 Bot is listening for messages...');
  }
}; 