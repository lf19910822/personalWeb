import fs from "fs/promises";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

/**
 * 统一对象存储抽象层。
 * - 配置了腾讯云 COS(S3 兼容)环境变量时,对象落到 COS 桶(国内访问快、持久化)。
 * - 未配置时自动降级到本地 data/objects/ 目录(开发期零依赖即可运行)。
 * 简历 PDF、访客记录、留言与 RAG 索引均经此层持久化；部署到 Serverless 时请配置 COS。
 */

type CosConf = { client: S3Client; bucket: string } | null;

let _cos: CosConf | undefined;
function getCos(): CosConf {
  if (_cos !== undefined) return _cos;
  const endpoint = process.env.COS_ENDPOINT; // 例如 https://cos.ap-guangzhou.myqcloud.com
  const region = process.env.COS_REGION || "ap-guangzhou";
  const secretId = process.env.COS_SECRET_ID;
  const secretKey = process.env.COS_SECRET_KEY;
  const bucket = process.env.COS_BUCKET; // 例如 resume-1250000000
  if (!endpoint || !secretId || !secretKey || !bucket) {
    _cos = null;
    return _cos;
  }
  const client = new S3Client({
    endpoint,
    region,
    // 腾讯云 COS 要求 virtual-hosted-style：<bucket>.cos.<region>.myqcloud.com。
    forcePathStyle: false,
    credentials: { accessKeyId: secretId, secretAccessKey: secretKey },
  });
  _cos = { client, bucket };
  return _cos;
}

const LOCAL_DIR = path.join(process.cwd(), "data", "objects");

async function localPut(key: string, body: Buffer) {
  const p = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
}
async function localGet(key: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(LOCAL_DIR, key));
  } catch {
    return null;
  }
}
async function localDelete(key: string) {
  try {
    await fs.unlink(path.join(LOCAL_DIR, key));
  } catch {}
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType?: string
): Promise<void> {
  const cos = getCos();
  if (cos) {
    await cos.client.send(
      new PutObjectCommand({
        Bucket: cos.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return;
  }
  await localPut(key, body);
}

export async function getObject(
  key: string
): Promise<{ body: Buffer; contentType?: string } | null> {
  const cos = getCos();
  if (cos) {
    try {
      const res = await cos.client.send(
        new GetObjectCommand({ Bucket: cos.bucket, Key: key })
      );
      const bytes = await res.Body!.transformToByteArray();
      return { body: Buffer.from(bytes), contentType: res.ContentType };
    } catch {
      return null;
    }
  }
  const body = await localGet(key);
  return body ? { body } : null;
}

export async function deleteObject(key: string): Promise<void> {
  const cos = getCos();
  if (cos) {
    await cos.client.send(
      new DeleteObjectCommand({ Bucket: cos.bucket, Key: key })
    );
    return;
  }
  await localDelete(key);
}

/** 读取 JSON 对象(不存在返回 fallback) */
export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const obj = await getObject(key);
  if (!obj) return fallback;
  try {
    return JSON.parse(obj.body.toString("utf8")) as T;
  } catch {
    return fallback;
  }
}

/** 写入 JSON 对象 */
export async function writeJson(key: string, value: unknown): Promise<void> {
  await putObject(
    key,
    Buffer.from(JSON.stringify(value, null, 2), "utf8"),
    "application/json"
  );
}

export function storageBackend(): "cos" | "local" {
  return getCos() ? "cos" : "local";
}
