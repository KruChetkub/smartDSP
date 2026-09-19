type PlainTextOptions = {
  fieldName?: string;
  maxLength?: number;
  trim?: boolean;
  allowNewlines?: boolean;
};

type FileValidationOptions = {
  allowedTypes: string[];
  maxSizeBytes: number;
  label?: string;
};

const htmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

export function escapeHtmlText(value: string) {
  return value.replace(/[&<>"'`]/g, (char) => htmlEscapeMap[char] || char);
}

export function sanitizePlainTextInput(value: string | null | undefined, options: PlainTextOptions = {}) {
  const {
    fieldName = 'ข้อมูล',
    maxLength,
    trim = true,
    allowNewlines = true,
  } = options;

  const text = String(value ?? '')
    .replace(new RegExp('[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', 'g'), '')
    .replace(/\r\n?/g, '\n');
  const normalized = allowNewlines ? text : text.replace(/\n+/g, ' ');
  const result = trim ? normalized.trim() : normalized;

  if (maxLength && result.length > maxLength) {
    throw new Error(`${fieldName}ต้องไม่เกิน ${maxLength.toLocaleString('th-TH')} ตัวอักษร`);
  }

  return escapeHtmlText(result);
}

export function optionalPlainTextInput(value: string | null | undefined, options: PlainTextOptions = {}) {
  const sanitized = sanitizePlainTextInput(value, options);
  return sanitized || null;
}


export function sanitizeUrlInput(value: string | null | undefined, options: { fieldName?: string; maxLength?: number } = {}) {
  const fieldName = options.fieldName || 'URL';
  const maxLength = options.maxLength || 1000;
  const text = String(value ?? '')
    .replace(new RegExp('[\\x00-\\x1F\\x7F]', 'g'), '')
    .trim();

  if (!text) {
    return null;
  }

  if (text.length > maxLength) {
    throw new Error(`${fieldName}ต้องไม่เกิน ${maxLength.toLocaleString('th-TH')} ตัวอักษร`);
  }

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${fieldName}ต้องเป็น URL ที่ถูกต้อง`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${fieldName}ต้องขึ้นต้นด้วย http:// หรือ https:// เท่านั้น`);
  }

  return text;
}

const TRUSTED_IMAGE_ORIGINS = new Set(['https://asntgpqwccsbdzppnjxk.supabase.co']);

try {
  const configuredSupabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
  if (configuredSupabaseUrl) {
    TRUSTED_IMAGE_ORIGINS.add(new URL(configuredSupabaseUrl).origin);
  }
} catch {
  // Ignore an invalid optional build-time URL; the production origin remains trusted.
}

export function sanitizeImageUrlInput(value: string | null | undefined, options: { fieldName?: string; maxLength?: number } = {}) {
  const fieldName = options.fieldName || 'URL รูปภาพ';
  const maxLength = options.maxLength || 2048;
  const text = String(value ?? '')
    .replace(new RegExp('[\\x00-\\x1F\\x7F]', 'g'), '')
    .trim();

  if (!text) {
    return null;
  }

  if (text.length > maxLength) {
    throw new Error(`${fieldName}ต้องไม่เกิน ${maxLength.toLocaleString('th-TH')} ตัวอักษร`);
  }

  if (text.startsWith('/') && !text.startsWith('//')) {
    return text;
  }

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${fieldName}ต้องเป็นพาธภายในเว็บไซต์ หรือ URL ที่ถูกต้อง`);
  }

  if (url.protocol !== 'https:' || !TRUSTED_IMAGE_ORIGINS.has(url.origin)) {
    throw new Error(`${fieldName}ต้องมาจากเว็บไซต์นี้หรือพื้นที่จัดเก็บ Supabase ของระบบเท่านั้น`);
  }

  return text;
}

export function normalizeImageUrlInput(value: string | null | undefined, fallback = '') {
  try {
    return sanitizeImageUrlInput(value) || fallback;
  } catch {
    return fallback;
  }
}
export function validateUploadFile(file: File, options: FileValidationOptions) {
  const label = options.label || 'ไฟล์';

  if (!file || file.size <= 0) {
    throw new Error(`${label}ไม่ถูกต้องหรือเป็นไฟล์ว่าง`);
  }

  if (!options.allowedTypes.includes(file.type)) {
    throw new Error(`${label}ต้องเป็นชนิดไฟล์ที่อนุญาตเท่านั้น`);
  }

  if (file.size > options.maxSizeBytes) {
    const maxMb = options.maxSizeBytes / (1024 * 1024);
    throw new Error(`${label}ต้องมีขนาดไม่เกิน ${maxMb.toLocaleString('th-TH')} MB`);
  }
}
