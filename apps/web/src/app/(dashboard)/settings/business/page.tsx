"use client";

import {
  PageHeader,
  PageHeaderRow,
  PageHeaderTitle,
} from "@dashboard/page-header";
import { BusinessSettingsForm } from "./_components/business-settings-form";

const BusinessSettingsPage = () => {
  return (
    <>
      <PageHeader>
        <PageHeaderRow>
          <PageHeaderTitle>Business</PageHeaderTitle>
        </PageHeaderRow>
      </PageHeader>

      <div className="max-w-2xl">
        <BusinessSettingsForm />
      </div>
    </>
  );
};

export default BusinessSettingsPage;
