const fs = require('fs');

function addTooltipToComponent(filePath, targetRegex, replaceStr) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');

  if (!code.includes('Tooltip')) {
    if (code.includes("import {") && code.includes("lucide-react")) {
       code = code.replace(/import \{([^\}]+)\} from 'lucide-react'/, `import { $1, Info } from 'lucide-react'\nimport { Tooltip } from '@/components/ui/tooltip'`);
    } else {
       code = `import { Info } from 'lucide-react'\nimport { Tooltip } from '@/components/ui/tooltip'\n` + code;
    }
  }

  code = code.replace(targetRegex, replaceStr);
  fs.writeFileSync(filePath, code);
}

addTooltipToComponent(
  'src/app/agents/[id]/page.tsx',
  /<h2 className="text-lg font-semibold">Core Identity & Prompt<\/h2>/g,
  `<div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Core Identity & Prompt</h2><Tooltip content="Define the base instructions, goals, and behavioral guardrails for this AI agent"><Info className="w-4 h-4 text-[var(--text-muted)] cursor-help" /></Tooltip></div>`
);

addTooltipToComponent(
  'src/app/agents/[id]/page.tsx',
  /<h2 className="text-lg font-semibold">Learned Objection Handlers<\/h2>/g,
  `<div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Learned Objection Handlers</h2><Tooltip content="The Reflection Engine automatically extracts successful rebuttals from past calls and injects them here to improve future conversions"><Info className="w-4 h-4 text-[var(--text-muted)] cursor-help" /></Tooltip></div>`
);

addTooltipToComponent(
  'src/app/agents/[id]/page.tsx',
  /<h3 className="font-semibold text-\[var\(--text-primary\)\]">Voice Synthesis<\/h3>/g,
  `<div className="flex items-center gap-2"><h3 className="font-semibold text-[var(--text-primary)]">Voice Synthesis</h3><Tooltip content="Configure the acoustic properties of the agent's voice using providers like ElevenLabs"><Info className="w-4 h-4 text-[var(--text-muted)] cursor-help" /></Tooltip></div>`
);
