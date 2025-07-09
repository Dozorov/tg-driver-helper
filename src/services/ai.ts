import OpenAI from 'openai';
import { AIAnalysisResult } from '../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export const aiService = {
  async analyzeDocument(documentUrl: string, documentType: string): Promise<AIAnalysisResult> {
    if (!process.env.OPENAI_API_KEY) {
      console.log(`🔧 Mock: Analyzing ${documentType} document`);
      return {
        confidence: 0.9,
        extractedData: {
          documentType,
          mockData: true,
          url: documentUrl
        },
        isValid: true,
        suggestions: ['Mock analysis completed successfully']
      };
    }

    if (!openai) throw new Error('OpenAI client not initialized');

    try {
      const prompt = this.getDocumentAnalysisPrompt(documentType);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: documentUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from AI service');
      }

      return this.parseAIResponse(result, documentType);
    } catch (error) {
      console.error('AI analysis error:', error);
      throw new Error('Failed to analyze document');
    }
  },

  getDocumentAnalysisPrompt(documentType: string): string {
    const prompts = {
      'cdl': `Analyze this Commercial Driver License (CDL) document. Extract the following information:
        - CDL Number
        - Expiry Date
        - Driver Name
        - License Class
        - State of Issue
        
        Return the data in JSON format with confidence score (0-1) and validation status.`,
      
      'dot_medical': `Analyze this DOT Medical Certificate. Extract the following information:
        - Certificate Number
        - Expiry Date
        - Driver Name
        - Medical Examiner Name
        - Issue Date
        
        Return the data in JSON format with confidence score (0-1) and validation status.`,
      
      'photo': `Analyze this driver photo. Verify:
        - It's a clear, professional photo
        - Shows the driver's face clearly
        - Appropriate for identification purposes
        
        Return assessment in JSON format with confidence score (0-1) and validation status.`
    };

    return prompts[documentType as keyof typeof prompts] || 'Analyze this document and extract relevant information.';
  },

  parseAIResponse(response: string, documentType: string): AIAnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          confidence: parsed.confidence || 0.5,
          extractedData: parsed,
          isValid: parsed.isValid || false,
          suggestions: parsed.suggestions || []
        };
      }

      // Fallback parsing
      return {
        confidence: 0.3,
        extractedData: { rawResponse: response },
        isValid: false,
        suggestions: ['Unable to parse AI response properly']
      };
    } catch (error) {
      return {
        confidence: 0.1,
        extractedData: { rawResponse: response },
        isValid: false,
        suggestions: ['Error parsing AI response']
      };
    }
  },

  async validateDriverInformation(driverData: any): Promise<{ isValid: boolean; issues: string[] }> {
    if (!process.env.OPENAI_API_KEY) {
      console.log('🔧 Mock: Validating driver information');
      return {
        isValid: true,
        issues: []
      };
    }

    if (!openai) throw new Error('OpenAI client not initialized');

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a driver verification specialist. Validate the provided driver information for completeness and accuracy."
          },
          {
            role: "user",
            content: `Validate this driver information: ${JSON.stringify(driverData)}`
          }
        ],
        max_tokens: 500
      });

      const result = response.choices[0]?.message?.content;
      const issues: string[] = [];

      if (result) {
        // Simple validation logic
        if (!driverData.full_name) issues.push('Full name is required');
        if (!driverData.cdl_number) issues.push('CDL number is required');
        if (!driverData.dot_medical_certificate) issues.push('DOT medical certificate is required');
        if (!driverData.driver_photo_url) issues.push('Driver photo is required');
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('AI validation error:', error);
      return {
        isValid: false,
        issues: ['Error during AI validation']
      };
    }
  }
}; 