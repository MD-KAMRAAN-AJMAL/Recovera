import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import { validateCredentials } from "@/lib/aws/ValidateCredentials";
import { createLogBucket } from "@/lib/aws/CreateS3Bucket";
import { subscribeLogGroups } from "@/lib/aws/CreateCloudWatch";
import { createFirehoseRoles } from "@/lib/aws/CreateIamRoles";
import { createDeliveryStream } from "@/lib/aws/CreateFirehose";

export async function POST(req: Request) {
  // Track created resources for rollback logging on failure
  const createdResources: string[] = [];

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { provider, label, accessKeyId, secretAccessKey, region } = body;

    if (!accessKeyId || !secretAccessKey || !region || provider !== "aws") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Encrypt both credentials
    const encryptedAccessKey = encrypt(accessKeyId);
    const encryptedSecret = encrypt(secretAccessKey);

    // 2. Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Save credential to DB
    const credential = await prisma.cloudCredential.upsert({
      where: {
        userId_provider_label: {
          userId: user.id,
          provider: "aws",
          label: label || "My AWS Account",
        },
      },
      update: {
        accessKeyId: encryptedAccessKey,
        secretAccessKey: encryptedSecret,
        region,
        isActive: true,
        lastVerifiedAT: new Date(),
      },
      create: {
        userId: user.id,
        provider: "aws",
        label: label || "My AWS Account",
        accessKeyId: encryptedAccessKey,
        secretAccessKey: encryptedSecret,
        region,
        isActive: true,
        lastVerifiedAT: new Date(),
      },
    });

    // 4. Validate credentials with AWS STS
    const identity = await validateCredentials(credential);

    // 5. Create S3 bucket (for Long-Term Backup)
    const bucketName = await createLogBucket(credential, user.id);
    createdResources.push(`S3 Bucket: ${bucketName}`);

    // 6. Create IAM Roles for Firehose & CloudWatch
    const { firehoseRoleArn, cwRoleArn } = await createFirehoseRoles(credential, bucketName, identity.accountId, region);
    createdResources.push(`Firehose IAM Role: ${firehoseRoleArn}`);
    createdResources.push(`CloudWatch IAM Role: ${cwRoleArn}`);

    // 7. Create Kinesis Data Firehose Stream
    const ingestUrl = process.env.INGEST_API_URL;
    if (!ingestUrl) {
      throw new Error("INGEST_API_URL environment variable is not set.");
    }
    const firehoseArn = await createDeliveryStream(credential, user.id, firehoseRoleArn, bucketName, ingestUrl);
    createdResources.push(`Firehose Stream: ${firehoseArn}`);

    // 8. Subscribe CloudWatch log groups to Firehose
    const logGroups = await subscribeLogGroups(credential, firehoseArn, cwRoleArn);

    // 9. Save integration status to DB
    await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: "aws",
        },
      },
      update: {
        credentialId: credential.id,
        s3BucketName: bucketName,
        firehoseArn,
        logGroups,
        status: "active",
        lastSyncAt: new Date(),
      },
      create: {
        userId: user.id,
        credentialId: credential.id,
        provider: "aws",
        s3BucketName: bucketName,
        firehoseArn,
        logGroups,
        status: "active",
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, bucketName, logGroups });
  } catch (error: any) {
    console.error("Integration Setup Error:", error);
    if (createdResources.length > 0) {
      console.error("⚠️  Partial resources were created before failure. Manual cleanup may be required:");
      createdResources.forEach(r => console.error(`   - ${r}`));
    }
    return NextResponse.json(
      { error: "Failed to setup integration. Please check credentials and permissions." },
      { status: 500 }
    );
  }
}
