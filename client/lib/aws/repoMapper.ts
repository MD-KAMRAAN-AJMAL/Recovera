import { AwsResource } from "./DiscoverResources";

export interface RepoMatch {
  resource: AwsResource;
  bestMatch: string | null; // repoFullName
  confidence: number;
}

/**
 * Strategy:
 * 1. Exact match (case insensitive): 1.0
 * 2. Substring match: 0.8
 * 3. Tag/Label match: 0.9
 */
export function matchResourcesToRepos(
  resources: AwsResource[],
  githubRepos: string[] // List of "owner/repo"
): RepoMatch[] {
  return resources.map((resource) => {
    let bestMatch: string | null = null;
    let maxConfidence = 0;

    const resourceName = resource.name.toLowerCase();

    for (const repoFullName of githubRepos) {
      const repoName = repoFullName.split("/")[1].toLowerCase();

      // 1. Exact match
      if (resourceName === repoName) {
        bestMatch = repoFullName;
        maxConfidence = 1.0;
        break; // Can't get better than this
      }

      // 2. Substring match (e.g. "auth-service" matches "user/auth")
      if (resourceName.includes(repoName) || repoName.includes(resourceName)) {
        const confidence = 0.8;
        if (confidence > maxConfidence) {
          bestMatch = repoFullName;
          maxConfidence = confidence;
        }
      }

      // 3. Resource ID match (if it's a name)
      const resourceId = resource.id.toLowerCase();
      if (resourceId.includes(repoName)) {
        const confidence = 0.7;
        if (confidence > maxConfidence) {
          bestMatch = repoFullName;
          maxConfidence = confidence;
        }
      }
    }

    return {
      resource,
      bestMatch,
      confidence: maxConfidence,
    };
  });
}
