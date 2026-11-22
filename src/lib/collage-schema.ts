import { z } from "zod";

export const COLLAGE_SCHEMA_VERSION = 1;
export const MAX_IMAGE_BYTES = 700_000;

const element = z.object({
  id: z.string().max(40),
  kind: z.enum(["image", "shape", "paper", "text", "sticker"]),
  x: z.number().finite(),
  y: z.number().finite(),
  rotation: z.number().finite(),
  scaleX: z.number().finite().min(0.05).max(20),
  scaleY: z.number().finite().min(0.05).max(20),
  src: z.string().max(200).optional(),
  shape: z.enum(["rect", "circle", "triangle"]).optional(),
  fill: z.string().max(20).optional(),
  text: z.string().max(80).optional(),
  w: z.number().finite().max(2000).optional(),
  h: z.number().finite().max(2000).optional(),
});

export const submissionSchema = z.object({
  composition: z.object({ version: z.literal(COLLAGE_SCHEMA_VERSION), size: z.number().max(2000), elements: z.array(element).min(1).max(60) }),
  image: z
    .string()
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, "Imagen inválida")
    .refine((s) => (s.length * 3) / 4 < MAX_IMAGE_BYTES, "La imagen es demasiado grande"),
  message: z.string().trim().min(2, "Escribe un mensaje breve").max(240),
  signature: z.string().trim().max(40).optional().default(""),
  acceptRules: z.literal(true),
  consent: z.literal(true),
  /** campo trampa contra bots: debe llegar vacío */
  website: z.string().max(0).optional().default(""),
});

export type Submission = z.infer<typeof submissionSchema>;
export type CollageElement = z.infer<typeof element>;

/** Bloquea datos personales evidentes en mensajes y firmas (teléfonos, correos, documentos). */
export function containsPersonalData(text: string) {
  return /[\w.+-]+@[\w-]+\.[\w.]+/.test(text) || /(\+?\d[\d\s-]{7,}\d)/.test(text) || /\b(c[eé]dula|cc|nit|pasaporte)\b/i.test(text);
}

export function sanitize(text: string) {
  return text.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}
