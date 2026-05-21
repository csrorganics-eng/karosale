import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let s3Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3Client) {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Cloudflare R2 credentials not configured");
    }
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return s3Client;
}

export async function uploadToR2(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<string> {
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "karosale-media";
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );

  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  return publicUrl ? `${publicUrl}/${params.key}` : params.key;
}
