import fs from 'fs';
import path from 'path';

/**
 * Dynamically discover available models in the system
 */
export function discoverModels(): string[] {
    try {
        const modelsDir = path.join(__dirname, '../../models');
        const files = fs.readdirSync(modelsDir);

        return files
            .filter(f => f.endsWith('.ts') && f !== 'index.ts')
            .map(f => f.replace('.ts', ''));
    } catch (error) {
        console.warn('⚠️  Model discovery failed:', error);
        return [];
    }
}

/**
 * Safe model import with fallback - NEVER crashes
 */
export async function safeImportModel(modelName: string): Promise<any | null> {
    try {
        const module = await import(`../../models/${modelName}`);
        return module.default;
    } catch (error) {
        console.warn(`⚠️  Model ${modelName} not found`);
        return null;
    }
}

/**
 * Find best matching model for a concept using semantic mapping
 */
export function findBestModel(concept: string, availableModels: string[]): string | null {
    const conceptLower = concept.toLowerCase();

    // Direct matches
    const directMatch = availableModels.find(m =>
        m.toLowerCase() === conceptLower
    );
    if (directMatch) return directMatch;

    // Partial matches
    const partialMatch = availableModels.find(m =>
        m.toLowerCase().includes(conceptLower) ||
        conceptLower.includes(m.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // Semantic mapping (what users call things → actual models)
    const semanticMap: Record<string, string> = {
        'deal': 'Opportunity',
        'deals': 'Opportunity',
        'sale': 'Opportunity',
        'sales': 'Opportunity',
        'opportunity': 'Opportunity',
        'opportunities': 'Opportunity',
        'person': 'Contact',
        'people': 'Contact',
        'lead': 'Contact',
        'leads': 'Contact',
        'customer': 'Contact',
        'customers': 'Contact',
        'prospect': 'Contact',
        'account': 'Company',
        'accounts': 'Company',
        'organization': 'Company',
        'company': 'Company',
        'companies': 'Company',
        'task': 'Task',
        'todo': 'Task',
        'reminder': 'Task',
        'ticket': 'Ticket',
        'support': 'Ticket',
        'issue': 'Ticket',
        'bug': 'Ticket',
        'proposal': 'Proposal',
        'quote': 'Proposal',
        'email': 'EmailMessage',
        'message': 'EmailMessage',
        'campaign': 'Campaign',
        'blast': 'Campaign',
        'sequence': 'Sequence',
        'workflow': 'Workflow',
        'automation': 'Workflow',
    };

    const mapped = semanticMap[conceptLower];
    if (mapped && availableModels.includes(mapped)) {
        return mapped;
    }

    return null;
}

/**
 * Extract entity name from natural language request
 */
export function extractEntity(request: string): string | null {
    const lower = request.toLowerCase();

    // Common patterns: "create a [entity]", "new [entity]", "add [entity]"
    const patterns = [
        /create (?:a |an |)(\w+)/,
        /new (\w+)/,
        /add (?:a |an |)(\w+)/,
        /find (\w+)/,
        /search (\w+)/,
        /get (\w+)/,
        /show (\w+)/,
        /delete (\w+)/,
        /remove (\w+)/,
    ];

    for (const pattern of patterns) {
        const match = lower.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}
