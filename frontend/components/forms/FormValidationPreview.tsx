"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Smartphone,
    Monitor,
    CheckCircle2,
    AlertCircle,
    Eye,
} from "lucide-react";

interface FormValidationPreviewProps {
    form: any;
}

export default function FormValidationPreview({ form }: FormValidationPreviewProps) {
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [fieldStates, setFieldStates] = useState<Record<string, { value: string; error: string | null; touched: boolean }>>({});

    const fields = form?.fields || [];
    const visibleFields = fields.filter((f: any) => f.type !== "hidden");

    // Simulate field interaction
    const handleFieldChange = (fieldId: string, value: string) => {
        setFieldStates((prev) => ({
            ...prev,
            [fieldId]: { ...prev[fieldId], value, touched: true, error: null },
        }));
    };

    // Simulate field blur and validation
    const handleFieldBlur = (field: any) => {
        const state = fieldStates[field.id] || { value: "", touched: false };
        let error: string | null = null;

        if (field.required && !state.value) {
            error = `${field.label} is required`;
        } else if (field.type === "email" && state.value && !state.value.includes("@")) {
            error = "Please enter a valid email address";
        } else if (field.validation?.minLength && state.value.length < field.validation.minLength) {
            error = `Minimum ${field.validation.minLength} characters required`;
        }

        setFieldStates((prev) => ({
            ...prev,
            [field.id]: { ...prev[field.id], error, touched: true },
        }));
    };

    const getFieldTypeIcon = (type: string) => {
        switch (type) {
            case "email":
                return "📧";
            case "phone":
                return "📱";
            case "text":
                return "📝";
            case "textarea":
                return "📄";
            case "select":
                return "📋";
            case "checkbox":
                return "☑️";
            default:
                return "⬜";
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Eye className="h-5 w-5 text-purple-600" />
                            Form Validation Preview
                        </CardTitle>
                        <CardDescription>See what users experience when filling out your form</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={viewMode === "desktop" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("desktop")}
                        >
                            <Monitor className="h-4 w-4 mr-1" />
                            Desktop
                        </Button>
                        <Button
                            variant={viewMode === "mobile" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewMode("mobile")}
                        >
                            <Smartphone className="h-4 w-4 mr-1" />
                            Mobile
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="preview">
                    <TabsList className="mb-4">
                        <TabsTrigger value="preview">Interactive Preview</TabsTrigger>
                        <TabsTrigger value="states">Validation States</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview">
                        <div
                            className={`border rounded-lg p-6 bg-gray-50 mx-auto transition-all ${viewMode === "mobile" ? "max-w-[375px]" : "max-w-full"
                                }`}
                        >
                            {/* Form Title */}
                            <h3 className="text-xl font-semibold mb-1">{form?.name || "Your Form"}</h3>
                            {form?.description && (
                                <p className="text-sm text-muted-foreground mb-6">{form.description}</p>
                            )}

                            {/* Form Fields */}
                            <div className={`space-y-4 ${viewMode === "mobile" ? "" : "grid grid-cols-1 gap-4"}`}>
                                {visibleFields.map((field: any) => {
                                    const state = fieldStates[field.id] || { value: "", error: null, touched: false };

                                    return (
                                        <div key={field.id} className="space-y-2">
                                            <Label className="flex items-center gap-1">
                                                <span>{getFieldTypeIcon(field.type)}</span>
                                                <span>{field.label}</span>
                                                {field.required && <span className="text-red-500">*</span>}
                                            </Label>

                                            {field.type === "textarea" ? (
                                                <textarea
                                                    className={`w-full px-3 py-2 border rounded-md text-sm ${state.error ? "border-red-500 bg-red-50" : state.touched && !state.error ? "border-green-500 bg-green-50" : ""
                                                        }`}
                                                    placeholder={field.placeholder}
                                                    value={state.value}
                                                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                    onBlur={() => handleFieldBlur(field)}
                                                    rows={3}
                                                />
                                            ) : field.type === "select" ? (
                                                <select
                                                    className={`w-full px-3 py-2 border rounded-md text-sm ${state.error ? "border-red-500 bg-red-50" : state.touched && !state.error ? "border-green-500 bg-green-50" : ""
                                                        }`}
                                                    value={state.value}
                                                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                    onBlur={() => handleFieldBlur(field)}
                                                >
                                                    <option value="">{field.placeholder || "Select..."}</option>
                                                    {field.options?.map((opt: any) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            ) : field.type === "checkbox" || field.type === "gdpr_consent" ? (
                                                <div className="flex items-start gap-2">
                                                    <input
                                                        type="checkbox"
                                                        className="mt-1"
                                                        checked={state.value === "true"}
                                                        onChange={(e) => handleFieldChange(field.id, e.target.checked ? "true" : "")}
                                                        onBlur={() => handleFieldBlur(field)}
                                                    />
                                                    <span className="text-sm text-muted-foreground">{field.helpText || field.label}</span>
                                                </div>
                                            ) : (
                                                <Input
                                                    type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                                                    className={`${state.error ? "border-red-500 bg-red-50" : state.touched && !state.error ? "border-green-500 bg-green-50" : ""
                                                        }`}
                                                    placeholder={field.placeholder}
                                                    value={state.value}
                                                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                                    onBlur={() => handleFieldBlur(field)}
                                                />
                                            )}

                                            {/* Help Text */}
                                            {field.helpText && !state.error && field.type !== "checkbox" && field.type !== "gdpr_consent" && (
                                                <p className="text-xs text-muted-foreground">{field.helpText}</p>
                                            )}

                                            {/* Error Message */}
                                            {state.error && (
                                                <p className="text-xs text-red-600 flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    {state.error}
                                                </p>
                                            )}

                                            {/* Success indicator */}
                                            {state.touched && !state.error && state.value && (
                                                <p className="text-xs text-green-600 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Valid
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Submit Button */}
                            <Button className="w-full mt-6">
                                {form?.submitButtonText || "Submit"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="states">
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Interact with the preview to see validation states. Here's what users will experience:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Default State */}
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-medium mb-2">Default State</h4>
                                    <Input placeholder="Enter value..." className="mb-2" disabled />
                                    <p className="text-xs text-muted-foreground">
                                        Clean, neutral styling before interaction
                                    </p>
                                </div>

                                {/* Valid State */}
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-medium mb-2 text-green-600">Valid State</h4>
                                    <Input
                                        value="valid@email.com"
                                        className="border-green-500 bg-green-50 mb-2"
                                        disabled
                                    />
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Valid
                                    </p>
                                </div>

                                {/* Error State */}
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-medium mb-2 text-red-600">Error State</h4>
                                    <Input
                                        value="invalid-email"
                                        className="border-red-500 bg-red-50 mb-2"
                                        disabled
                                    />
                                    <p className="text-xs text-red-600 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Please enter a valid email address
                                    </p>
                                </div>
                            </div>

                            {/* Field Summary */}
                            <div className="mt-6">
                                <h4 className="font-medium mb-3">Field Summary</h4>
                                <div className="space-y-2">
                                    {visibleFields.map((field: any) => (
                                        <div key={field.id} className="flex items-center justify-between border-b py-2">
                                            <div className="flex items-center gap-2">
                                                <span>{getFieldTypeIcon(field.type)}</span>
                                                <span className="text-sm">{field.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {field.required && (
                                                    <Badge variant="outline" className="text-xs">Required</Badge>
                                                )}
                                                <Badge variant="secondary" className="text-xs">{field.type}</Badge>
                                                {field.helpText && (
                                                    <Badge className="bg-green-100 text-green-800 text-xs">Has Help</Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
