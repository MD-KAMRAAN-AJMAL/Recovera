import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

export async function POST(req: Request) {
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

    // 1. Verify credentials with AWS STS
    try {
      const stsClient = new STSClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      await stsClient.send(new GetCallerIdentityCommand({}));
    } catch (err: any) {
      console.error("AWS Validation Error:", err);
      return NextResponse.json(
        { error: "Invalid AWS credentials or insufficient permissions." },
        { status: 400 }
      );
    }

    // 2. Encrypt the secretAccessKey
    const encryptedSecret = encrypt(secretAccessKey);

    // 3. Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.cloudCredential.upsert({
      where: {
        userId_provider_label: {
          userId: user.id,
          provider: "aws",
          label: label || "My AWS Account",
        },
      },
      update: {
        accessKeyId,
        secretAccessKey: encryptedSecret,
        region,
        isActive: true,
        lastVerifiedAT: new Date(),
      },
      create: {
        userId: user.id,
        provider: "aws",
        label: label || "My AWS Account",
        accessKeyId,
        secretAccessKey: encryptedSecret,
        region,
        isActive: true,
        lastVerifiedAT: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Integration Setup Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
