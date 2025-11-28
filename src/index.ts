import PostalMime from 'postal-mime';
import { createReadStream, createWriteStream } from 'fs';
import { stat, readdir } from 'fs/promises';
import { basename, dirname, join, extname } from 'path';

// --- Helper Types ---
export interface ParsedEmail {
    subject?: string;
    from?: { address?: string; name?: string };
    date?: string;
    html?: string;
    text?: string;
    messageId?: string;
    headers?: { key: string; value: string }[];
}

export interface ConvertOptions {
    force?: boolean;
}

// --- HTML Templates ---
const HTML_HEADER = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Archive</title>
    <style>
        :root {
            --bg-color: #f4f4f9;
            --card-bg: #ffffff;
            --text-color: #333;
            --meta-color: #666;
            --border-color: #e0e0e0;
            --accent-color: #007bff;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .email-card {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            margin-bottom: 30px;
            overflow: hidden;
            border: 1px solid var(--border-color);
        }
        .email-header {
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
            background-color: #fafafa;
        }
        .email-subject {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0 0 10px 0;
            color: #1a1a1a;
        }
        .email-meta {
            font-size: 0.9rem;
            color: var(--meta-color);
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }
        .meta-item {
            display: flex;
            align-items: center;
        }
        .meta-label {
            font-weight: 500;
            margin-right: 5px;
        }
        .email-body {
            padding: 20px;
            overflow-x: auto;
        }
        .email-body img {
            max-width: 100%;
            height: auto;
        }
        .email-body blockquote {
            margin: 0;
            padding-left: 15px;
            border-left: 3px solid #ddd;
            color: #555;
        }
        .toggle-view {
            font-size: 0.8rem;
            color: var(--accent-color);
            cursor: pointer;
            text-decoration: underline;
            margin-top: 5px;
            display: inline-block;
        }
        .headers-details {
            margin-top: 15px;
            font-size: 0.85rem;
            border-top: 1px dashed #eee;
            padding-top: 10px;
        }
        .headers-details summary {
            cursor: pointer;
            color: var(--accent-color);
            margin-bottom: 10px;
            outline: none;
        }
        .headers-table {
            width: 100%;
            border-collapse: collapse;
        }
        .headers-table td {
            padding: 4px 0;
            vertical-align: top;
        }
        .header-key {
            font-weight: 600;
            color: #555;
            width: 150px;
            padding-right: 10px;
        }
        .header-value {
            color: #333;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Email Archive</h1>
`;

const HTML_FOOTER = `
    </div>
</body>
</html>
`;

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function generateEmailHtml(email: ParsedEmail, index: number): string {
    const subject = escapeHtml(email.subject || '(No Subject)');
    const from = email.from 
        ? (email.from.name 
            ? `${escapeHtml(email.from.name)} &lt;${escapeHtml(email.from.address || '')}&gt;` 
            : escapeHtml(email.from.address || '')) 
        : '(Unknown Sender)';
    const date = email.date ? new Date(email.date).toLocaleString() : '(No Date)';

    let bodyContent = '';
    if (email.html) {
        bodyContent = `<div class="html-content">${email.html}</div>`;
    } else if (email.text) {
        bodyContent = `<pre style="white-space: pre-wrap; font-family: monospace;">${escapeHtml(email.text)}</pre>`;
    } else {
        bodyContent = '<p><em>(No content)</em></p>';
    }

    let headersHtml = '';
    if (email.headers && email.headers.length > 0) {
        const rows = email.headers.map(h => {
            if (h.key.toLowerCase().startsWith('from ') && h.value.match(/\d{4}/)) return '';
            return `
                <tr>
                    <td class="header-key">${escapeHtml(h.key)}:</td>
                    <td class="header-value">${escapeHtml(h.value)}</td>
                </tr>
             `;
        }).join('');

        if (rows) {
            headersHtml = `
                <details class="headers-details">
                    <summary>Detailed Headers</summary>
                    <table class="headers-table">
                        ${rows}
                    </table>
                </details>
            `;
        }
    }

    return `
        <div class="email-card" id="email-${index}">
            <div class="email-header">
                <h2 class="email-subject">${subject}</h2>
                <div class="email-meta">
                    <div class="meta-item"><span class="meta-label">From:</span> ${from}</div>
                    <div class="meta-item"><span class="meta-label">Date:</span> ${date}</div>
                </div>
                ${headersHtml}
            </div>
            <div class="email-body">
                ${bodyContent}
            </div>
        </div>
    `;
}

async function processMboxFile(mboxPath: string, force: boolean): Promise<number> {
    const outputDir = dirname(mboxPath);
    const outputFilename = basename(mboxPath) + '.html';
    const outputPath = join(outputDir, outputFilename);

    try {
        await stat(outputPath);
        if (!force) {
            console.log(`Skipping ${mboxPath} (HTML already exists). Use --force to overwrite.`);
            return 0;
        }
        console.log(`Overwriting ${outputPath}...`);
    } catch (e) {
        // File doesn't exist, proceed
    }

    console.log(`Processing ${mboxPath}...`);

    const outputStream = createWriteStream(outputPath);
    outputStream.write(HTML_HEADER);

    let emailCount = 0;

    const stream = createReadStream(mboxPath);
    let buffer: Buffer = Buffer.alloc(0);

    const processEmail = async (emailBuf: Buffer) => {
        try {
            const parser = new PostalMime();
            const parsed = await parser.parse(emailBuf);
            const html = generateEmailHtml(parsed, emailCount++);
            outputStream.write(html);
            if (emailCount % 100 === 0) {
                process.stdout.write(`\rProcessed ${emailCount} emails...`);
            }
        } catch (err) {
            console.error(`\nError parsing email #${emailCount}:`, err);
        }
    };

    for await (const chunk of stream) {
        let currentChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

        while (true) {
            buffer = Buffer.concat([buffer, currentChunk]);

            const separator = Buffer.from('\nFrom ');
            const fromIndex = buffer.indexOf(separator);

            if (fromIndex !== -1) {
                const emailContent = buffer.slice(0, fromIndex + 1);

                if (emailContent.length > 0) {
                    await processEmail(emailContent);
                }

                buffer = buffer.slice(fromIndex + 1);
                currentChunk = Buffer.alloc(0);
            } else {
                break;
            }
        }
    }

    if (buffer.length > 0) {
        await processEmail(buffer);
    }

    outputStream.write(HTML_FOOTER);
    outputStream.end();

    console.log(`\nFinished ${mboxPath}: Processed ${emailCount} emails.`);
    console.log(`Output: ${outputPath}`);
    
    return emailCount;
}

async function* getMboxFiles(dir: string): AsyncGenerator<string> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* getMboxFiles(fullPath);
        } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.mbox') {
            yield fullPath;
        }
    }
}

/**
 * Convert mbox file(s) to HTML
 * @param inputPath - Path to mbox file or directory containing mbox files
 * @param options - Conversion options
 */
export async function convertMbox(inputPath: string, options: ConvertOptions = {}): Promise<void> {
    const { force = false } = options;
    
    const stats = await stat(inputPath);

    if (stats.isDirectory()) {
        console.log(`Scanning directory recursively: ${inputPath}`);

        let foundCount = 0;
        let totalEmails = 0;
        
        for await (const mboxFile of getMboxFiles(inputPath)) {
            foundCount++;
            totalEmails += await processMboxFile(mboxFile, force);
        }

        if (foundCount === 0) {
            console.log('No .mbox files found in directory.');
        } else {
            console.log(`\nTotal .mbox files processed: ${foundCount}`);
            console.log(`Total emails converted: ${totalEmails}`);
        }

    } else if (stats.isFile()) {
        await processMboxFile(inputPath, force);
    } else {
        throw new Error('Input is not a file or directory.');
    }
}

export { generateEmailHtml, processMboxFile };
