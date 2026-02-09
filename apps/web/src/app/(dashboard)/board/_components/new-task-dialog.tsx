"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@clawe/backend";
import { Plus } from "lucide-react";
import { Button } from "@clawe/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@clawe/ui/components/dialog";
import { Input } from "@clawe/ui/components/input";
import { Label } from "@clawe/ui/components/label";
import { Textarea } from "@clawe/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@clawe/ui/components/select";
import { Spinner } from "@clawe/ui/components/spinner";

type Priority = "low" | "normal" | "high" | "urgent";

export const NewTaskDialog = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTask = useMutation(api.tasks.createFromDashboard);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      setOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("normal");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="brand" size="sm">
          <Plus className="h-4 w-4" />
          New
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>
              Add a new task to the inbox. It will be created by Clawe.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as Priority)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2" />
                  Creating...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
