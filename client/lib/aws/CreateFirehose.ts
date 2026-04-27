import { FirehoseClient, CreateDeliveryStreamCommand, DescribeDeliveryStreamCommand } from "@aws-sdk/client-firehose";
import { CloudCredential } from "../../generated/prisma/client";
import { decrypt } from "../encrypt";

export async function createDeliveryStream(
    credential: CloudCredential,
    userId: string,
    firehoseRoleArn: string,
    bucketName: string,
    ingestUrl: string
) {
    const region = credential.region || "us-east-1";
    const firehose = new FirehoseClient({
        region,
        credentials: {
            accessKeyId: decrypt(credential.accessKeyId),
            secretAccessKey: decrypt(credential.secretAccessKey),
        },
    });

    const streamName = `AutoSRE-LogStream-${userId}-${region}`;

    try {
        const createStream = new CreateDeliveryStreamCommand({
            DeliveryStreamName: streamName,
            DeliveryStreamType: "DirectPut",
            HttpEndpointDestinationConfiguration: {
                EndpointConfiguration: {
                    Url: ingestUrl,
                    Name: "AutoSRE-Ingest-Endpoint",
                },
                S3BackupMode: "AllData",
                S3Configuration: {
                    RoleARN: firehoseRoleArn,
                    BucketARN: `arn:aws:s3:::${bucketName}`,
                    Prefix: "firehose-logs/",
                    ErrorOutputPrefix: "firehose-errors/",
                    BufferingHints: {
                        SizeInMBs: 5,
                        IntervalInSeconds: 300,
                    },
                },
                RoleARN: firehoseRoleArn,
                BufferingHints: {
                    SizeInMBs: 1,
                    IntervalInSeconds: 60,
                },
                RetryOptions: {
                    DurationInSeconds: 300,
                },
            },
        });

        await firehose.send(createStream);
    } catch (error: any) {
        if (error.name !== "ResourceInUseException") {
            throw error;
        }
        // If it already exists, we just proceed
    }

    // Wait until stream is active (max ~60 seconds)
    const maxAttempts = 12;
    let attempts = 0;
    let isActive = false;
    while (!isActive && attempts < maxAttempts) {
        attempts++;
        const describe = await firehose.send(new DescribeDeliveryStreamCommand({
            DeliveryStreamName: streamName
        }));
        if (describe.DeliveryStreamDescription?.DeliveryStreamStatus === "ACTIVE") {
            isActive = true;
        } else {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    if (!isActive) {
        throw new Error(`Firehose stream "${streamName}" failed to reach ACTIVE status after ${maxAttempts} attempts.`);
    }

    const describe = await firehose.send(new DescribeDeliveryStreamCommand({
        DeliveryStreamName: streamName
    }));

    return describe.DeliveryStreamDescription!.DeliveryStreamARN!;
}
