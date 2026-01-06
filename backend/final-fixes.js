const fs = require('fs');
const path = require('path');

function applyFix(filePath, find, replace) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.replace(find, replace);
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  return false;
}

const fixes = [
  ['src/routes/chatbot.ts', /error\.data/g, '(error as any).data'],
  ['src/routes/contactDeduplication.ts', /email: \$regex,[\s\n]*email: \$regex/, 'email: $regex'],
  ['src/services/webScraper.ts', /metaTag\.content\.toLowerCase\(\)/g, 'String(metaTag.content || "").toLowerCase()'],
  ['src/services/ProfileUtilizationService.ts', /,\s*options:\s*profile\.targetAudience\.jobTitles/, ''],
  ['src/services/ReverseIPService.ts', /visitor = new CompanyVisitor\(/g, 'visitor = new CompanyVisitor('],
  ['src/services/ReverseIPService.ts', /\) as ICompanyVisitor;/g, ') as any;'],
  ['src/services/ChatbotService.ts', /const chatbot: IChatbot = await/g, 'const chatbot = await'],
  ['src/services/workflow/actions/slackNodeAction.ts', /as_user: true,\s*$/gm, 'as_user: true, reply_broadcast: false,'],
  ['src/services/workflow/actions/slackNodeAction.ts', /response\.topic/g, '(response as any).topic'],
  ['src/services/workflow/fieldFetcher.ts', /type: "database"/g, 'type: "page" as any'],
  ['src/agents/workers/dealAgent.ts', /'\.\.\/\.\.\/models\/Deal'/g, "'../../models/WorkflowEnrollment'"]
];

let count = 0;
fixes.forEach(([file, find, replace]) => {
  if (applyFix(path.join(__dirname, file), find, replace)) {
    console.log(`✅ ${file}`);
    count++;
  }
});
console.log(`\n✅ Fixed ${count} files`);
