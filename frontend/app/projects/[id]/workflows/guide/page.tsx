"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export default function WorkflowGuidePage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const [activeSection, setActiveSection] = useState("overview");

    const handleBack = () => {
        router.push(`/projects/${workspaceId}/workflows`);
    };

    const sections = [
        { id: "overview", title: "📖 Overview", icon: "📖" },
        { id: "analytics", title: "📊 Analytics Dashboard", icon: "📊" },
        { id: "goals", title: "🎯 Setting Goals", icon: "🎯" },
        { id: "scheduling", title: "⏰ Advanced Scheduling", icon: "⏰" },
        { id: "slack", title: "💬 Slack Notifications", icon: "💬" },
        { id: "sms", title: "📱 SMS Messages", icon: "📱" },
        { id: "webhooks", title: "🔗 Webhooks", icon: "🔗" },
        { id: "logs", title: "📝 Execution Logs", icon: "📝" },
        { id: "troubleshooting", title: "🔧 Troubleshooting", icon: "🔧" },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Back to workflows"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">Workflow Guide</h1>
                        <p className="text-xs text-muted-foreground">Complete guide to using workflows</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
                {/* Sidebar Navigation */}
                <div className="w-64 flex-shrink-0">
                    <div className="sticky top-20 bg-card border border-border rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-foreground mb-3">Table of Contents</h3>
                        <nav className="space-y-1">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                        activeSection === section.id
                                            ? "bg-primary text-white"
                                            : "hover:bg-muted text-muted-foreground"
                                    }`}
                                >
                                    {section.title}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    <div className="bg-card border border-border rounded-xl p-8">
                        {activeSection === "overview" && <OverviewSection />}
                        {activeSection === "analytics" && <AnalyticsSection workspaceId={workspaceId} />}
                        {activeSection === "goals" && <GoalsSection />}
                        {activeSection === "scheduling" && <SchedulingSection />}
                        {activeSection === "slack" && <SlackSection />}
                        {activeSection === "sms" && <SmsSection />}
                        {activeSection === "webhooks" && <WebhooksSection />}
                        {activeSection === "logs" && <LogsSection />}
                        {activeSection === "troubleshooting" && <TroubleshootingSection />}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Overview Section
function OverviewSection() {
    return (
        <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-foreground mb-4">📖 Welcome to Workflows</h2>
            <p className="text-muted-foreground mb-6">
                Workflows help you automate your sales and marketing processes. This guide will teach you
                everything you need to know.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <FeatureCard
                    icon="🎯"
                    title="Set Goals"
                    description="Track success metrics and conversion rates for your workflows"
                />
                <FeatureCard
                    icon="📊"
                    title="Analytics"
                    description="Beautiful charts showing enrollment trends and funnel performance"
                />
                <FeatureCard
                    icon="⏰"
                    title="Smart Scheduling"
                    description="Send messages only during business hours and respect timezones"
                />
                <FeatureCard
                    icon="💬"
                    title="Slack & SMS"
                    description="Send notifications via Slack and text messages"
                />
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-3">Getting Started</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-6">
                <li>Create a new workflow or edit an existing one</li>
                <li>Add a trigger (what starts the workflow)</li>
                <li>Add actions (what happens in the workflow)</li>
                <li>Add delays (wait between steps)</li>
                <li>Add conditions (branch based on data)</li>
                <li>Test your workflow</li>
                <li>Activate and monitor</li>
            </ol>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 <strong>Pro Tip:</strong> Start with a simple workflow and add complexity gradually.
                    Use the test feature before activating!
                </p>
            </div>
        </div>
    );
}

// Analytics Section
function AnalyticsSection({ workspaceId }: { workspaceId: string }) {
    return (
        <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-foreground mb-4">📊 Analytics Dashboard</h2>
            <p className="text-muted-foreground mb-6">
                Track your workflow performance with detailed analytics and beautiful charts.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">How to Access</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-6">
                <li>Open any workflow in the editor</li>
                <li>Click the <strong>"Analytics"</strong> button in the top-right corner</li>
                <li>View your performance metrics</li>
            </ol>

            <h3 className="text-xl font-semibold text-foreground mb-3">What You'll See</h3>
            <div className="space-y-4 mb-6">
                <MetricCard
                    title="📈 Timeline Chart"
                    description="Line graph showing enrollments, completions, and failures over the last 30 days"
                />
                <MetricCard
                    title="📊 Funnel Chart"
                    description="Bar chart showing how many contacts completed, failed, or dropped off at each step"
                />
                <MetricCard
                    title="📋 Detailed Table"
                    description="Step-by-step breakdown with success rates and drop-off percentages"
                />
                <MetricCard
                    title="💯 Success Rate"
                    description="Percentage of enrollments that complete successfully"
                />
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-3">Example Use Case</h3>
            <ExampleBox
                title="Onboarding Workflow Analysis"
                steps={[
                    "You have a 5-step onboarding workflow",
                    "Analytics shows 80% complete step 1, but only 40% complete step 3",
                    "This indicates step 3 might have an issue",
                    "Investigate step 3 and optimize it",
                    "Monitor analytics to see improvement",
                ]}
            />
        </div>
    );
}

// Goals Section
function GoalsSection() {
    return (
        <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-foreground mb-4">🎯 Setting Workflow Goals</h2>
            <p className="text-muted-foreground mb-6">
                Goals help you measure success and track conversions in your workflows.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">How to Set Goals</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-6">
                <li>Open a workflow in the editor</li>
                <li>Click <strong>"Settings"</strong> button in the top-right</li>
                <li>Scroll to "Workflow Goals" section</li>
                <li>Click <strong>"Add Goal"</strong></li>
                <li>Choose goal type and configure</li>
                <li>Save your workflow</li>
            </ol>

            <h3 className="text-xl font-semibold text-foreground mb-3">4 Types of Goals</h3>
            <div className="space-y-4 mb-6">
                <GoalTypeCard
                    type="Field Value Match"
                    description="Goal is met when a field equals a specific value"
                    example='Example: status equals "customer"'
                    useCase="Track when leads convert to customers"
                />
                <GoalTypeCard
                    type="Reach Specific Step"
                    description="Goal is met when contact reaches a particular step"
                    example='Example: Reaches "Purchase Completed" step'
                    useCase="Track funnel completion rates"
                />
                <GoalTypeCard
                    type="Complete Within Time"
                    description="Goal is met when workflow completes within timeframe"
                    example="Example: Complete within 7 days"
                    useCase="Measure workflow efficiency"
                />
                <GoalTypeCard
                    type="Custom Event"
                    description="Goal is met when a custom event is triggered"
                    example='Example: "trial_started" event'
                    useCase="Track specific user actions"
                />
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-3">Real Example</h3>
            <ExampleBox
                title="Lead Nurturing Workflow"
                steps={[
                    '📧 Goal 1: Field Value - status equals "qualified"',
                    '⏱️ Goal 2: Complete within 14 days',
                    '🎯 Goal 3: Reach step "Demo Scheduled"',
                    "Analytics will show: 60% became qualified, 45% completed in time, 30% booked demo",
                    "This helps you optimize each step!",
                ]}
            />
        </div>
    );
}

// Scheduling Section
function SchedulingSection() {
    return (
        <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-foreground mb-4">⏰ Advanced Scheduling</h2>
            <p className="text-muted-foreground mb-6">
                Control exactly when your workflow steps execute with smart scheduling options.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">How to Configure</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-6">
                <li>Add or edit a <strong>Delay</strong> step in your workflow</li>
                <li>Scroll to <strong>"Advanced Scheduling"</strong> section</li>
                <li>Choose your options</li>
                <li>Save the step</li>
            </ol>

            <h3 className="text-xl font-semibold text-foreground mb-3">Available Options</h3>
            <div className="space-y-4 mb-6">
                <SchedulingOption
                    icon="🌍"
                    title="Timezone Selection"
                    description="Choose from 13 major timezones (UTC, US, Europe, Asia, Australia)"
                    example="Set to Pacific Time so emails send at 9 AM PT"
                />
                <SchedulingOption
                    icon="🏢"
                    title="Business Hours Only"
                    description="Only execute during business hours (default 9 AM - 5 PM)"
                    example="Don't send emails at midnight - wait until 9 AM"
                />
                <SchedulingOption
                    icon="⏰"
                    title="Custom Hours"
                    description="Set your own business hours (e.g., 8 AM - 6 PM)"
                    example="Match your team's working hours"
                />
                <SchedulingOption
                    icon="📅"
                    title="Skip Weekends"
                    description="If scheduled for Sat/Sun, move to Monday"
                    example="Email scheduled for Saturday will send Monday 9 AM"
                />
                <SchedulingOption
                    icon="👤"
                    title="Contact's Timezone"
                    description="Use each contact's timezone if available"
                    example="Send at 9 AM in each person's local time"
                />
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-3">Real Example</h3>
            <ExampleBox
                title="Follow-up Email Workflow"
                steps={[
                    "Trigger: Contact submits form",
                    "Step 1: Send welcome email immediately",
                    "Step 2: Wait 1 day",
                    "⚙️ Advanced Settings: Business hours only (9 AM - 5 PM PT), Skip weekends",
                    "Step 3: Send follow-up email",
                    "Result: If form submitted Friday 11 PM, follow-up sends Monday 9 AM!",
                ]}
            />
        </div>
    );
}

// Slack Section
function SlackSection() {
    return (
        <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-foreground mb-4">💬 Slack Notifications</h2>
            <p className="text-muted-foreground mb-6">
                Send automated messages to Slack channels when workflow steps execute.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">Quick Setup (5 minutes)</h3>
            <div className="space-y-4 mb-6">
                <SetupStep
                    number={1}
                    title="Get Slack Webhook URL"
                    description={
                        <>
                            <p className="mb-2">Go to your Slack workspace:</p>
                            <ol className="list-decimal list-inside ml-4 space-y-1">
                                <li>Visit slack.com/apps → Search "Incoming Webhooks"</li>
                                <li>Click "Add to Slack"</li>
                                <li>Choose a channel (e.g., #sales-alerts)</li>
                                <li>Copy the Webhook URL</li>
                            </ol>
                        </>
                    }
                />
                <SetupStep
                    number={2}
                    title="Add to Workflow"
                    description={
                        <>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>In workflow editor, add Action step</li>
                                <li>Select "Send Slack Message"</li>
                                <li>Paste your Webhook URL</li>
                                <li>Write your message</li>
                            </ol>
                        </>
                    }
                />
                <SetupStep
                    number={3}
                    title="Customize Message"
                    description={
                        <>
                            <p className="mb-2">Use placeholders for personalization:</p>
                            <CodeBlock
                                code={`New lead: {{firstName}} {{lastName}}
Email: {{email}}
Company: {{company}}`}
                            />
                        </>
                    }
                />
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-3">Real Example</h3>
            <ExampleBox
                title="Sales Alert Workflow"
                steps={[
                    "Trigger: High-value lead submits form",
                    "Step 1: Send Slack message to #sales-team",
                    'Message: "🔥 Hot Lead: {{firstName}} from {{company}} - {{email}}"',
                    "Step 2: Assign to sales rep",
                    "Result: Sales team gets instant notification!",
                ]}
            />

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-6">
                <p className="text-sm text-green-800 dark:text-green-300">
                    ✅ <strong>No API keys needed!</strong> Just the webhook URL from Slack.
                </p>
            </div>
        </div>
    );
}

// SMS Section
function SmsSection() {
    return (
        <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-foreground mb-4">📱 SMS Messages</h2>
            <p className="text-muted-foreground mb-6">
                Send text messages to contacts using Twilio or custom SMS provider.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    ⚠️ <strong>Admin Setup Required:</strong> Your system administrator needs to configure
                    Twilio credentials first. If not set up, ask your admin.
                </p>
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-3">For Users (If SMS is Configured)</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-6">
                <li>Add Action step in workflow</li>
                <li>Select <strong>"Send SMS"</strong></li>
                <li>Provider: Twilio (should be pre-configured)</li>
                <li>
                    Recipient: Choose "Use contact's phone field" (uses phone from contact record)
                </li>
                <li>Write your message (max 1600 characters)</li>
                <li>Use placeholders like {'{{firstName}}'}</li>
            </ol>

            <h3 className="text-xl font-semibold text-foreground mb-3">Real Example</h3>
            <ExampleBox
                title="Appointment Reminder"
                steps={[
                    "Trigger: Appointment scheduled",
                    "Step 1: Wait 1 day",
                    "Step 2: Send SMS",
                    'Message: "Hi {{firstName}}, reminder: Your appointment is tomorrow at 2 PM!"',
                    "Result: Customer gets text reminder automatically",
                ]}
            />

            <h3 className="text-xl font-semibold text-foreground mb-3">For Administrators</h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                    <strong>To enable SMS for your team:</strong>
                </p>
                <ol className="list-decimal list-inside ml-4 space-y-1 text-sm text-blue-700 dark:text-blue-400">
                    <li>Sign up at twilio.com (free trial available)</li>
                    <li>Get a phone number from Twilio</li>
                    <li>Copy Account SID and Auth Token</li>
                    <li>Add to server environment variables:
                        <CodeBlock code={`TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token`} />
                    </li>
                    <li>Restart backend server</li>
                </ol>
            </div>
        </div>
    );
}

// Webhooks Section
function WebhooksSection() {
    return (
        <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-foreground mb-4">🔗 Webhooks</h2>
            <p className="text-muted-foreground mb-6">
                Trigger workflows from external systems using HTTP webhooks.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">How to Use</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-6">
                <li>Create workflow with <strong>"Webhook Received"</strong> trigger</li>
                <li>Click <strong>"Webhook Info"</strong> button (appears automatically)</li>
                <li>Copy the webhook URL</li>
                <li>Send POST requests to that URL from external systems</li>
            </ol>

            <h3 className="text-xl font-semibold text-foreground mb-3">Example Request</h3>
            <CodeBlock
                code={`curl -X POST "https://your-domain.com/api/workspaces/123/workflows/456/webhook" \\
  -H "Content-Type: application/json" \\
  -d '{
    "entityType": "contact",
    "entityId": "contact_abc123",
    "data": {
      "source": "webinar"
    }
  }'`}
            />

            <h3 className="text-xl font-semibold text-foreground mb-3">Real Example</h3>
            <ExampleBox
                title="Webinar Registration Workflow"
                steps={[
                    "Trigger: Webhook received",
                    "External system (Zoom/GoToWebinar) sends webhook when someone registers",
                    "Workflow enrolls the contact automatically",
                    "Step 1: Send welcome email",
                    "Step 2: Send reminder 1 day before",
                    "Result: Automated webinar nurture!",
                ]}
            />
        </div>
    );
}

// Logs Section
function LogsSection() {
    return (
        <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-foreground mb-4">📝 Execution Logs</h2>
            <p className="text-muted-foreground mb-6">
                Debug workflows and see exactly what happened for each contact.
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">How to Access</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-6">
                <li>Open workflow in editor</li>
                <li>Click <strong>"Execution Logs"</strong> button (bottom bar)</li>
                <li>View all enrollments and their status</li>
            </ol>

            <h3 className="text-xl font-semibold text-foreground mb-3">What You Can Do</h3>
            <div className="space-y-4 mb-6">
                <FeatureCard
                    icon="🔍"
                    title="Search & Filter"
                    description="Find specific contacts by ID or filter by status (active/completed/failed)"
                />
                <FeatureCard
                    icon="📊"
                    title="View Details"
                    description="Click any enrollment to see step-by-step execution timeline"
                />
                <FeatureCard
                    icon="⚠️"
                    title="Debug Errors"
                    description="See exact error messages for failed steps"
                />
                <FeatureCard
                    icon="⏱️"
                    title="Track Progress"
                    description="See which step each contact is currently on"
                />
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-3">Debugging Example</h3>
            <ExampleBox
                title="Finding Why Emails Didn't Send"
                steps={[
                    "Go to Execution Logs",
                    'Filter by status: "Failed"',
                    "Click on failed enrollment",
                    'See error: "Email template not found"',
                    "Fix: Update workflow to use correct template",
                    "Problem solved!",
                ]}
            />
        </div>
    );
}

// Troubleshooting Section
function TroubleshootingSection() {
    return (
        <div className="prose prose-sm max-w-none">
            <h2 className="text-2xl font-bold text-foreground mb-4">🔧 Troubleshooting</h2>

            <div className="space-y-6">
                <TroubleshootItem
                    question="Workflow not activating?"
                    answer={
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Check for validation errors (red panel will appear)</li>
                            <li>Ensure workflow has at least one trigger and one action</li>
                            <li>Make sure all steps are connected</li>
                            <li>Save workflow before activating</li>
                        </ul>
                    }
                />

                <TroubleshootItem
                    question="Contacts not enrolling?"
                    answer={
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Check if workflow is active (not paused)</li>
                            <li>Verify trigger conditions are met</li>
                            <li>Check enrollment criteria (contact may already be enrolled)</li>
                            <li>Look at Execution Logs for errors</li>
                        </ul>
                    }
                />

                <TroubleshootItem
                    question="Slack messages not sending?"
                    answer={
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Verify webhook URL is correct</li>
                            <li>Test webhook URL with curl/Postman</li>
                            <li>Check Slack app permissions</li>
                            <li>Look at Execution Logs for exact error</li>
                        </ul>
                    }
                />

                <TroubleshootItem
                    question="SMS not working?"
                    answer={
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Confirm Twilio is configured (ask admin)</li>
                            <li>Verify phone numbers are in E.164 format (+country code)</li>
                            <li>Check Twilio trial account limitations</li>
                            <li>Ensure "from" number is a valid Twilio number</li>
                        </ul>
                    }
                />

                <TroubleshootItem
                    question="Analytics not showing data?"
                    answer={
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Workflow needs enrollments first</li>
                            <li>Data appears after contacts complete steps</li>
                            <li>Try refreshing the page</li>
                            <li>Check if workflow has been active for some time</li>
                        </ul>
                    }
                />
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mt-8">
                <p className="text-sm text-purple-800 dark:text-purple-300">
                    💬 <strong>Still need help?</strong> Check the Execution Logs first - they show exactly
                    what went wrong with detailed error messages!
                </p>
            </div>
        </div>
    );
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="flex items-start gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                    <h4 className="font-semibold text-foreground mb-1">{title}</h4>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, description }: { title: string; description: string }) {
    return (
        <div className="border-l-4 border-primary pl-4 py-2">
            <h4 className="font-semibold text-foreground mb-1">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

function ExampleBox({ title, steps }: { title: string; steps: string[] }) {
    return (
        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-3">Example: {title}</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                {steps.map((step, i) => (
                    <li key={i}>{step}</li>
                ))}
            </ol>
        </div>
    );
}

function GoalTypeCard({ type, description, example, useCase }: any) {
    return (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2">✓ {type}</h4>
            <p className="text-sm text-muted-foreground mb-2">{description}</p>
            <p className="text-xs bg-primary/10 text-primary px-2 py-1 rounded inline-block mb-2">
                {example}
            </p>
            <p className="text-xs text-muted-foreground italic">Use case: {useCase}</p>
        </div>
    );
}

function SchedulingOption({ icon, title, description, example }: any) {
    return (
        <div className="border-l-4 border-orange-500 pl-4 py-2">
            <h4 className="font-semibold text-foreground mb-1">
                {icon} {title}
            </h4>
            <p className="text-sm text-muted-foreground mb-1">{description}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400 italic">{example}</p>
        </div>
    );
}

function SetupStep({ number, title, description }: any) {
    return (
        <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                {number}
            </div>
            <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2">{title}</h4>
                <div className="text-sm text-muted-foreground">{description}</div>
            </div>
        </div>
    );
}

function CodeBlock({ code }: { code: string }) {
    return (
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto mt-2">
            {code}
        </pre>
    );
}

function TroubleshootItem({ question, answer }: { question: string; answer: React.ReactNode }) {
    return (
        <div className="border-l-4 border-red-500 pl-4 py-2">
            <h4 className="font-semibold text-foreground mb-2">❓ {question}</h4>
            <div className="text-sm text-muted-foreground">{answer}</div>
        </div>
    );
}
