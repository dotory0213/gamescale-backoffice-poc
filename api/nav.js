

// Helper to getenv variables
const getEnv = () => ({
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_REPO_OWNER,
    repo: process.env.GITHUB_REPO_NAME,
    path: process.env.GITHUB_TARGET_FILE_PATH
});

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with your specific origin if needed
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { token, owner, repo, path } = getEnv();

    if (!token || !owner || !repo || !path) {
        return res.status(500).json({
            error: 'Server configuration error. Missing GitHub Environment Variables.',
            details: { hasToken: !!token, owner, repo, path }
        });
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    try {
        if (req.method === 'GET') {
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`GitHub API Error (GET): ${response.status} ${errorText}`);
            }

            const data = await response.json();
            // content is base64 encoded
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            return res.status(200).json(JSON.parse(content));
        }

        if (req.method === 'POST') {
            // 1. Get current SHA first (required for update)
            const getResponse = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                }
            });

            if (!getResponse.ok) {
                const errorText = await getResponse.text();
                throw new Error(`GitHub API Error (GET SHA): ${getResponse.status} ${errorText}`);
            }

            const currentFile = await getResponse.json();
            const sha = currentFile.sha;

            // 2. Prepare new content
            // req.body is already an object if content-type is json
            const newContent = JSON.stringify(req.body, null, 4);
            const encodedContent = Buffer.from(newContent).toString('base64');

            // 3. Update file via PUT
            const putResponse = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Update navData via Backoffice',
                    content: encodedContent,
                    sha: sha
                })
            });

            if (!putResponse.ok) {
                const errorText = await putResponse.text();
                throw new Error(`GitHub API Error (PUT): ${putResponse.status} ${errorText}`);
            }

            const result = await putResponse.json();
            return res.status(200).json({ success: true, commit: result.commit });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
