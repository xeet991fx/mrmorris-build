/**
 * Data Entry Agent - Automated Data Capture AI
 * 
 * Extracts contacts from emails, deduplicates records,
 * parses business cards/notes, and maintains data quality.
 * Uses Gemini 2.5 Pro for intelligent extraction.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Contact from "../../models/Contact";
import Company from "../../models/Company";

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

// Calculate similarity between two strings
function stringSimilarity(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;
    const str1 = s1.toLowerCase().trim();
    const str2 = s2.toLowerCase().trim();
    if (str1 === str2) return 100;

    // Simple Jaccard similarity
    const set1 = new Set(str1.split(""));
    const set2 = new Set(str2.split(""));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return Math.round((intersection.size / union.size) * 100);
}

async function executeDataEntryTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "parse_email_signature": {
            const { emailBody } = args;

            if (!emailBody) {
                return { success: false, error: "Email body is required" };
            }

            const parsePrompt = `Extract contact information from this email signature:

${emailBody}

Extract and return as JSON:
{
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "mobile": "",
  "jobTitle": "",
  "company": "",
  "website": "",
  "linkedin": "",
  "twitter": "",
  "address": {
    "street": "",
    "city": "",
    "state": "",
    "zip": "",
    "country": ""
  },
  "confidence": 0-100
}

Only include fields that are clearly present. Set confidence based on how complete the extraction is.`;

            const extractResult = await getProModel().invoke([new HumanMessage(parsePrompt)]);

            let extracted = {};
            try {
                const match = (extractResult.content as string).match(/\{[\s\S]*\}/);
                if (match) {
                    extracted = JSON.parse(match[0]);
                }
            } catch (e) {
                return { success: false, error: "Could not parse email signature" };
            }

            return {
                success: true,
                extracted,
                message: "Contact info extracted. Use 'create contact' to save.",
            };
        }

        case "scan_duplicates": {
            const { type = "contacts", threshold = 70 } = args;

            const duplicateGroups: any[] = [];

            if (type === "contacts") {
                const contacts = await Contact.find({ workspaceId })
                    .select("firstName lastName email phone company")
                    .lean();

                // OPTIMIZATION: Hash-based duplicate detection (O(n) instead of O(n²))
                const emailMap = new Map<string, any[]>();
                const phoneMap = new Map<string, any[]>();
                const nameCompanyMap = new Map<string, any[]>();
                const checked = new Set<string>();

                // Step 1: Group by exact matches (O(n))
                contacts.forEach((contact: any) => {
                    // Group by email
                    if (contact.email) {
                        const emailKey = contact.email.toLowerCase().trim();
                        if (!emailMap.has(emailKey)) {
                            emailMap.set(emailKey, []);
                        }
                        emailMap.get(emailKey)!.push(contact);
                    }

                    // Group by phone (normalized)
                    if (contact.phone) {
                        const phoneKey = contact.phone.replace(/\D/g, "");
                        if (phoneKey.length >= 10) { // Only valid phone numbers
                            if (!phoneMap.has(phoneKey)) {
                                phoneMap.set(phoneKey, []);
                            }
                            phoneMap.get(phoneKey)!.push(contact);
                        }
                    }

                    // Group by name+company (approximate key)
                    if (contact.firstName && contact.company) {
                        const nameKey = `${contact.firstName.toLowerCase().trim()}_${contact.company.toLowerCase().trim()}`;
                        if (!nameCompanyMap.has(nameKey)) {
                            nameCompanyMap.set(nameKey, []);
                        }
                        nameCompanyMap.get(nameKey)!.push(contact);
                    }
                });

                // Step 2: Process email duplicates (100% similarity)
                emailMap.forEach((group) => {
                    if (group.length > 1) {
                        const primary = group[0];
                        const duplicates = group.slice(1);

                        duplicateGroups.push({
                            primary: {
                                id: primary._id.toString(),
                                name: `${primary.firstName} ${primary.lastName}`,
                                email: primary.email,
                                company: primary.company,
                            },
                            duplicates: duplicates.map((c: any) => ({
                                id: c._id.toString(),
                                name: `${c.firstName} ${c.lastName}`,
                                email: c.email,
                                company: c.company,
                                similarity: 100,
                                reason: "Same email",
                            })),
                        });

                        // Mark all as checked
                        group.forEach((c: any) => checked.add(c._id.toString()));
                    }
                });

                // Step 3: Process phone duplicates (95% similarity)
                phoneMap.forEach((group) => {
                    if (group.length > 1) {
                        // Filter out already checked (from email matches)
                        const unchecked = group.filter((c: any) => !checked.has(c._id.toString()));
                        if (unchecked.length > 1) {
                            const primary = unchecked[0];
                            const duplicates = unchecked.slice(1);

                            duplicateGroups.push({
                                primary: {
                                    id: primary._id.toString(),
                                    name: `${primary.firstName} ${primary.lastName}`,
                                    email: primary.email,
                                    company: primary.company,
                                },
                                duplicates: duplicates.map((c: any) => ({
                                    id: c._id.toString(),
                                    name: `${c.firstName} ${c.lastName}`,
                                    email: c.email,
                                    company: c.company,
                                    similarity: 95,
                                    reason: "Same phone",
                                })),
                            });

                            unchecked.forEach((c: any) => checked.add(c._id.toString()));
                        }
                    }
                });

                // Step 4: Process name+company duplicates (similarity-based)
                nameCompanyMap.forEach((group) => {
                    if (group.length > 1) {
                        const unchecked = group.filter((c: any) => !checked.has(c._id.toString()));
                        if (unchecked.length > 1) {
                            const primary = unchecked[0];
                            const duplicates = unchecked.slice(1).filter((c2: any) => {
                                const nameSim = stringSimilarity(
                                    `${primary.firstName} ${primary.lastName}`,
                                    `${c2.firstName} ${c2.lastName}`
                                );
                                const companySim = stringSimilarity(primary.company, c2.company);
                                return nameSim > 80 && companySim > 80 && ((nameSim + companySim) / 2) >= threshold;
                            });

                            if (duplicates.length > 0) {
                                duplicateGroups.push({
                                    primary: {
                                        id: primary._id.toString(),
                                        name: `${primary.firstName} ${primary.lastName}`,
                                        email: primary.email,
                                        company: primary.company,
                                    },
                                    duplicates: duplicates.map((c: any) => {
                                        const nameSim = stringSimilarity(
                                            `${primary.firstName} ${primary.lastName}`,
                                            `${c.firstName} ${c.lastName}`
                                        );
                                        const companySim = stringSimilarity(primary.company, c.company);
                                        const avgSim = Math.round((nameSim + companySim) / 2);

                                        return {
                                            id: c._id.toString(),
                                            name: `${c.firstName} ${c.lastName}`,
                                            email: c.email,
                                            company: c.company,
                                            similarity: avgSim,
                                            reason: "Similar name + company",
                                        };
                                    }),
                                });

                                [primary, ...duplicates].forEach((c: any) => checked.add(c._id.toString()));
                            }
                        }
                    }
                });
            } else if (type === "companies") {
                const companies = await Company.find({ workspaceId })
                    .select("name website domain")
                    .lean();

                // OPTIMIZATION: Hash-based duplicate detection for companies
                const domainMap = new Map<string, any[]>();
                const nameMap = new Map<string, any[]>();
                const checked = new Set<string>();

                // Step 1: Group by exact domain match
                companies.forEach((company: any) => {
                    if (company.domain) {
                        const domainKey = company.domain.toLowerCase().trim();
                        if (!domainMap.has(domainKey)) {
                            domainMap.set(domainKey, []);
                        }
                        domainMap.get(domainKey)!.push(company);
                    }

                    // Group by normalized name (for similarity matching)
                    if (company.name) {
                        const nameKey = company.name.toLowerCase().trim().substring(0, 10); // First 10 chars
                        if (!nameMap.has(nameKey)) {
                            nameMap.set(nameKey, []);
                        }
                        nameMap.get(nameKey)!.push(company);
                    }
                });

                // Step 2: Process domain duplicates (100% similarity)
                domainMap.forEach((group) => {
                    if (group.length > 1) {
                        const primary = group[0];
                        const duplicates = group.slice(1);

                        duplicateGroups.push({
                            primary: {
                                id: primary._id.toString(),
                                name: primary.name,
                                website: primary.website,
                            },
                            duplicates: duplicates.map((c: any) => ({
                                id: c._id.toString(),
                                name: c.name,
                                website: c.website,
                                similarity: 100,
                                reason: "Same domain",
                            })),
                        });

                        group.forEach((c: any) => checked.add(c._id.toString()));
                    }
                });

                // Step 3: Process name similarity duplicates
                nameMap.forEach((group) => {
                    if (group.length > 1) {
                        const unchecked = group.filter((c: any) => !checked.has(c._id.toString()));
                        if (unchecked.length > 1) {
                            const primary = unchecked[0];
                            const duplicates = unchecked.slice(1).filter((c2: any) => {
                                const nameSim = stringSimilarity(primary.name, c2.name);
                                return nameSim > 85 && nameSim >= threshold;
                            });

                            if (duplicates.length > 0) {
                                duplicateGroups.push({
                                    primary: {
                                        id: primary._id.toString(),
                                        name: primary.name,
                                        website: primary.website,
                                    },
                                    duplicates: duplicates.map((c: any) => ({
                                        id: c._id.toString(),
                                        name: c.name,
                                        website: c.website,
                                        similarity: stringSimilarity(primary.name, c.name),
                                        reason: "Similar name",
                                    })),
                                });

                                [primary, ...duplicates].forEach((c: any) => checked.add(c._id.toString()));
                            }
                        }
                    }
                });
            }

            return {
                success: true,
                type,
                duplicateGroupsFound: duplicateGroups.length,
                totalDuplicates: duplicateGroups.reduce((sum, g) => sum + g.duplicates.length, 0),
                groups: duplicateGroups,
            };
        }

        case "merge_records": {
            const { primaryId, duplicateIds, type = "contacts" } = args;

            if (!primaryId || !duplicateIds || duplicateIds.length === 0) {
                return { success: false, error: "Primary ID and duplicate IDs are required" };
            }

            if (type === "contacts") {
                const primary = await Contact.findById(primaryId);
                if (!primary) {
                    return { success: false, error: "Primary contact not found" };
                }

                // Merge data from duplicates into primary
                for (const dupId of duplicateIds) {
                    const duplicate = await Contact.findById(dupId);
                    if (!duplicate) continue;

                    // Fill in missing fields from duplicate
                    const dup = duplicate.toObject();
                    if (!primary.email && dup.email) primary.email = dup.email;
                    if (!primary.phone && dup.phone) primary.phone = dup.phone;
                    if (!primary.jobTitle && dup.jobTitle) primary.jobTitle = dup.jobTitle;
                    if (!primary.linkedin && dup.linkedin) primary.linkedin = dup.linkedin;
                    if (!primary.company && dup.company) primary.company = dup.company;

                    // Merge notes
                    if (dup.notes) {
                        primary.notes = `${primary.notes || ""}\n\n--- Merged from duplicate ---\n${dup.notes}`.trim();
                    }

                    // Merge tags
                    if (dup.tags && dup.tags.length > 0) {
                        primary.tags = [...new Set([...(primary.tags || []), ...dup.tags])];
                    }

                    // Delete duplicate
                    await Contact.findByIdAndDelete(dupId);
                }

                await primary.save();

                return {
                    success: true,
                    message: `Merged ${duplicateIds.length} duplicate(s) into ${primary.firstName} ${primary.lastName}`,
                    primaryId: primary._id.toString(),
                };
            } else if (type === "companies") {
                const primary = await Company.findById(primaryId);
                if (!primary) {
                    return { success: false, error: "Primary company not found" };
                }

                for (const dupId of duplicateIds) {
                    const duplicate = await Company.findById(dupId);
                    if (!duplicate) continue;

                    const dup = duplicate.toObject() as any;
                    if (!primary.website && dup.website) primary.website = dup.website;
                    if (!primary.industry && dup.industry) primary.industry = dup.industry;
                    // Note: description field removed - not in ICompany interface
                    await Contact.updateMany(
                        { companyId: dupId },
                        { companyId: primary._id }
                    );

                    await Company.findByIdAndDelete(dupId);
                }

                await primary.save();

                return {
                    success: true,
                    message: `Merged ${duplicateIds.length} duplicate(s) into ${primary.name}`,
                    primaryId: primary._id.toString(),
                };
            }

            return { success: false, error: "Invalid type" };
        }

        case "parse_meeting_notes": {
            const { notes } = args;

            if (!notes) {
                return { success: false, error: "Meeting notes are required" };
            }

            const parsePrompt = `Extract structured information from these meeting notes:

${notes}

Extract and return as JSON:
{
  "contacts": [
    {
      "name": "",
      "email": "",
      "phone": "",
      "role": "",
      "company": ""
    }
  ],
  "actionItems": [
    {
      "task": "",
      "owner": "us/them/specific name",
      "due": "date hint if mentioned",
      "priority": "high/medium/low"
    }
  ],
  "keyPoints": ["important discussion points"],
  "nextSteps": ["agreed next steps"],
  "decisions": ["decisions made"],
  "concerns": ["objections or concerns raised"]
}

Only include fields with actual content from the notes.`;

            const parseResult = await getProModel().invoke([new HumanMessage(parsePrompt)]);

            let parsed = {};
            try {
                const match = (parseResult.content as string).match(/\{[\s\S]*\}/);
                if (match) {
                    parsed = JSON.parse(match[0]);
                }
            } catch (e) {
                return { success: false, error: "Could not parse meeting notes" };
            }

            return {
                success: true,
                parsed,
            };
        }

        case "validate_email": {
            const { email } = args;

            if (!email) {
                return { success: false, error: "Email is required" };
            }

            // Basic format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isFormatValid = emailRegex.test(email);

            // Check for common typos
            const commonDomainTypos: Record<string, string> = {
                "gmial.com": "gmail.com",
                "gmal.com": "gmail.com",
                "gamil.com": "gmail.com",
                "gnail.com": "gmail.com",
                "outlok.com": "outlook.com",
                "outloo.com": "outlook.com",
                "hotmal.com": "hotmail.com",
                "yahooo.com": "yahoo.com",
                "yaho.com": "yahoo.com",
            };

            const domain = email.split("@")[1]?.toLowerCase();
            const suggestedDomain = commonDomainTypos[domain];

            return {
                success: true,
                email,
                isValid: isFormatValid,
                suggestions: suggestedDomain ? {
                    possibleTypo: true,
                    suggestion: email.replace(domain, suggestedDomain),
                } : null,
            };
        }

        case "get_data_quality_score": {
            // Calculate data quality metrics
            const contacts = await Contact.find({ workspaceId }).lean();

            let totalScore = 0;
            const issues: string[] = [];

            // Check completeness
            const withEmail = contacts.filter((c: any) => c.email).length;
            const withPhone = contacts.filter((c: any) => c.phone).length;
            const withCompany = contacts.filter((c: any) => c.company).length;
            const withJobTitle = contacts.filter((c: any) => c.jobTitle).length;

            const emailPercent = contacts.length > 0 ? (withEmail / contacts.length) * 100 : 0;
            const phonePercent = contacts.length > 0 ? (withPhone / contacts.length) * 100 : 0;
            const companyPercent = contacts.length > 0 ? (withCompany / contacts.length) * 100 : 0;
            const titlePercent = contacts.length > 0 ? (withJobTitle / contacts.length) * 100 : 0;

            totalScore = (emailPercent * 0.4 + phonePercent * 0.2 + companyPercent * 0.25 + titlePercent * 0.15);

            if (emailPercent < 80) issues.push(`${Math.round(100 - emailPercent)}% contacts missing email`);
            if (companyPercent < 70) issues.push(`${Math.round(100 - companyPercent)}% contacts missing company`);
            if (titlePercent < 50) issues.push(`${Math.round(100 - titlePercent)}% contacts missing job title`);

            return {
                success: true,
                totalContacts: contacts.length,
                qualityScore: Math.round(totalScore),
                completeness: {
                    email: Math.round(emailPercent),
                    phone: Math.round(phonePercent),
                    company: Math.round(companyPercent),
                    jobTitle: Math.round(titlePercent),
                },
                issues,
                recommendations: issues.length > 0
                    ? ["Run Apollo enrichment to fill missing data", "Import company information", "Update contact records"]
                    : ["Data quality is good!"],
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function dataEntryAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📥 Data Entry Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are an AI Data Entry Agent. Automate CRM data capture and maintain data quality.

Available tools:

1. parse_email_signature - Extract contact info from email signature
   Args: { emailBody: string }
   Returns: Extracted contact fields

2. scan_duplicates - Find potential duplicate contacts/companies
   Args: { type?: "contacts" | "companies", threshold?: number (0-100) }
   Returns: Duplicate groups with similarity scores

3. merge_records - Merge duplicate records
   Args: { primaryId: string, duplicateIds: string[], type?: "contacts" | "companies" }
   Returns: Merged record

4. parse_meeting_notes - Extract contacts and action items from notes
   Args: { notes: string }
   Returns: Contacts, action items, key points

5. validate_email - Check if email is valid
   Args: { email: string }
   Returns: Validation result with suggestions

6. get_data_quality_score - Get overall data quality metrics
   Args: {}
   Returns: Quality score and recommendations

Respond with JSON: {"tool": "...", "args": {...}}

Examples:
- "Extract contact from this email: [signature]" → {"tool": "parse_email_signature", "args": {"emailBody": "..."}}
- "Find duplicate contacts" → {"tool": "scan_duplicates", "args": {"type": "contacts"}}
- "Parse these meeting notes: [notes]" → {"tool": "parse_meeting_notes", "args": {"notes": "..."}}
- "Check data quality" → {"tool": "get_data_quality_score", "args": {}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Data Entry AI Response:", responseText);

        const toolCall = parseToolCall(responseText, "DataEntryAgent");

        if (toolCall) {
            const result = await executeDataEntryTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = "";

            if (!result.success) {
                friendlyResponse = `❌ ${result.error}`;
            } else if (toolCall.tool === "parse_email_signature") {
                const e = result.extracted;
                friendlyResponse = `📧 **Extracted Contact Info:**

• **Name:** ${e.firstName || ""} ${e.lastName || ""}
• **Email:** ${e.email || "Not found"}
• **Phone:** ${e.phone || "Not found"}
• **Title:** ${e.jobTitle || "Not found"}
• **Company:** ${e.company || "Not found"}
• **LinkedIn:** ${e.linkedin || "Not found"}

**Confidence:** ${e.confidence || 0}%

${result.message}`;
            } else if (toolCall.tool === "scan_duplicates") {
                if (result.duplicateGroupsFound === 0) {
                    friendlyResponse = `✅ No duplicate ${result.type} found. Data looks clean!`;
                } else {
                    friendlyResponse = `⚠️ **Found ${result.totalDuplicates} Potential Duplicates in ${result.duplicateGroupsFound} Groups:**\n\n${result.groups.map((g: any, i: number) =>
                        `**Group ${i + 1}:** Keep "${g.primary.name}"\n${g.duplicates.map((d: any) =>
                            `  • "${d.name}" (${d.similarity}% match - ${d.reason})`
                        ).join("\n")}`
                    ).join("\n\n")
                        }\n\nTo merge, use: "Merge duplicates [primaryId] with [duplicateIds]"`;
                }
            } else if (toolCall.tool === "merge_records") {
                friendlyResponse = `✅ ${result.message}`;
            } else if (toolCall.tool === "parse_meeting_notes") {
                const p = result.parsed;
                friendlyResponse = `📝 **Meeting Notes Parsed:**

**Contacts Found:** ${p.contacts?.length || 0}
${p.contacts?.map((c: any) => `• ${c.name} (${c.role || "Unknown role"}) - ${c.company || ""}`).join("\n") || "None"}

**Action Items:** ${p.actionItems?.length || 0}
${p.actionItems?.map((a: any) => `• [${a.priority?.toUpperCase()}] ${a.task} (Owner: ${a.owner})`).join("\n") || "None"}

**Key Points:**
${p.keyPoints?.map((k: string) => `• ${k}`).join("\n") || "None"}

**Next Steps:**
${p.nextSteps?.map((s: string) => `• ${s}`).join("\n") || "None"}`;
            } else if (toolCall.tool === "validate_email") {
                if (result.isValid) {
                    friendlyResponse = result.suggestions
                        ? `⚠️ Email format valid but possible typo detected.\nDid you mean: **${result.suggestions.suggestion}**?`
                        : `✅ Email "${result.email}" appears valid.`;
                } else {
                    friendlyResponse = `❌ Email "${result.email}" has an invalid format.`;
                }
            } else if (toolCall.tool === "get_data_quality_score") {
                const scoreEmoji = result.qualityScore >= 80 ? "🟢" : result.qualityScore >= 60 ? "🟡" : "🔴";
                friendlyResponse = `${scoreEmoji} **Data Quality Score: ${result.qualityScore}/100**

**Completeness (${result.totalContacts} contacts):**
• Email: ${result.completeness.email}%
• Phone: ${result.completeness.phone}%
• Company: ${result.completeness.company}%
• Job Title: ${result.completeness.jobTitle}%

${result.issues.length > 0 ? `**Issues:**\n${result.issues.map((i: string) => `⚠️ ${i}`).join("\n")}` : "**No major issues!**"}

**Recommendations:**
${result.recommendations.map((r: string) => `• ${r}`).join("\n")}`;
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
            messages: [new AIMessage("I can help with data entry and quality! Try:\n• 'Extract contact from: [paste email signature]'\n• 'Find duplicate contacts'\n• 'Check data quality'\n• 'Parse these meeting notes: [notes]'")],
            finalResponse: "I can help with data management!",
        };

    } catch (error: any) {
        console.error("❌ Data Entry Agent error:", error);
        return { error: error.message, finalResponse: "Error processing request. Try again." };
    }
}
