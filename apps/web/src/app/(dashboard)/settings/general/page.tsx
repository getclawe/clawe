"use client";

import {
  PageHeader,
  PageHeaderRow,
  PageHeaderTitle,
} from "@dashboard/page-header";
import { Separator } from "@clawe/ui/components/separator";
import { GeneralSettingsForm } from "./_components/general-settings-form";
import { TimezoneSettings } from "./_components/timezone-settings";

const GeneralSettingsPage = () => {
  return (
    <>
      <PageHeader>
        <PageHeaderRow>
          <PageHeaderTitle>General</PageHeaderTitle>
        </PageHeaderRow>
      </PageHeader>

      <div className="max-w-2xl space-y-8">
        <GeneralSettingsForm />

        <Separator />

        <TimezoneSettings />
      </div>
    </>
  );
};

export default GeneralSettingsPage;
