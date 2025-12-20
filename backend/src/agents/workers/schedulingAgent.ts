/**
 * Scheduling Agent - Calendar Coordination AI
 * 
 * Handles meeting scheduling, availability detection, and calendar management.
 * Uses Gemini 2.5 Pro for complex coordination and Flash for quick availability checks.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import CalendarEvent from "../../models/CalendarEvent";
import Contact from "../../models/Contact";
import Task from "../../models/Task";

function parseToolCall(response: string): { tool: string; args: any } | null {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.tool && parsed.args !== undefined) return parsed;
        }
    } catch (e) { }
    return null;
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
}

async function executeSchedulingTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "find_available_slots": {
            const {
                duration = 30,
                daysAhead = 7,
                startHour = 9,
                endHour = 17,
                excludeWeekends = true
            } = args;

            const now = new Date();
            const endDate = addDays(now, daysAhead);

            // Get existing events
            const existingEvents = await CalendarEvent.find({
                workspaceId,
                userId,
                startTime: { $gte: now, $lte: endDate },
                status: { $ne: "cancelled" },
            }).sort({ startTime: 1 }).lean();

            // Generate available slots
            const slots: any[] = [];
            let currentDate = new Date(now);
            currentDate.setMinutes(0, 0, 0);
            currentDate.setHours(Math.max(currentDate.getHours() + 1, startHour));

            while (currentDate < endDate && slots.length < 10) {
                const dayOfWeek = currentDate.getDay();

                // Skip weekends if requested
                if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
                    currentDate = addDays(currentDate, 1);
                    currentDate.setHours(startHour, 0, 0, 0);
                    continue;
                }

                const hour = currentDate.getHours();

                // Check if within working hours
                if (hour < startHour) {
                    currentDate.setHours(startHour, 0, 0, 0);
                    continue;
                }
                if (hour >= endHour) {
                    currentDate = addDays(currentDate, 1);
                    currentDate.setHours(startHour, 0, 0, 0);
                    continue;
                }

                const slotEnd = addHours(new Date(currentDate), duration / 60);

                // Check for conflicts
                const hasConflict = existingEvents.some((event: any) => {
                    const eventStart = new Date(event.startTime);
                    const eventEnd = new Date(event.endTime);
                    return (currentDate < eventEnd && slotEnd > eventStart);
                });

                if (!hasConflict) {
                    slots.push({
                        startTime: new Date(currentDate).toISOString(),
                        endTime: slotEnd.toISOString(),
                        formatted: `${currentDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${currentDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
                    });
                }

                // Move to next slot
                currentDate = addHours(currentDate, 0.5); // 30-min increments
            }

            return {
                success: true,
                duration,
                slotsFound: slots.length,
                slots,
            };
        }

        case "schedule_meeting": {
            const {
                title,
                startTime,
                duration = 30,
                attendees = [],
                description,
                contactName,
                location,
                type = "meeting"
            } = args;

            if (!title || !startTime) {
                return { success: false, error: "Title and start time are required" };
            }

            let parsedStart: Date;

            // Parse natural language time
            if (typeof startTime === "string" && !startTime.includes("T")) {
                // Get the user's local timezone and current time
                const now = new Date();
                const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const localTimeString = now.toLocaleString("en-US", {
                    timeZone: userTimezone,
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                });

                // Use AI to parse natural language - with LOCAL timezone context
                const parsePrompt = `Parse this time reference to ISO 8601 format.

User's local time: ${localTimeString}
User's timezone: ${userTimezone}
Time to parse: "${startTime}"

IMPORTANT: Interpret the time in the USER'S LOCAL TIMEZONE (${userTimezone}), not UTC.
Return ONLY the ISO 8601 datetime string with the correct timezone offset, nothing else.
For example, if user says "tomorrow 10am" and they're in Asia/Kolkata (+05:30), return: 2024-12-21T10:00:00+05:30`;

                const parseResult = await getProModel().invoke([new HumanMessage(parsePrompt)]);
                const parsed = (parseResult.content as string).trim();
                parsedStart = new Date(parsed);
            } else {
                parsedStart = new Date(startTime);
            }

            if (isNaN(parsedStart.getTime())) {
                return { success: false, error: "Could not parse start time" };
            }

            const endTime = addHours(parsedStart, duration / 60);

            // Find contact if specified
            let contactId = null;
            if (contactName) {
                const regex = new RegExp(contactName, "i");
                const contact = await Contact.findOne({
                    workspaceId,
                    $or: [{ firstName: regex }, { lastName: regex }],
                });
                contactId = contact?._id;
            }

            // Create the event
            const event = await CalendarEvent.create({
                workspaceId,
                userId,
                title,
                description,
                location,
                startTime: parsedStart,
                endTime,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                attendees: attendees.map((email: string) => ({
                    email,
                    status: "pending",
                })),
                contactId,
                status: "confirmed",
                provider: "internal",
            });

            return {
                success: true,
                eventId: event._id.toString(),
                title: event.title,
                startTime: event.startTime.toISOString(),
                endTime: event.endTime.toISOString(),
                formatted: `${parsedStart.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${parsedStart.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
                message: `Meeting "${title}" scheduled for ${parsedStart.toLocaleDateString()} at ${parsedStart.toLocaleTimeString()}`,
            };
        }

        case "list_meetings": {
            const { daysAhead = 7, includeToday = true } = args;

            const startDate = includeToday
                ? new Date(new Date().setHours(0, 0, 0, 0))
                : addDays(new Date(), 1);
            const endDate = addDays(new Date(), daysAhead);

            const events = await CalendarEvent.find({
                workspaceId,
                userId,
                startTime: { $gte: startDate, $lte: endDate },
                status: { $ne: "cancelled" },
            })
                .populate("contactId", "firstName lastName email")
                .sort({ startTime: 1 })
                .lean();

            // Group by day
            const grouped: Record<string, any[]> = {};
            for (const event of events) {
                const e = event as any;
                const dayKey = new Date(e.startTime).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric"
                });
                if (!grouped[dayKey]) grouped[dayKey] = [];
                grouped[dayKey].push({
                    id: e._id.toString(),
                    title: e.title,
                    time: new Date(e.startTime).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit"
                    }),
                    duration: Math.round((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000),
                    contact: e.contactId ? `${e.contactId.firstName} ${e.contactId.lastName}` : null,
                    location: e.location,
                });
            }

            return {
                success: true,
                totalMeetings: events.length,
                days: Object.keys(grouped).length,
                schedule: grouped,
            };
        }

        case "reschedule_meeting": {
            const { eventId, newStartTime, reason } = args;

            if (!eventId || !newStartTime) {
                return { success: false, error: "Event ID and new start time are required" };
            }

            const event = await CalendarEvent.findById(eventId);
            if (!event) {
                return { success: false, error: "Meeting not found" };
            }

            // Parse new time
            let parsedStart: Date;
            if (typeof newStartTime === "string" && !newStartTime.includes("T")) {
                const now = new Date();
                const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const localTimeString = now.toLocaleString("en-US", { timeZone: userTimezone });

                const parsePrompt = `Parse this time reference to ISO 8601 format.
User's local time: ${localTimeString}
User's timezone: ${userTimezone}
Time to parse: "${newStartTime}"
IMPORTANT: Interpret in ${userTimezone}, not UTC. Return ISO 8601 with timezone offset.`;

                const parseResult = await getProModel().invoke([new HumanMessage(parsePrompt)]);
                parsedStart = new Date((parseResult.content as string).trim());
            } else {
                parsedStart = new Date(newStartTime);
            }

            // Calculate duration and new end time
            const duration = event.endTime.getTime() - event.startTime.getTime();
            const newEndTime = new Date(parsedStart.getTime() + duration);

            const oldTime = event.startTime.toISOString();

            event.startTime = parsedStart;
            event.endTime = newEndTime;
            if (reason) {
                event.description = `${event.description || ""}\n\nRescheduled: ${reason}`.trim();
            }
            await event.save();

            return {
                success: true,
                eventId: event._id.toString(),
                title: event.title,
                oldTime,
                newTime: parsedStart.toISOString(),
                message: `Rescheduled "${event.title}" to ${parsedStart.toLocaleDateString()} at ${parsedStart.toLocaleTimeString()}`,
            };
        }

        case "cancel_meeting": {
            const { eventId, reason } = args;

            if (!eventId) {
                return { success: false, error: "Event ID is required" };
            }

            const event = await CalendarEvent.findById(eventId);
            if (!event) {
                return { success: false, error: "Meeting not found" };
            }

            event.status = "cancelled";
            if (reason) {
                event.description = `${event.description || ""}\n\nCancelled: ${reason}`.trim();
            }
            await event.save();

            return {
                success: true,
                message: `Cancelled meeting "${event.title}"`,
            };
        }

        case "create_follow_up": {
            const { contactName, daysFromNow = 3, title, notes } = args;

            // Find contact
            let contact = null;
            if (contactName) {
                const regex = new RegExp(contactName, "i");
                contact = await Contact.findOne({
                    workspaceId,
                    $or: [{ firstName: regex }, { lastName: regex }],
                });
            }

            const dueDate = addDays(new Date(), daysFromNow);
            dueDate.setHours(10, 0, 0, 0); // Default to 10 AM

            // Create a task for follow-up
            const task = await Task.create({
                workspaceId,
                userId,
                title: title || `Follow up with ${contact ? `${contact.firstName} ${contact.lastName}` : contactName || "contact"}`,
                description: notes,
                priority: "medium",
                status: "pending",
                dueDate,
            });

            return {
                success: true,
                taskId: task._id.toString(),
                dueDate: dueDate.toISOString(),
                message: `Follow-up scheduled for ${dueDate.toLocaleDateString()}`,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function schedulingAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📅 Scheduling Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are an AI Scheduling Agent. Coordinate meetings and manage calendars.

Available tools:

1. find_available_slots - Find open times for meetings
   Args: { duration?: number (minutes), daysAhead?: number, startHour?: number, endHour?: number }
   Returns: Available time slots

2. schedule_meeting - Create a calendar event
   Args: { title: string, startTime: string, duration?: number, attendees?: string[], description?: string, contactName?: string }
   Returns: Created meeting details

3. list_meetings - Get upcoming meetings
   Args: { daysAhead?: number, includeToday?: boolean }
   Returns: Schedule grouped by day

4. reschedule_meeting - Move a meeting to new time
   Args: { eventId: string, newStartTime: string, reason?: string }
   Returns: Updated meeting

5. cancel_meeting - Cancel a meeting
   Args: { eventId: string, reason?: string }
   Returns: Cancellation confirmation

6. create_follow_up - Schedule a follow-up task
   Args: { contactName?: string, daysFromNow?: number, title?: string, notes?: string }
   Returns: Created follow-up task

Respond with JSON: {"tool": "...", "args": {...}}

You can understand natural language times like:
- "tomorrow at 2pm"
- "next Tuesday at 10am"
- "in 3 days at 3:30pm"

Examples:
- "Find time for a 30 min meeting" → {"tool": "find_available_slots", "args": {"duration": 30}}
- "Schedule call with John tomorrow at 2pm" → {"tool": "schedule_meeting", "args": {"title": "Call with John", "startTime": "tomorrow at 2pm", "contactName": "John", "duration": 30}}
- "What meetings do I have this week?" → {"tool": "list_meetings", "args": {"daysAhead": 7}}
- "Schedule follow-up with Sarah in 3 days" → {"tool": "create_follow_up", "args": {"contactName": "Sarah", "daysFromNow": 3}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Scheduling AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executeSchedulingTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = "";

            if (!result.success) {
                friendlyResponse = `❌ ${result.error}`;
            } else if (toolCall.tool === "find_available_slots") {
                if (result.slotsFound === 0) {
                    friendlyResponse = "No available slots found in the specified timeframe. Try a longer range.";
                } else {
                    friendlyResponse = `📅 **${result.slotsFound} Available ${result.duration}-min Slots:**\n\n${result.slots.map((s: any, i: number) => `${i + 1}. ${s.formatted}`).join("\n")
                        }\n\nTo book, say: "Schedule [meeting name] at [time]"`;
                }
            } else if (toolCall.tool === "schedule_meeting") {
                friendlyResponse = `✅ **Meeting Scheduled!**\n\n📌 **${result.title}**\n🗓️ ${result.formatted}\n\nEvent ID: ${result.eventId}`;
            } else if (toolCall.tool === "list_meetings") {
                if (result.totalMeetings === 0) {
                    friendlyResponse = "📅 No upcoming meetings scheduled.";
                } else {
                    friendlyResponse = `📅 **${result.totalMeetings} Meeting(s) This Week:**\n\n${Object.entries(result.schedule).map(([day, meetings]: [string, any]) =>
                        `**${day}**\n${meetings.map((m: any) =>
                            `  • ${m.time} - ${m.title} (${m.duration}min)${m.contact ? ` with ${m.contact}` : ""}`
                        ).join("\n")}`
                    ).join("\n\n")
                        }`;
                }
            } else if (toolCall.tool === "reschedule_meeting") {
                friendlyResponse = `🔄 ${result.message}`;
            } else if (toolCall.tool === "cancel_meeting") {
                friendlyResponse = `❌ ${result.message}`;
            } else if (toolCall.tool === "create_follow_up") {
                friendlyResponse = `✅ ${result.message}`;
            } else {
                friendlyResponse = result.message || JSON.stringify(result);
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with scheduling! Try:\n• 'Find available times for a 30-min meeting'\n• 'Schedule call with [name] tomorrow at 2pm'\n• 'Show my meetings this week'\n• 'Reschedule meeting [id] to next Tuesday'")],
            finalResponse: "I can help with scheduling!",
        };

    } catch (error: any) {
        console.error("❌ Scheduling Agent error:", error);
        return { error: error.message, finalResponse: "Error with scheduling. Try again." };
    }
}
