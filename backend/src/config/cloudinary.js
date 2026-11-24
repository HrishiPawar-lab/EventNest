import { v2 as cloudinary } from 'cloudinary';

const credentialNames = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

export function loadCloudinaryConfig(env = process.env) {
  const configured = credentialNames.some((name) => Boolean(env[name]));
  if (!configured) return null;

  for (const name of credentialNames) {
    if (typeof env[name] !== 'string' || !env[name].trim()) {
      throw new Error(`${name} is required when Cloudinary is configured`);
    }
  }

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME.trim(),
    apiKey: env.CLOUDINARY_API_KEY.trim(),
    apiSecret: env.CLOUDINARY_API_SECRET.trim(),
  };
}

export function configureCloudinary(config, client = cloudinary) {
  client.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  return client;
}

export const cloudinaryClient = cloudinary;
