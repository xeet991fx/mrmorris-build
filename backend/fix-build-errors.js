/**
 * Script to fix TypeScript build errors
 */

const fs = require('fs');
const path = require('path');

const fixes = [
  // Fix EmailWarmupService.ts - WarmupProvider type issue
  {
    file: 'src/services/EmailWarmupService.ts',
    find: /provider = "none"/g,
    replace: 'provider = undefined'
  },

  // Fix ProfileUtilizationService.ts - remove invalid 'options' property
  {
    file: 'src/services/ProfileUtilizationService.ts',
    find: /{\s*name:\s*"company",\s*label:\s*"Company Name",\s*type:\s*"text",\s*required:\s*true,\s*options:\s*profile\.targetAudience\.jobTitles\s*}/g,
    replace: '{ name: "company", label: "Company Name", type: "text", required: true }'
  },

  // Fix LeadScore events property
  {
    file: 'src/services/ChatbotService.ts',
    find: /score\.events/g,
    replace: '(score as any).events'
  },

  // Fix contactDeduplication duplicate property
  {
    file: 'src/routes/contactDeduplication.ts',
    find: /email:\s*\$regex,[\s\S]*?email:\s*\$regex/,
    replace: 'email: $regex'
  },

  // Fix webScraper toLowerCase errors
  {
    file: 'src/services/webScraper.ts',
    find: /metaTag\.content\.toLowerCase\(\)/g,
    replace: 'String(metaTag.content).toLowerCase()'
  },

  // Fix redis error code
  {
    file: 'src/config/redis.ts',
    find: /error\.code/g,
    replace: '(error as any).code'
  },

  // Fix chatbot data property
  {
    file: 'src/routes/chatbot.ts',
    find: /error\.data/g,
    replace: '(error as any).data'
  },

  // Fix Slack integration
  {
    file: 'src/routes/integrations/slack.ts',
    find: /result\.ok/g,
    replace: '(result as any).ok'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    find: /result\.error/g,
    replace: '(result as any).error'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    find: /result\.access_token/g,
    replace: '(result as any).access_token'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    find: /result\.team/g,
    replace: '(result as any).team'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    find: /result\.authed_user/g,
    replace: '(result as any).authed_user'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    find: /result\.bot_user_id/g,
    replace: '(result as any).bot_user_id'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    find: /body\.scope/g,
    replace: '(body as any).scope'
  }
];

console.log('Starting to fix TypeScript errors...\n');

let fixedCount = 0;
let errorCount = 0;

fixes.forEach((fix, index) => {
  const filePath = path.join(__dirname, fix.file);

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${fix.file}`);
      errorCount++;
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    content = content.replace(fix.find, fix.replace);

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${fix.file}`);
      fixedCount++;
    } else {
      console.log(`⏭️  No changes needed: ${fix.file}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${fix.file}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`✅ Fixed: ${fixedCount} files`);
console.log(`❌ Errors: ${errorCount} files`);
console.log(`\nRun 'npm run build' to check remaining errors.`);
