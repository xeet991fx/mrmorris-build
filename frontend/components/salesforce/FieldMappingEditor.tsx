"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw } from "lucide-react";

interface FieldMap {
  crmField: string;
  salesforceField: string;
  type: "standard" | "custom";
  dataType?: string;
  isRequired?: boolean;
}

interface FieldMapping {
  objectType: string;
  mappings: FieldMap[];
  useDefaultMappings: boolean;
}

interface FieldMappingEditorProps {
  workspaceId: string;
}

export default function FieldMappingEditor({ workspaceId }: FieldMappingEditorProps) {
  const [objectType, setObjectType] = useState<"contact" | "account" | "opportunity">("contact");
  const [fieldMapping, setFieldMapping] = useState<FieldMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFieldMappings();
  }, [objectType, workspaceId]);

  const fetchFieldMappings = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/salesforce/field-mappings/${objectType}`,
        { credentials: "include" }
      );
      const result = await response.json();
      if (result.success) {
        setFieldMapping(result.data);
      }
    } catch (error) {
      console.error("Error fetching field mappings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fieldMapping) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/salesforce/field-mappings/${objectType}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mappings: fieldMapping.mappings,
            useDefaultMappings: fieldMapping.useDefaultMappings,
          }),
        }
      );
      const result = await response.json();
      if (result.success) {
        // Success feedback could be added here
      }
    } catch (error) {
      console.error("Error saving field mappings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (fieldMapping) {
      setFieldMapping({
        ...fieldMapping,
        useDefaultMappings: true,
      });
    }
  };

  const handleToggleUseDefaults = (checked: boolean) => {
    if (fieldMapping) {
      setFieldMapping({
        ...fieldMapping,
        useDefaultMappings: checked,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!fieldMapping) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-600">No field mappings found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Field Mappings</CardTitle>
              <CardDescription>Map CRM fields to Salesforce fields</CardDescription>
            </div>
            <Select value={objectType} onValueChange={(v: any) => setObjectType(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contact">Contacts</SelectItem>
                <SelectItem value="account">Accounts</SelectItem>
                <SelectItem value="opportunity">Opportunities</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <Label>Use Default Mappings</Label>
              <p className="text-sm text-gray-600">Use the standard field mappings recommended by the system</p>
            </div>
            <Switch checked={fieldMapping.useDefaultMappings} onCheckedChange={handleToggleUseDefaults} />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-600 pb-2 border-b">
              <div>CRM Field</div>
              <div>Salesforce Field</div>
              <div>Type</div>
            </div>

            {fieldMapping.mappings.map((mapping, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 items-center py-2">
                <div className="font-medium">{mapping.crmField}</div>
                <div className="text-sm">{mapping.salesforceField}</div>
                <div>
                  <Badge variant={mapping.type === "standard" ? "default" : "secondary"}>
                    {mapping.type}
                    {mapping.isRequired && " *"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Mappings
            </Button>
            <Button variant="outline" onClick={handleResetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Field Mapping Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• <strong>Standard fields</strong> are mapped automatically based on common conventions</p>
          <p>• <strong>Required fields</strong> are marked with an asterisk (*)</p>
          <p>• Custom field mappings can be configured for advanced use cases</p>
          <p>• Changes take effect on the next sync operation</p>
        </CardContent>
      </Card>
    </div>
  );
}
