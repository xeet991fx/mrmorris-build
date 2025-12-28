# Adding New Integrations Guide

This guide shows you how to add new integration nodes (like Slack, WhatsApp, Discord, etc.) to your n8n-style workflow system.

## 🎯 Quick Summary

To add a new integration (e.g., **Notion**):

1. **Add icon & metadata** to `frontend/lib/workflow/integrations.tsx`
2. **Create executor** in `backend/src/services/workflow/actions/`
3. **Register in registry** in `backend/src/services/workflow/actions/index.ts`
4. **Add step type** to models (optional if using generic integration node)
5. **Create frontend node** (optional, reuses IntegrationNode pattern)

---

## 📦 Step 1: Add Integration Metadata

**File:** `frontend/lib/workflow/integrations.tsx`

```typescript
import { SiNotion } from "react-icons/si"; // Import from react-icons

export const INTEGRATIONS: Record<string, IntegrationMetadata> = {
    // ... existing integrations

    integration_notion: {
        name: "Notion",
        icon: SiNotion,                          // From react-icons/si
        color: "#000000",                        // Notion's brand color
        bgColor: "from-black to-gray-800",       // Gradient
        domain: "notion.so",                     // For Clearbit fallback
        description: "Workspace & documentation",
    },
};
```

### 🎨 Finding Brand Icons

**Option 1: react-icons (Recommended)**
- Browse: https://react-icons.github.io/react-icons/
- Search for brand: "Slack", "Notion", "Stripe", etc.
- Import from `/si` (Simple Icons): `import { SiSlack } from "react-icons/si"`

**Option 2: Custom SVG**
```typescript
import NotionIcon from "@/public/integrations/notion.svg";

icon: (props) => <NotionIcon {...props} />,
```

**Option 3: Clearbit API (Auto-fallback)**
- If no icon provided, shows Clearbit logo: `https://logo.clearbit.com/notion.so`
- Automatically falls back to Google Favicon if Clearbit fails

---

## 🔧 Step 2: Create Backend Executor

**File:** `backend/src/services/workflow/actions/notionNodeAction.ts`

```typescript
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";
import { Client } from "@notionhq/client"; // Install: npm install @notionhq/client
import { decryptCredentials } from "../../../utils/encryption";
import { replacePlaceholders } from "../expressionEvaluator";

// Define action types
export type NotionAction = 'create_page' | 'update_page' | 'search_database';

// Config interface
export interface NotionNodeConfig {
    credentials: {
        apiKey: string; // Encrypted
    };
    action: NotionAction;

    // Action-specific configs
    createPage?: {
        databaseId: string;
        title: string;
        properties: Record<string, any>;
    };
    // ... other actions

    responseVariable?: string;
}

// Executor
export class NotionNodeExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const config = step.config as unknown as NotionNodeConfig;

        if (!config.credentials?.apiKey) {
            return this.error("Notion API key is required");
        }

        // Initialize dataContext
        if (!enrollment.dataContext) {
            enrollment.dataContext = { variables: {}, previousResults: {} };
        }

        try {
            // Decrypt credentials
            const workspaceId = enrollment.workspaceId?.toString() || '';
            const { apiKey } = this.decryptNotionCredentials(config.credentials, workspaceId);

            // Initialize Notion client
            const notion = new Client({ auth: apiKey });

            this.log(`📓 Executing Notion action: ${config.action}`);

            // Route to action handler
            let result: any;
            switch (config.action) {
                case 'create_page':
                    result = await this.createPage(notion, config, context);
                    break;
                // ... other actions
                default:
                    return this.error(`Unknown Notion action: ${config.action}`);
            }

            // Store response
            if (config.responseVariable) {
                enrollment.dataContext.variables[config.responseVariable] = result;
                this.log(`💾 Stored response in: ${config.responseVariable}`);
            }

            return this.success({ action: config.action, response: result });

        } catch (error: any) {
            this.log(`❌ Notion action failed: ${error.message}`);
            return this.error(`Notion ${config.action} failed: ${error.message}`);
        }
    }

    private async createPage(
        notion: Client,
        config: NotionNodeConfig,
        context: ActionContext
    ): Promise<any> {
        const { databaseId, title, properties } = config.createPage!;

        // Replace placeholders
        const finalTitle = this.replacePlaceholdersInContext(title, context);

        const response = await notion.pages.create({
            parent: { database_id: databaseId },
            properties: {
                title: {
                    title: [{ text: { content: finalTitle } }]
                },
                ...properties
            }
        });

        return {
            pageId: response.id,
            url: (response as any).url,
        };
    }

    private decryptNotionCredentials(encrypted: any, workspaceId: string) {
        try {
            if (typeof encrypted.apiKey === 'string' && encrypted.apiKey.startsWith('secret_')) {
                return { apiKey: encrypted.apiKey }; // Already decrypted
            }
            return decryptCredentials(encrypted.apiKey, workspaceId);
        } catch (error: any) {
            throw new Error(`Failed to decrypt Notion credentials: ${error.message}`);
        }
    }

    private replacePlaceholdersInContext(template: string, context: ActionContext): string {
        const { entity, enrollment } = context;
        const placeholderContext = {
            ...entity,
            ...(enrollment.dataContext?.variables || {}),
        };
        if (enrollment.dataContext?.loopContext) {
            placeholderContext.item = enrollment.dataContext.loopContext.currentItem;
            placeholderContext.index = enrollment.dataContext.loopContext.currentIndex;
        }
        return replacePlaceholders(template, placeholderContext);
    }
}
```

---

## 🔌 Step 3: Register Executor

**File:** `backend/src/services/workflow/actions/index.ts`

```typescript
import { NotionNodeExecutor } from "./notionNodeAction";

const actionRegistry: Record<string, ActionExecutor> = {
    // ... existing actions

    // INTEGRATION NODES
    integration_slack: new SlackNodeExecutor(),
    integration_notion: new NotionNodeExecutor(), // Add here
};
```

---

## 🎨 Step 4: Create Frontend Node (Optional)

You can either:
- **Reuse SlackNode pattern** (copy and modify)
- **Create generic IntegrationNode** that works for all

**File:** `frontend/components/workflows/nodes/NotionNode.tsx`

```typescript
"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { WorkflowStep } from "@/lib/workflow/types";
import { getIntegrationMeta } from "@/lib/workflow/integrations";
import { cn } from "@/lib/utils";

interface NotionNodeData {
    step: WorkflowStep;
    isSelected?: boolean;
}

const ACTION_LABELS: Record<string, string> = {
    create_page: "Create Page",
    update_page: "Update Page",
    search_database: "Search Database",
};

function NotionNode({ data, selected }: NodeProps<NotionNodeData>) {
    const { step } = data;
    const action = step.config.action;
    const hasCredentials = !!step.config.credentials?.apiKey;
    const actionLabel = action ? ACTION_LABELS[action] || action : "Not configured";

    const integrationMeta = getIntegrationMeta("integration_notion");
    const IconComponent = integrationMeta?.icon;

    return (
        <div
            className={cn(
                "relative px-3 py-3 rounded-xl border-2 shadow-xl min-w-[160px] transition-all backdrop-blur-sm",
                "bg-white dark:bg-gray-900",
                "border-black/20 hover:border-black/40",
                selected && "ring-2 ring-offset-2 ring-black ring-offset-background"
            )}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-black !border-2 !border-white dark:!border-gray-900"
            />

            <div className="flex items-start gap-3">
                {/* Square App Icon */}
                <div
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md",
                        "bg-gradient-to-br",
                        integrationMeta?.bgColor || "from-black to-gray-800"
                    )}
                >
                    {IconComponent ? (
                        <IconComponent className="w-6 h-6 text-white" />
                    ) : (
                        <img
                            src={`https://logo.clearbit.com/notion.so?size=64`}
                            alt="Notion"
                            className="w-6 h-6"
                            onError={(e) => {
                                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=notion.so&sz=64`;
                            }}
                        />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                        {integrationMeta?.name || "Notion"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {actionLabel}
                    </p>
                    {!hasCredentials && (
                        <p className="text-[9px] text-red-500 dark:text-red-400 mt-1">
                            ⚠ Not configured
                        </p>
                    )}
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-black !border-2 !border-white dark:!border-gray-900"
            />

            {/* Brand indicator */}
            <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900"
                style={{ backgroundColor: integrationMeta?.color || "#000000" }}
            />
        </div>
    );
}

export default memo(NotionNode);
```

---

## 📝 Step 5: Create Config Panel

**File:** `frontend/components/workflows/config/NotionNodeConfig.tsx`

```typescript
"use client";

import { useState } from "react";
import { WorkflowStep } from "@/lib/workflow/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface NotionNodeConfigProps {
    step: WorkflowStep;
    onUpdate: (updates: Partial<WorkflowStep>) => void;
}

const NOTION_ACTIONS = [
    { value: "create_page", label: "Create Page" },
    { value: "update_page", label: "Update Page" },
    { value: "search_database", label: "Search Database" },
];

export default function NotionNodeConfig({ step, onUpdate }: NotionNodeConfigProps) {
    const [activeTab, setActiveTab] = useState("credentials");
    const config = step.config || {};

    // ... implementation similar to SlackNodeConfig.tsx

    return (
        <div className="space-y-4">
            {/* Header with Notion branding */}
            <div className="flex items-center gap-3 p-4 bg-black/5 dark:bg-white/5 rounded-lg">
                <div className="w-10 h-10 rounded-md bg-black flex items-center justify-center text-white">
                    {/* Notion icon */}
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Notion Integration</h3>
                    <p className="text-sm text-muted-foreground">
                        Workspace & documentation
                    </p>
                </div>
            </div>

            {/* Tabs for configuration */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="credentials">Credentials</TabsTrigger>
                    <TabsTrigger value="action">Action</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>

                {/* Implementation ... */}
            </Tabs>
        </div>
    );
}
```

---

## 🔗 Step 6: Update Workflow Editor

**File:** `frontend/app/projects/[id]/workflows/[workflowId]/page.tsx`

```typescript
// Import new node
import NotionNode from "@/components/workflows/nodes/NotionNode";

// Register in nodeTypes
const nodeTypes = {
    // ... existing
    integration_notion: NotionNode,
};

// Add to drop handler
} else if (type === "integration_notion") {
    newStep = {
        id: generateStepId(),
        type: "integration_notion",
        name: "Notion",
        config: {
            action: "create_page",
            credentials: { apiKey: "" }
        },
        position,
        nextStepIds: [],
    };
}
```

**File:** `frontend/components/workflows/WorkflowConfigPanel.tsx`

```typescript
import NotionNodeConfig from "./config/NotionNodeConfig";

// Add case
{step.type === "integration_notion" && (
    <NotionNodeConfig step={step} onUpdate={onUpdate} />
)}
```

---

## 🎯 Popular Integrations to Add

Here are common integrations with their details:

### **Stripe** (Payment)
```typescript
integration_stripe: {
    name: "Stripe",
    icon: SiStripe,
    color: "#635BFF",
    bgColor: "from-[#635BFF] to-[#5048CC]",
    domain: "stripe.com",
}
// Actions: create_customer, create_charge, create_subscription
```

### **Google Sheets**
```typescript
integration_googlesheets: {
    name: "Google Sheets",
    icon: SiGooglesheets,
    color: "#34A853",
    bgColor: "from-[#34A853] to-[#2D8E47]",
    domain: "sheets.google.com",
}
// Actions: append_row, update_cell, create_sheet
```

### **Airtable**
```typescript
integration_airtable: {
    name: "Airtable",
    icon: SiAirtable,
    color: "#18BFFF",
    bgColor: "from-[#18BFFF] to-[#14A3DB]",
    domain: "airtable.com",
}
// Actions: create_record, update_record, list_records
```

### **Mailchimp**
```typescript
integration_mailchimp: {
    name: "Mailchimp",
    icon: SiMailchimp,
    color: "#FFE01B",
    bgColor: "from-[#FFE01B] to-[#E6C700]",
    domain: "mailchimp.com",
}
// Actions: add_subscriber, create_campaign, send_email
```

---

## 🚀 Testing Your Integration

1. **Frontend Test:**
   - Drag integration node from palette
   - Verify square icon appears
   - Click node → Config panel opens
   - Fill in credentials

2. **Backend Test:**
   - Create workflow enrollment in MongoDB
   - Trigger workflow
   - Check logs for integration execution
   - Verify API call made to third-party service

3. **End-to-End:**
   - Create complete workflow
   - Test with real credentials
   - Verify data flows correctly

---

## 📚 Best Practices

✅ **DO:**
- Use official brand colors and icons
- Encrypt all credentials before storing
- Support {{placeholder}} syntax in all text fields
- Provide clear action descriptions
- Store API responses in variables
- Handle errors gracefully with try/catch

❌ **DON'T:**
- Store credentials in plain text
- Hard-code API keys
- Skip validation of required fields
- Forget to test with real API calls

---

## 🎉 You're Done!

Your new integration is now:
- ✅ Visible in node palette with brand icon
- ✅ Draggable to canvas with square design
- ✅ Configurable via right panel
- ✅ Executable in backend workflow engine
- ✅ Ready for production use

Add as many integrations as you need following this pattern!
