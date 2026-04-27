import { S3Client, CreateBucketCommand, BucketLocationConstraint } from "@aws-sdk/client-s3";
import { decrypt } from "../encrypt";
import { CloudCredential } from "../../generated/prisma/client";

export async function createLogBucket(credential: CloudCredential, userId: string) {
    const region = credential.region || "us-east-1";
    // Keep name deterministic (same user + region = same bucket) and under 63 chars
    const bucketName = `recovera-${userId}-${region}`;

    const s3 = new S3Client({
        region,
        credentials: {
            accessKeyId: decrypt(credential.accessKeyId),
            secretAccessKey: decrypt(credential.secretAccessKey),
        },
    });

    try {
        await s3.send(new CreateBucketCommand({
            Bucket: bucketName,
            ...(region !== "us-east-1" && {
                CreateBucketConfiguration: {
                    LocationConstraint: region as BucketLocationConstraint,
                },
            }),
        }));
    } catch (error: any) {
        // Bucket already exists — that's fine, we reuse it
        if (error.name !== "BucketAlreadyOwnedByYou" && error.name !== "BucketAlreadyExists") {
            throw error;
        }
    }

    return bucketName;
}