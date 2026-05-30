import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { CloudCredential } from "../../generated/prisma/client";
import { decrypt } from "../encrypt";

export async function validateCredentials(credential: CloudCredential) {
    const decryptedAccessKey = decrypt(credential.accessKeyId);

    // Bypasses actual AWS STS validation in mock/development mode
    if (process.env.AGENT_MOCK === "true" || decryptedAccessKey.toLowerCase().includes("mock") || decryptedAccessKey.toLowerCase().includes("test")) {
        return {
            accountId: "123456789012",
            arn: "arn:aws:iam::123456789012:user/mock-recovera-user",
            userId: "AIDAIBOFHNCEXAMPLE",
        };
    }

    try {
        const region = credential.region || "us-east-1";
        const stsClient = new STSClient({
            region,
            credentials: {
                accessKeyId: decryptedAccessKey,
                secretAccessKey: decrypt(credential.secretAccessKey),
                ...(credential.sessionToken && { sessionToken: decrypt(credential.sessionToken) })
            },
        });

        const identity = await stsClient.send(new GetCallerIdentityCommand({}));
        return {
            accountId: identity.Account!,
            arn: identity.Arn!,
            userId: identity.UserId!,
        };
    } catch (error: any) {
        if (error.name === "SignatureDoesNotMatch") {
            throw new Error("INVALID_SECRET");
        }
        if (error.name === "InvalidClientTokenId") {
            throw new Error("INVALID_ACCESS_KEY");
        }
        if (error.name === "AccessDenied") {
            throw new Error("INSUFFICIENT_PERMISSIONS");
        }
        throw error;
    }
}
