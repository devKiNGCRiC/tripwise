/**
 * photos.ts — where journal photos are kept.
 *
 * Two stores behind one interface:
 *   - MongoDB (the default, used until Cloudinary is set up): the bytes sit in the photo record.
 *   - Cloudinary (free plan, once its three keys are in .env): photos are uploaded as
 *     *private* images, so they can't be opened by URL — our API fetches them on demand.
 * Either way the website only ever sees /api/photos/:id, which checks permission first.
 */
import { createHash } from 'node:crypto';
import { Photo } from '../db/models/index.js';

/** A stored photo's bytes and type, ready to send. */
export interface StoredPhoto {
  contentType: string;
  body: Buffer;
}

/** Save, read and delete journal photos. */
export interface PhotoStore {
  put(input: { ownerId: string; itineraryId: string; bytes: Buffer; contentType: string }): Promise<{ id: string }>;
  /** Whose photo this is (a quick lookup, no bytes), or null if there's no such photo. */
  ownerOf(id: string): Promise<string | null>;
  get(id: string): Promise<(StoredPhoto & { ownerId: string }) | null>;
  remove(id: string): Promise<void>;
  removeAllOf(ownerId: string): Promise<void>;
}

/** Cloudinary account settings. */
interface CloudinaryKeys {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/** The owner of a photo record (both stores keep one in MongoDB). */
async function ownerOf(id: string): Promise<string | null> {
  const photo = await Photo.findById(id, { ownerId: 1 }).lean();
  return photo ? photo.ownerId.toString() : null;
}

/** Pick the store: Cloudinary when all three keys exist, otherwise MongoDB. */
export function createPhotoStore(keys: { cloudName?: string; apiKey?: string; apiSecret?: string } = {}): PhotoStore {
  if (keys.cloudName && keys.apiKey && keys.apiSecret) {
    return cloudinaryStore({ cloudName: keys.cloudName, apiKey: keys.apiKey, apiSecret: keys.apiSecret });
  }
  return mongoStore();
}

/** Photos kept inside MongoDB (fine for testing and early days; Atlas free has 512 MB). */
function mongoStore(): PhotoStore {
  return {
    ownerOf,
    async put({ ownerId, itineraryId, bytes, contentType }) {
      const photo = await Photo.create({ ownerId, itineraryId, contentType, data: bytes });
      return { id: photo._id.toString() };
    },
    async get(id) {
      const photo = await Photo.findById(id).lean();
      if (!photo?.data) return null;
      return { contentType: photo.contentType, body: Buffer.from(photo.data.buffer ?? photo.data), ownerId: photo.ownerId.toString() };
    },
    async remove(id) {
      await Photo.deleteOne({ _id: id });
    },
    async removeAllOf(ownerId) {
      await Photo.deleteMany({ ownerId });
    },
  };
}

/** Photos kept private on Cloudinary; the record here only remembers where. */
function cloudinaryStore(keys: CloudinaryKeys): PhotoStore {
  const base = `https://api.cloudinary.com/v1_1/${keys.cloudName}/image`;

  /** Cloudinary's request signature: SHA-1 of the sorted parameters plus the secret. */
  const sign = (params: Record<string, string>) => {
    const text = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    return createHash('sha1').update(text + keys.apiSecret).digest('hex');
  };
  /** Seconds since 1970, as Cloudinary wants it. */
  const timestamp = () => String(Math.floor(Date.now() / 1000));

  /** Ask Cloudinary to delete one private image. */
  const destroy = async (publicId: string) => {
    const params = { public_id: publicId, timestamp: timestamp(), type: 'private' };
    const form = new URLSearchParams({ ...params, api_key: keys.apiKey, signature: sign(params) });
    await fetch(`${base}/destroy`, { method: 'POST', body: form });
  };

  return {
    ownerOf,
    async put({ ownerId, itineraryId, bytes, contentType }) {
      // Upload as a private image (it can't be opened by a public URL).
      const params = { timestamp: timestamp(), type: 'private' };
      const form = new FormData();
      form.set('file', `data:${contentType};base64,${bytes.toString('base64')}`);
      for (const [k, v] of Object.entries(params)) form.set(k, v);
      form.set('api_key', keys.apiKey);
      form.set('signature', sign(params));
      const res = await fetch(`${base}/upload`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
      const uploaded = (await res.json()) as { public_id: string; format: string };
      const photo = await Photo.create({ ownerId, itineraryId, contentType, cloudinaryId: `${uploaded.public_id}.${uploaded.format}` });
      return { id: photo._id.toString() };
    },
    async get(id) {
      const photo = await Photo.findById(id).lean();
      if (!photo?.cloudinaryId) return null;
      // A signed, one-off download of the private image.
      const dot = photo.cloudinaryId.lastIndexOf('.');
      const params = { format: photo.cloudinaryId.slice(dot + 1), public_id: photo.cloudinaryId.slice(0, dot), timestamp: timestamp(), type: 'private' };
      const query = new URLSearchParams({ ...params, api_key: keys.apiKey, signature: sign(params) });
      const res = await fetch(`${base}/download?${query}`);
      if (!res.ok) return null;
      return { contentType: photo.contentType, body: Buffer.from(await res.arrayBuffer()), ownerId: photo.ownerId.toString() };
    },
    async remove(id) {
      const photo = await Photo.findByIdAndDelete(id).lean();
      if (photo?.cloudinaryId) await destroy(photo.cloudinaryId.slice(0, photo.cloudinaryId.lastIndexOf('.')));
    },
    async removeAllOf(ownerId) {
      const photos = await Photo.find({ ownerId }).lean();
      await Promise.all(photos.map((p) => (p.cloudinaryId ? destroy(p.cloudinaryId.slice(0, p.cloudinaryId.lastIndexOf('.'))) : null)));
      await Photo.deleteMany({ ownerId });
    },
  };
}
