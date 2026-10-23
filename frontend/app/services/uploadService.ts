import { Platform } from 'react-native';
import { request } from './http';

export type PickedImage = {
  uri: string;
  mimeType?: string;
  fileName?: string;
};

/** Uploads a picked image (JPEG, PNG or WebP, max 5 MB) and returns its https URL. */
export async function uploadImage(image: PickedImage): Promise<string> {
  const form = new FormData();
  const name = image.fileName ?? 'photo.jpg';
  const type = image.mimeType ?? 'image/jpeg';
  if (Platform.OS === 'web') {
    const blob = await (await fetch(image.uri)).blob();
    form.append('image', blob, name);
  } else {
    // React Native's FormData accepts this file descriptor shape.
    form.append('image', { uri: image.uri, name, type } as unknown as Blob);
  }
  const res = await request<{ image_url: string }>('POST', '/images/upload', { formData: form, timeoutMs: 60000 });
  return res.image_url;
}
