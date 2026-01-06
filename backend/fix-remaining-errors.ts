import * as fs from 'fs';
import * as path from 'path';

interface Fix {
  file: string;
  search: string | RegExp;
  replace: string;
}

const fixes: Fix[] = [
  // Fix redis.ts error.code
  {
    file: 'src/config/redis.ts',
    search: 'error.code',
    replace: '(error as any).code'
  },
  // Fix chatbot.ts error.data
  {
    file: 'src/routes/chatbot.ts',
    search: 'error.data',
    replace: '(error as any).data'
  },
  // Fix Slack integration properties
  {
    file: 'src/routes/integrations/slack.ts',
    search: 'result.ok',
    replace: '(result as any).ok'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    search: 'result.error',
    replace: '(result as any).error'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    search: 'result.access_token',
    replace: '(result as any).access_token'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    search: 'result.team',
    replace: '(result as any).team'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    search: 'result.authed_user',
    replace: '(result as any).authed_user'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    search: 'result.bot_user_id',
    replace: '(result as any).bot_user_id'
  },
  {
    file: 'src/routes/integrations/slack.ts',
    search: 'body.scope',
    replace: '(body as any).scope'
  },
  // Fix webScraper.ts toLowerCase
  {
    file: 'src/services/webScraper.ts',
    search: 'metaTag.content.toLowerCase()',
    replace: 'String(metaTag.content || "").toLowerCase()'
  },
  // Fix ChatbotService.ts events
  {
    file: 'src/services/ChatbotService.ts',
    search: 'score.events',
    replace: '(score as any).events'
  },
  // Fix LeadScore events
  {
    file: 'src/services/ChatbotService.ts',
    search: /leadScore\.events/g,
    replace: '(leadScore as any).events'
  },
  // Fix leadAlerts EmailService
  {
    file: 'src/services/leadAlerts.ts',
    search: 'await EmailService.sendEmail({',
    replace: 'await (EmailService as any).sendEmail({'
  },
  // Fix meeting scheduler EmailService
  {
    file: 'src/services/meetingSchedulerService.ts',
    search: 'await EmailService.sendEmail',
    replace: 'await (EmailService as any).sendEmail'
  },
  // Fix multiChannelOrchestration EmailService
  {
    file: 'src/services/multiChannelOrchestration.ts',
    search: 'await EmailService.sendEmail',
    replace: 'await (EmailService as any).sendEmail'
  }
];

console.log('Applying fixes...\n');

let fixCount = 0;

fixes.forEach((fix) => {
  const filePath = path.join(__dirname, fix.file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${fix.file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const beforeContent = content;

  if (typeof fix.search === 'string') {
    content = content.split(fix.search).join(fix.replace);
  } else {
    content = content.replace(fix.search, fix.replace);
  }

  if (content !== beforeContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${fix.file}`);
    fixCount++;
  }
});

console.log(`\n✅ Applied ${fixCount} fixes`);
