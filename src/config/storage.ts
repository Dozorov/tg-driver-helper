import { v4 as uuidv4 } from 'uuid';

// Check if required environment variables are set
const requiredEnvVars = [
  'DO_SPACES_ENDPOINT',
  'DO_SPACES_KEY', 
  'DO_SPACES_SECRET',
  'DO_SPACES_REGION',
  'DO_SPACES_BUCKET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables for file storage:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('Please check your .env file and ensure all DO_SPACES_* variables are set.');
  process.exit(1);
}

export const storageService = {
  async uploadFile(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
    const AWS = await import('aws-sdk');
    const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT!);
    const s3 = new AWS.S3({
      endpoint: spacesEndpoint,
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
      region: process.env.DO_SPACES_REGION
    });
    const key = `drivers/${uuidv4()}-${fileName}`;
    
    const params = {
      Bucket: process.env.DO_SPACES_BUCKET!,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: 'public-read'
    };

    try {
      const result = await s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      console.error('Error uploading file to DO Spaces:', error);
      throw new Error('Failed to upload file');
    }
  },

  async deleteFile(fileUrl: string): Promise<void> {
    const AWS = await import('aws-sdk');
    const spacesEndpoint = new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT!);
    const s3 = new AWS.S3({
      endpoint: spacesEndpoint,
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
      region: process.env.DO_SPACES_REGION
    });
    const key = fileUrl.split('/').pop();
    if (!key) return;

    const params = {
      Bucket: process.env.DO_SPACES_BUCKET!,
      Key: key
    };

    try {
      await s3.deleteObject(params).promise();
    } catch (error) {
      console.error('Error deleting file from DO Spaces:', error);
    }
  },

  async uploadDriverDocument(
    fileBuffer: Buffer, 
    driverId: string, 
    documentType: string, 
    originalName: string
  ): Promise<string> {
    const extension = originalName.split('.').pop();
    const fileName = `${driverId}/${documentType}.${extension}`;
    
    const contentType = this.getContentType(extension || '');
    return this.uploadFile(fileBuffer, fileName, contentType);
  },

  getContentType(extension: string): string {
    const contentTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}; 