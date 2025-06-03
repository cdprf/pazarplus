import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";
import { Badge } from "../ui/Badge";
import { Switch } from "../ui/Switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import {
  Plus,
  Edit,
  Copy,
  Trash2,
  Eye,
  Settings,
  FileText,
  Download,
  Upload,
  Star,
  StarOff,
  Printer,
  Grid,
  Search,
} from "lucide-react";
import { useToast } from "../ui/use-toast";
import api from "../../services/api";
import TemplateManager from "../../services/TemplateManager";
import ShippingSlipDesigner from "../shipping/ShippingSlipDesigner";

const ShippingTemplateSettings = () => {
  const [templates, setTemplates] = useState([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDesigner, setShowDesigner] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const { toast } = useToast();

  // Load templates and default settings
  useEffect(() => {
    loadTemplates();
    loadDefaultTemplate();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/shipping/templates");
      if (response.data.success) {
        setTemplates(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      toast({
        title: "Error",
        description: "Failed to load shipping templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultTemplate = async () => {
    try {
      const response = await api.get("/api/shipping/templates/default");
      if (response.data.success) {
        setDefaultTemplateId(response.data.data.defaultTemplateId);
      }
    } catch (error) {
      console.error("Failed to load default template:", error);
    }
  };

  const handleSetDefault = async (templateId) => {
    try {
      const response = await api.post("/api/shipping/templates/default", {
        templateId,
      });
      if (response.data.success) {
        setDefaultTemplateId(templateId);
        toast({
          title: "Success",
          description: "Default template updated successfully",
        });
      }
    } catch (error) {
      console.error("Failed to set default template:", error);
      toast({
        title: "Error",
        description: "Failed to set default template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      const response = await api.delete(
        `/api/shipping/templates/${templateId}`
      );
      if (response.data.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        if (defaultTemplateId === templateId) {
          setDefaultTemplateId(null);
        }
        toast({
          title: "Success",
          description: "Template deleted successfully",
        });
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const duplicated = {
        ...template,
        id: undefined, // Let the server generate new ID
        name: `${template.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await api.post("/api/shipping/templates", duplicated);
      if (response.data.success) {
        setTemplates((prev) => [...prev, response.data.data]);
        toast({
          title: "Success",
          description: "Template duplicated successfully",
        });
      }
    } catch (error) {
      console.error("Failed to duplicate template:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  const handleExportTemplate = async (template) => {
    try {
      await TemplateManager.export(template);
      toast({
        title: "Success",
        description: "Template exported successfully",
      });
    } catch (error) {
      console.error("Failed to export template:", error);
      toast({
        title: "Error",
        description: "Failed to export template",
        variant: "destructive",
      });
    }
  };

  const handleImportTemplate = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const template = await TemplateManager.import(file);
      const response = await api.post("/api/shipping/templates", template);
      if (response.data.success) {
        setTemplates((prev) => [...prev, response.data.data]);
        toast({
          title: "Success",
          description: "Template imported successfully",
        });
      }
    } catch (error) {
      console.error("Failed to import template:", error);
      toast({
        title: "Error",
        description: "Failed to import template",
        variant: "destructive",
      });
    }

    // Reset file input
    event.target.value = "";
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (showDesigner) {
    return (
      <div className="h-screen">
        <ShippingSlipDesigner
          initialTemplate={selectedTemplate}
          onSave={async (template) => {
            await loadTemplates();
            setShowDesigner(false);
            setSelectedTemplate(null);
            toast({
              title: "Success",
              description: "Template saved successfully",
            });
          }}
          onCancel={() => {
            setShowDesigner(false);
            setSelectedTemplate(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shipping Template Settings</h1>
          <p className="text-gray-600">
            Manage your shipping slip templates and configure default settings
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => {
              setSelectedTemplate(null);
              setShowDesigner(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
          <Button variant="outline" className="relative">
            <Upload className="w-4 h-4 mr-2" />
            Import Template
            <input
              type="file"
              accept=".json"
              onChange={handleImportTemplate}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Default Settings
          </TabsTrigger>
        </TabsList>

        {/* Templates Management */}
        <TabsContent value="templates" className="space-y-6">
          {/* Search and View Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "outline"}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Templates Grid/List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No templates found" : "No templates yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm
                  ? "Try different search terms"
                  : "Create your first shipping template to get started"}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowDesigner(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Template
                </Button>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`relative ${
                    defaultTemplateId === template.id
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {template.name}
                          {defaultTemplateId === template.id && (
                            <Badge variant="default" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {template.description || "No description"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{template.elements?.length || 0} elements</span>
                      <span>{template.config?.paperSize || "A4"}</span>
                      <span>
                        {formatDate(template.updatedAt || template.createdAt)}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowDesigner(true);
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicateTemplate(template)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Duplicate
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportTemplate(template)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>

                      <Button
                        size="sm"
                        variant={
                          defaultTemplateId === template.id
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          handleSetDefault(
                            defaultTemplateId === template.id
                              ? null
                              : template.id
                          )
                        }
                      >
                        {defaultTemplateId === template.id ? (
                          <>
                            <StarOff className="w-3 h-3 mr-1" />
                            Unset Default
                          </>
                        ) : (
                          <>
                            <Star className="w-3 h-3 mr-1" />
                            Set Default
                          </>
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Template</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{template.name}"?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Default Settings */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="w-5 h-5" />
                  Default Template
                </CardTitle>
                <CardDescription>
                  Choose which template to use by default for new shipping slips
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="default-template">
                    Default Shipping Template
                  </Label>
                  <Select
                    value={defaultTemplateId || ""}
                    onValueChange={(value) => handleSetDefault(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select default template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No default template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    This template will be automatically used when generating
                    shipping slips
                  </p>
                </div>

                {defaultTemplateId && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <Star className="w-4 h-4 inline mr-1" />
                      Default template is active. All new shipping slips will
                      use this template unless overridden.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Statistics</CardTitle>
                <CardDescription>
                  Overview of your shipping templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {templates.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Templates</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {templates.reduce(
                        (acc, t) => acc + (t.elements?.length || 0),
                        0
                      )}
                    </div>
                    <div className="text-sm text-gray-600">Total Elements</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Most Used Paper Sizes:</h4>
                  {Object.entries(
                    templates.reduce((acc, t) => {
                      const size = t.config?.paperSize || "A4";
                      acc[size] = (acc[size] || 0) + 1;
                      return acc;
                    }, {})
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([size, count]) => (
                      <div key={size} className="flex justify-between text-sm">
                        <span>{size}</span>
                        <span className="text-gray-500">{count} templates</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShippingTemplateSettings;
