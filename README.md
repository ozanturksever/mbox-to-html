# mbox-to-html

Convert mbox email archives to beautiful, readable HTML files.

## Features

- 📧 Converts mbox files to clean, styled HTML
- 📁 Process single files or entire directories recursively
- 🎨 Beautiful responsive design with CSS styling
- 📋 Expandable email headers
- ⚡ Streaming parser for handling large mbox files
- 🔄 Skip existing files or force overwrite

## Installation

### Using bunx (recommended)

No installation needed! Just run:

```bash
bunx mbox-to-html <path-to-mbox>
```

### Global installation

```bash
bun install -g mbox-to-html
```

### Using npm/npx

```bash
npx mbox-to-html <path-to-mbox>
```

## Usage

### Convert a single mbox file

```bash
bunx mbox-to-html ./emails.mbox
```

This creates `emails.mbox.html` in the same directory.

### Convert all mbox files in a directory

```bash
bunx mbox-to-html ./mail-archive/
```

Recursively finds and converts all `.mbox` files.

### Force overwrite existing files

```bash
bunx mbox-to-html ./emails.mbox --force
```

## Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--force` | `-f` | Overwrite existing HTML files |
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version number |

## Programmatic Usage

You can also use mbox-to-html as a library:

```typescript
import { convertMbox } from 'mbox-to-html';

// Convert a single file
await convertMbox('./emails.mbox');

// Convert with options
await convertMbox('./mail-archive/', { force: true });
```

## Output

The generated HTML includes:

- Email subject, sender, and date
- Full email body (HTML or plain text)
- Collapsible detailed headers section
- Responsive design that works on mobile and desktop
- Clean, modern styling

## Requirements

- [Bun](https://bun.sh) runtime (for best performance)
- Or Node.js 18+

## License

MIT © Ozan Turksever
