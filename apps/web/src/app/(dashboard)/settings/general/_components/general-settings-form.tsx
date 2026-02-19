"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@clawe/backend";
import { Button } from "@clawe/ui/components/button";
import { Input } from "@clawe/ui/components/input";
import { Label } from "@clawe/ui/components/label";
import { Spinner } from "@clawe/ui/components/spinner";
import { toast } from "sonner";
import { useSquad } from "@/providers/squad-provider";

export const GeneralSettingsForm = () => {
  const { selectedSquad } = useSquad();
  const updateGeneral = useMutation(api.tenants.updateGeneral);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedSquad) {
      setName(selectedSquad.name);
      setDescription(selectedSquad.description ?? "");
      setIsDirty(false);
    }
  }, [selectedSquad]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setIsDirty(true);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSquad || !isDirty || !name.trim()) return;

    setIsSaving(true);
    try {
      await updateGeneral({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setIsDirty(false);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedSquad) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Squad name</Label>
        <Input
          id="name"
          value={name}
          onChange={handleNameChange}
          placeholder="My Squad"
        />
        <p className="text-muted-foreground text-sm">
          The name of your squad as it appears in the dashboard.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="A brief description of your squad"
        />
        <p className="text-muted-foreground text-sm">
          A short description that helps identify what this squad is for.
        </p>
      </div>

      <Button
        type="submit"
        variant="brand"
        disabled={!isDirty || !name.trim() || isSaving}
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
