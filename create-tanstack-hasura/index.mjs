#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import readline from "node:readline/promises"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const templateDir = path.join(__dirname, "template")

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

function toPackageName(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

function isTextFile(filePath) {
    return /\.(json|md|ts|tsx|js|mjs|css|yml|yaml|env|txt|gitignore)$/i.test(
        filePath,
    )
}

function copyDir(sourceDir, targetDir) {
    fs.mkdirSync(targetDir, { recursive: true })

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
        const sourcePath = path.join(sourceDir, entry.name)
        const targetPath = path.join(targetDir, entry.name)

        if (entry.isDirectory()) {
            copyDir(sourcePath, targetPath)
            continue
        }

        fs.copyFileSync(sourcePath, targetPath)
    }
}

function replaceInFiles(dir, replacements) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            replaceInFiles(fullPath, replacements)
            continue
        }

        if (!isTextFile(fullPath)) {
            continue
        }

        let content = fs.readFileSync(fullPath, "utf8")

        for (const [from, to] of replacements) {
            content = content.split(from).join(to)
        }

        fs.writeFileSync(fullPath, content)
    }
}

function ensureEmptyTargetDir(targetDir) {
    if (!fs.existsSync(targetDir)) {
        return
    }

    const files = fs.readdirSync(targetDir)
    if (files.length > 0) {
        console.error(`Target directory is not empty: ${targetDir}`)
        process.exit(1)
    }
}

async function main() {
    const argTarget = process.argv[2]
    const rawName =
        argTarget ||
        (await rl.question(
            "Project name (for example: my-tanstack-hasura-app): ",
        ))

    const projectName = toPackageName(rawName)

    if (!projectName) {
        console.error("A valid project name is required")
        process.exit(1)
    }

    const targetDir = path.resolve(process.cwd(), projectName)

    ensureEmptyTargetDir(targetDir)
    copyDir(templateDir, targetDir)
    replaceInFiles(targetDir, [["__PROJECT_NAME__", projectName]])

    console.log(`\nCreated ${projectName} in ${targetDir}\n`)
    console.log("Next steps:")
    console.log(`  cd ${projectName}`)
    console.log("  npm install")
    console.log("  cp .env.example .env")
    console.log("  npm run hasura:up")
    console.log("  npm run dev\n")
    console.log("Then open:")
    console.log("  http://localhost:3000")
    console.log("  http://localhost:8080/console\n")
}

main()
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
    .finally(() => {
        rl.close()
    })
