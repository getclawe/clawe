"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@clawe/backend";
import { Button } from "@clawe/ui/components/button";
import { Input } from "@clawe/ui/components/input";
import { Label } from "@clawe/ui/components/label";
import { Textarea } from "@clawe/ui/components/textarea";
import { Spinner } from "@clawe/ui/components/spinner";
import { Globe, Building2, Users, Palette } from "lucide-react";

export const BusinessSettingsForm = () => {
  const businessContext = useQuery(api.businessContext.get, {});
  const saveBusinessContext = useMutation(api.businessContext.save);

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing business context
  useEffect(() => {
    if (businessContext) {
      setUrl(businessContext.url ?? "");
      setName(businessContext.name ?? "");
      setDescription(businessContext.description ?? "");
      setIndustry(businessContext.metadata?.industry ?? "");
      setTargetAudience(businessContext.metadata?.targetAudience ?? "");
      setTone(businessContext.metadata?.tone ?? "");
      setIsDirty(false);
    }
  }, [businessContext]);

  const handleChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setIsDirty(true);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty || !url) return;

    setIsSaving(true);
    try {
      await saveBusinessContext({
        url,
        name: name || undefined,
        description: description || undefined,
        metadata: {
          industry: industry || undefined,
          targetAudience: targetAudience || undefined,
          tone: tone || undefined,
        },
      });
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (businessContext === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Website URL - Primary field */}
      <div className="space-y-2">
        <Label htmlFor="url" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Website URL
        </Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={handleChange(setUrl)}
          placeholder="https://yourwebsite.com"
        />
        <p className="text-muted-foreground text-sm">
          Your business website. This helps agents understand your brand and
          context.
        </p>
      </div>

      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Business Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={handleChange(setName)}
          placeholder="Acme Inc"
        />
        <p className="text-muted-foreground text-sm">
          The name of your business or brand.
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={handleChange(setDescription)}
          placeholder="Describe what your business does..."
          rows={3}
        />
        <p className="text-muted-foreground text-sm">
          A brief description of what your business does and its main offerings.
        </p>
      </div>

      {/* Metadata Section */}
      <div className="border-t pt-6">
        <h3 className="mb-4 text-sm font-medium">Additional Context</h3>

        <div className="space-y-6">
          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={industry}
              onChange={handleChange(setIndustry)}
              placeholder="e.g., E-commerce, SaaS, Healthcare"
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Target Audience
            </Label>
            <Input
              id="targetAudience"
              value={targetAudience}
              onChange={handleChange(setTargetAudience)}
              placeholder="e.g., Small business owners, Developers, Parents"
            />
            <p className="text-muted-foreground text-sm">
              Who are your primary customers or users?
            </p>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label htmlFor="tone" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Brand Tone
            </Label>
            <Input
              id="tone"
              value={tone}
              onChange={handleChange(setTone)}
              placeholder="e.g., Professional, Friendly, Playful, Technical"
            />
            <p className="text-muted-foreground text-sm">
              The tone and style that best represents your brand voice.
            </p>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        variant="brand"
        disabled={!isDirty || !url || isSaving}
      >
        {isSaving ? (
          <>
            <Spinner />
            Saving...
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </form>
  );
};
