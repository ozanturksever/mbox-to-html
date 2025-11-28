#!/usr/bin/env bun
import { convertMbox } from './index';
import { resolve } from 'path';

function showHelp() {
    console.log(`
mbox-to-html - Convert mbox email archives to HTML

Usage:
  bunx mbox-to-html <path> [options]
  mbox-to-html <path> [options]

Arguments:
  path          Path to an mbox file or directory containing mbox files

Options:
  -f, --force   Overwrite existing HTML files
  -h, --help    Show this help message
  -v, --version Show version number

Examples:
  bunx mbox-to-html ./emails.mbox
  bunx mbox-to-html ./mail-archive/ --force
`);
}

function showVersion() {
    console.log('mbox-to-html v1.0.0');
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
        showHelp();
        process.exit(0);
    }

    if (args.includes('-v') || args.includes('--version')) {
        showVersion();
        process.exit(0);
    }

    let inputPath = '';
    let force = false;

    for (const arg of args) {
        if (arg === '--force' || arg === '-f') {
            force = true;
        } else if (!arg.startsWith('-')) {
            inputPath = arg;
        }
    }

    if (!inputPath) {
        console.error('Error: No input file or directory specified.');
        console.error('Run with --help for usage information.');
        process.exit(1);
    }

    const resolvedPath = resolve(inputPath);

    try {
        await convertMbox(resolvedPath, { force });
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

main().catch(console.error);
