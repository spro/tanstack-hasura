const hasuraUrl = process.env.HASURA_GRAPHQL_URL || "http://localhost:8080"
const adminSecret =
    process.env.HASURA_GRAPHQL_ADMIN_SECRET || "dev-admin-secret"

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForHasura() {
    for (let attempt = 1; attempt <= 30; attempt++) {
        try {
            const response = await fetch(`${hasuraUrl}/healthz`)
            if (response.ok) {
                return
            }
        } catch (error) {
            void error
        }

        await sleep(1000)
    }

    throw new Error("Hasura did not become healthy in time")
}

async function metadataRequest(body) {
    const response = await fetch(`${hasuraUrl}/v1/metadata`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-hasura-admin-secret": adminSecret,
        },
        body: JSON.stringify(body),
    })

    const json = await response.json()

    if (!response.ok) {
        throw new Error(JSON.stringify(json))
    }

    return json
}

await waitForHasura()

await metadataRequest({
    type: "pg_track_table",
    args: {
        source: "default",
        table: {
            schema: "public",
            name: "posts",
        },
    },
}).catch(async (error) => {
    const message = String(error)

    if (
        message.includes("already tracked") ||
        message.includes("already exists in source")
    ) {
        return
    }

    throw error
})

console.log("Hasura metadata initialized")
