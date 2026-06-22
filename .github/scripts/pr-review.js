const fs = require('fs');

async function run() {
  const githubToken = process.env.GITHUB_TOKEN;
  const apiKey = process.env.GEMINI_API_KEY;
  const repository = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!githubToken) {
    console.error('Error: GITHUB_TOKEN environment variable is not set.');
    process.exit(1);
  }

  if (!repository || !prNumber) {
    console.error('Error: GITHUB_REPOSITORY or PR_NUMBER environment variable is not set.');
    process.exit(1);
  }

  if (!apiKey) {
    console.warn('Warning: GEMINI_API_KEY is not set. Skipping AI PR review.');
    process.exit(0);
  }

  try {
    console.log(`Fetching diff for PR #${prNumber} in ${repository}...`);
    const diffUrl = `https://api.github.com/repos/${repository}/pulls/${prNumber}`;
    const diffResponse = await fetch(diffUrl, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3.diff',
        'User-Agent': 'Recovera-PR-Reviewer'
      }
    });

    if (!diffResponse.ok) {
      throw new Error(`Failed to fetch PR diff: ${diffResponse.statusText} (${diffResponse.status})`);
    }

    const diffText = await diffResponse.text();
    if (!diffText.trim()) {
      console.log('No diff found or PR is empty.');
      process.exit(0);
    }

    console.log(`Sending diff to Gemini (${model}) for review...`);
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const systemPrompt = `You are an expert software engineer and SRE reviewing a Pull Request.
Analyze the git diff provided and perform a basic review.
Provide your response in clear, professional Markdown format, covering:
1. **Overview**: A brief summary of what the PR changes.
2. **Key Findings**: Important observations (potential bugs, logical errors, security issues, performance concerns, or violations of clean code principles).
3. **Suggestions & Best Practices**: Concrete suggestions for improvement, with code blocks showing how to fix them where appropriate.
4. **Verdict**: A friendly concluding comment.

Keep your feedback constructive, polite, and clear. If the changes look excellent and no issues are found, praise the author and give a positive verdict.`;

    const userMessage = `Please review the following git diff for PR #${prNumber}:\n\n\`\`\`diff\n${diffText}\n\`\`\``;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        role: "user",
        parts: [{ text: userMessage }]
      }],
      generationConfig: {
        temperature: 0.2
      }
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API call failed: ${geminiResponse.statusText} (${geminiResponse.status}) - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const reviewText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reviewText) {
      throw new Error('Gemini API returned an empty response.');
    }

    console.log('Posting review comment to PR...');
    const commentUrl = `https://api.github.com/repos/${repository}/issues/${prNumber}/comments`;
    const commentResponse = await fetch(commentUrl, {
      method: 'POST',
      headers: {
        Authorization: `token ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Recovera-PR-Reviewer'
      },
      body: JSON.stringify({
        body: `### 🤖 Recovera AI Code Review\n\n${reviewText}`
      })
    });

    if (!commentResponse.ok) {
      const commentError = await commentResponse.text();
      throw new Error(`Failed to post comment: ${commentResponse.statusText} (${commentResponse.status}) - ${commentError}`);
    }

    console.log('AI PR Review successfully posted!');
  } catch (error) {
    console.error('Error during AI PR review:', error);
    process.exit(1);
  }
}

run();
