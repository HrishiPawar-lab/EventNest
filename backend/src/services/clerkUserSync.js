import { User } from '../models/User.js';
import { isE164, isEmail } from '../models/validators.js';

export class InvalidWebhookPayloadError extends Error {}

function trimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function primaryContact(contacts, primaryId) {
  if (!Array.isArray(contacts)) return null;
  if (primaryId)
    return contacts.find((contact) => contact?.id === primaryId) ?? null;
  return contacts.length === 1 ? (contacts[0] ?? null) : null;
}

function mappedFields(clerkUser) {
  const emailContact = primaryContact(
    clerkUser.emailAddresses,
    clerkUser.primaryEmailAddressId,
  );
  const phoneContact = primaryContact(
    clerkUser.phoneNumbers,
    clerkUser.primaryPhoneNumberId,
  );
  const email = trimmedString(emailContact?.emailAddress).toLowerCase();
  const phoneNumber = trimmedString(phoneContact?.phoneNumber);
  const validEmail = isEmail(email);
  const validPhone = isE164(phoneNumber);
  const name =
    [clerkUser.firstName, clerkUser.lastName]
      .map(trimmedString)
      .filter(Boolean)
      .join(' ') || trimmedString(clerkUser.username);
  const profilePicture = trimmedString(clerkUser.imageUrl);

  const fields = {
    'verification.emailVerified':
      validEmail && emailContact.verification?.status === 'verified',
    'verification.phoneVerified':
      validPhone && phoneContact.verification?.status === 'verified',
  };
  const unset = {};

  if (validEmail) fields.email = email;
  if (validPhone) fields.phoneNumber = phoneNumber;
  if (name) fields.name = name;
  else unset.name = '';
  if (profilePicture) fields.profilePicture = profilePicture;
  else unset.profilePicture = '';

  return { fields, unset, complete: validEmail && validPhone };
}

async function deactivateUser(userModel, clerkId) {
  await userModel.updateOne(
    { clerkId },
    { $set: { accountStatus: 'deactivated' } },
    { upsert: false, runValidators: true },
  );
  return 'deactivated';
}

export async function syncClerkUser(event, { getClerkUser, userModel = User }) {
  if (!['user.created', 'user.updated', 'user.deleted'].includes(event?.type)) {
    return 'ignored';
  }

  const clerkId = event.data?.id;
  if (typeof clerkId !== 'string' || !clerkId.trim()) {
    throw new InvalidWebhookPayloadError('Clerk user ID is required');
  }

  if (event.type === 'user.deleted') {
    return deactivateUser(userModel, clerkId);
  }

  let clerkUser;
  try {
    clerkUser = await getClerkUser(clerkId);
  } catch (error) {
    if (error?.status === 404 || error?.statusCode === 404) {
      return deactivateUser(userModel, clerkId);
    }
    throw error;
  }

  if (clerkUser?.id !== clerkId) {
    throw new Error('Clerk user lookup returned a different user');
  }

  const { fields, unset, complete } = mappedFields(clerkUser);
  const update = { $set: fields };
  if (Object.keys(unset).length > 0) update.$unset = unset;
  if (complete) {
    update.$setOnInsert = { roles: ['attendee'], accountStatus: 'active' };
  }

  await userModel.updateOne({ clerkId }, update, {
    upsert: complete,
    runValidators: true,
    setDefaultsOnInsert: complete,
  });

  return complete ? 'synced' : 'incomplete';
}
