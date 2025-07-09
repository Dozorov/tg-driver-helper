import Joi from 'joi';

export const validationSchemas = {
  driver: Joi.object({
    telegram_id: Joi.number().required(),
    full_name: Joi.string().min(2).max(100).required(),
    phone_number: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
    cdl_number: Joi.string().min(5).max(20).required(),
    cdl_expiry_date: Joi.date().greater('now').required(),
    dot_medical_certificate: Joi.string().min(5).max(50).required(),
    dot_medical_expiry_date: Joi.date().greater('now').required(),
    driver_photo_url: Joi.string().uri().required(),
    status: Joi.string().valid('pending', 'active', 'inactive', 'suspended').default('pending'),
    onboarding_completed: Joi.boolean().default(false)
  }),

  advancePaymentRequest: Joi.object({
    driver_id: Joi.string().uuid().required(),
    amount: Joi.number().positive().max(10000).required(),
    reason: Joi.string().min(10).max(500).required()
  }),

  vacationRequest: Joi.object({
    driver_id: Joi.string().uuid().required(),
    start_date: Joi.date().greater('now').required(),
    end_date: Joi.date().greater(Joi.ref('start_date')).required(),
    reason: Joi.string().min(10).max(500).required()
  }),

  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
  date: Joi.date().greater('now').required(),
  amount: Joi.number().positive().max(10000).required()
};

export const validateData = (schema: Joi.ObjectSchema, data: any) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return value;
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

export const validateDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date > new Date();
};

export const validateAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 10000;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
}; 