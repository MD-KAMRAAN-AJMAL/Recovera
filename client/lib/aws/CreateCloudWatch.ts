import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  PutSubscriptionFilterCommand,
  type LogGroup,
} from "@aws-sdk/client-cloudwatch-logs";
import { CloudCredential } from "../../generated/prisma/client";
import { decrypt } from "../encrypt";

export async function subscribeLogGroups(credential: CloudCredential, firehoseArn: string, cwRoleArn: string) {
    const cwLogs = new CloudWatchLogsClient({
        region: credential.region || "us-east-1",
        credentials: {
            accessKeyId: decrypt(credential.accessKeyId),
            secretAccessKey: decrypt(credential.secretAccessKey)
        },
    });

    // Paginate through ALL log groups (API returns max 50 per call)
    const allGroups: LogGroup[] = [];
    let nextToken: string | undefined;
    do {
        const response = await cwLogs.send(new DescribeLogGroupsCommand({ nextToken }));
        allGroups.push(...(response.logGroups || []));
        nextToken = response.nextToken;
    } while (nextToken);

    for (const group of allGroups) {
        if (!group.logGroupName) continue;

        await cwLogs.send(new PutSubscriptionFilterCommand({
            logGroupName: group.logGroupName,
            filterName: `AutoSRE-Firehose-Filter`,
            filterPattern: "", // Send everything
            destinationArn: firehoseArn,
            roleArn: cwRoleArn,
        }));
    }

    const names = allGroups.map(g => g.logGroupName).filter((name): name is string => name !== undefined);
    return names;
}
