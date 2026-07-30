import { requireOptionalNativeModule } from 'expo-modules-core';

const ICloud = requireOptionalNativeModule<{
  getDocumentsUrl(): Promise<string | null>;
}>('ICloud');

/** iCloud Drive Documents URL for our container, or null (not signed in / Expo Go / Android). */
export async function getICloudDocumentsUrl(): Promise<string | null> {
  try {
    return (await ICloud?.getDocumentsUrl()) ?? null;
  } catch {
    return null;
  }
}
